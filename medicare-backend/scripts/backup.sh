#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# MediCare AI — Production Database Backup Script
# ═══════════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/backup.sh                  # Manual backup
#   crontab: 0 2 * * * /path/backup.sh   # Nightly at 2 AM
#
# Requires: pg_dump, gzip
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Database connection (from environment or defaults)
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-medicare}"
DB_USER="${DB_USER:-postgres}"

# ── Create backup directory ──────────────────────────────────────
mkdir -p "$BACKUP_DIR"

echo "═══════════════════════════════════════════════════"
echo "  MediCare AI — Database Backup"
echo "  Timestamp: $TIMESTAMP"
echo "═══════════════════════════════════════════════════"

# ── PostgreSQL Backup ────────────────────────────────────────────
BACKUP_FILE="$BACKUP_DIR/medicare_${TIMESTAMP}.sql.gz"

echo "[1/3] Creating PostgreSQL backup..."
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --format=plain \
    | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  ✓ Backup created: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Cleanup old backups ─────────────────────────────────────────
echo "[2/3] Cleaning backups older than ${RETENTION_DAYS} days..."
DELETED=$(find "$BACKUP_DIR" -name "medicare_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "  ✓ Removed $DELETED old backup(s)"

# ── Verify backup integrity ─────────────────────────────────────
echo "[3/3] Verifying backup integrity..."
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo "  ✓ Backup integrity verified"
else
    echo "  ✗ Backup integrity check FAILED!"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Backup completed successfully"
echo "  File: $BACKUP_FILE"
echo "  Size: $BACKUP_SIZE"
echo "═══════════════════════════════════════════════════"
