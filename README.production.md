# MediCare AI — Production Deployment Guide

## Table of Contents

- [Environment Setup](#environment-setup)
- [Deployment](#deployment)
- [Backup & Recovery](#backup--recovery)
- [Monitoring](#monitoring)
- [Rollback Strategy](#rollback-strategy)
- [Security Checklist](#security-checklist)

---

## Environment Setup

### Prerequisites

- Docker & Docker Compose v2+
- PostgreSQL 16 (or containerized)
- Redis 7 (or containerized)
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Environment Files

1. **Backend**: Copy `.env.example` → `.env` in `medicare-backend/`
2. **Frontend**: Copy `.env.example` → `.env` in `medicare-frontend/`
3. **Production**: Create `.env.prod` in the project root with production secrets

> ⚠️ **CRITICAL**: Never commit `.env` or `.env.prod` to version control.

### Required Secrets for Production

| Variable | Description | How to Generate |
|---|---|---|
| `SECRET_KEY` | App encryption key | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `JWT_SECRET_KEY` | JWT signing key | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | PostgreSQL connection string | From your hosting provider |
| `REDIS_URL` | Redis connection string | From your hosting provider |
| `GOOGLE_FIT_ENCRYPTION_KEY` | Fernet key for Google Fit tokens | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

### Pre-Flight Validation

Before deploying, run the environment validation script:

```bash
cd medicare-backend
python scripts/validate_env.py
```

This checks: database connectivity, Redis connectivity, required secrets, and WebSocket configuration.

---

## Deployment

### Production (Docker Compose)

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Scale backend workers (if needed)
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Container Health Checks

All containers include built-in health checks:

| Service | Health Endpoint | Interval |
|---|---|---|
| Backend | `GET /health` | 30s |
| Frontend | `GET /` (Nginx) | 30s |
| PostgreSQL | `pg_isready` | 10s |
| Redis | `redis-cli ping` | 10s |

### Graceful Shutdown

The backend has a 30-second grace period (`stop_grace_period`) to allow:
- Active WebSocket connections to drain
- In-flight API requests to complete
- Background tasks to finalize

---

## Backup & Recovery

### Automated Database Backups

```bash
# Manual backup
cd medicare-backend
./scripts/backup.sh

# Schedule nightly backups (Linux/cron)
# crontab -e
0 2 * * * /path/to/medicare-backend/scripts/backup.sh
```

Backups are stored in `./backups/` with 30-day retention by default.

### Redis Persistence

Redis is configured with AOF (Append-Only File) persistence:
- `appendonly yes` — every write is logged
- `appendfsync everysec` — fsync every second (good balance of safety/performance)
- Data persists in the `redis_data` Docker volume

### Restore from Backup

```bash
# Stop the backend
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
gunzip < backups/medicare_YYYYMMDD_HHMMSS.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T db \
  psql -U postgres -d medicare

# Restart
docker-compose -f docker-compose.prod.yml start backend
```

---

## Monitoring

### Built-in Health Endpoint

`GET /health` returns deep diagnostic data:

```json
{
  "status": "ok",
  "service": "MediCare AI",
  "version": "2.0.0",
  "environment": "production"
}
```

### WebSocket Diagnostics

Backend exposes WebSocket stats via the `RealtimeEngine.get_system_stats()` method:
- Active connections
- Buffered messages
- Messages sent/dropped
- Stale connections pruned
- Abuse events blocked

### Frontend Crash Reporting

The `crashReporter` module automatically captures:
- Render crashes (Error Boundary)
- Dynamic import failures (chunk load errors)
- WebSocket connection failures
- Unhandled promise rejections

---

## Rollback Strategy

### Quick Rollback (Docker)

```bash
# Pull the previous image version
docker pull ghcr.io/kumarchandan001/medicare-backend:previous-tag

# Update and restart
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

If a migration causes issues:

```bash
# Rollback to the previous database backup
# See "Restore from Backup" section above
```

### Feature Flag Rollback

Disable problematic features without redeploying:

```bash
# In .env.prod
FEATURE_FLAG_ENABLE_NEW_DASHBOARD=false
FEATURE_FLAG_ENABLE_EXPERIMENTAL_SIMULATION=false

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Security Checklist

Before every production deployment, verify:

- [ ] `SECRET_KEY` and `JWT_SECRET_KEY` are unique, random, and not default values
- [ ] `DEBUG=False` in production
- [ ] `APP_ENV=production` is set
- [ ] API docs (`/docs`, `/redoc`) are disabled in production (automatic)
- [ ] CORS `ALLOWED_ORIGINS` only includes production domains
- [ ] All API keys are set and valid
- [ ] `.env` and `.env.prod` are NOT committed to git
- [ ] Database password is strong and unique
- [ ] Rate limiting is active (60 req/min global, 10 auth/15min)
- [ ] Security headers are being served (check with `curl -I`)
- [ ] HTTPS is enabled (via reverse proxy or load balancer)
- [ ] Backup script is scheduled and tested
