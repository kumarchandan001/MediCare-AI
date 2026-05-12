import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from core.config import settings
from core.database import engine, Base
from core.observability import setup_logging, RequestLoggingMiddleware
from core.security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    AuthRateLimitMiddleware,
)
from shared.error_handler import register_error_handlers

# Initialize production-safe structured logging
setup_logging()
logger = logging.getLogger(__name__)


# ── Startup + Shutdown ──────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("MediCare AI API starting...")
    import core.models  # Ensure all models are registered before DB init
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database connected ✓")

    # Start real-time health intelligence engine
    from health_intelligence.realtime.realtime_engine import RealtimeEngine
    _rt_engine = RealtimeEngine()
    await _rt_engine.start()
    logger.info("Real-time engine started ✓")

    logger.info("MediCare AI API ready — env=%s ✓", settings.APP_ENV)

    yield  # App runs here

    # Graceful Shutdown
    logger.info("Graceful shutdown initiated...")
    await _rt_engine.stop()
    await engine.dispose()
    logger.info("Shutdown complete ✓")


# ── Create FastAPI app ──────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Based Personal Health Assistant API",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    lifespan=lifespan,
)

# ── Middleware Stack (order matters: outermost first) ───────────
# 1. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# 2. GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)
# 3. Security headers (OWASP)
app.add_middleware(SecurityHeadersMiddleware)
# 4. Global rate limiting (60 req/min, 20 burst/5s)
app.add_middleware(RateLimitMiddleware, requests_per_minute=60, burst_limit=20)
# 5. Auth endpoint rate limiting (10 attempts/15min)
app.add_middleware(AuthRateLimitMiddleware, max_attempts=10)
# 6. Request logging with PII masking
app.add_middleware(RequestLoggingMiddleware)

# ── Global Error Handlers ───────────────
register_error_handlers(app)


# ── Health Check ────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


# ── Register feature routers ────────────
from features.auth.router import router as auth_router
from features.health.router import router as health_router
from features.prediction.router import router as prediction_router
from features.ai_assistant.router import router as chat_router
from features.health.medication_router import router as medication_router
from features.reports.router import router as reports_router
from features.emergency.router import router as emergency_router
from features.admin.router import router as admin_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(medication_router, prefix="/api/v1")
app.include_router(prediction_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(emergency_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

# Daily health tracking (time-series per-day records)
from features.health.daily_health_router import router as daily_health_router
from features.google_fit.router import router as google_fit_router
app.include_router(daily_health_router, prefix="/api/v1")
app.include_router(google_fit_router, prefix="/api/v1")

# Health Intelligence Core (preventive health risk assessment)
from health_intelligence.api.health_intelligence_routes import router as hi_router
app.include_router(hi_router, prefix="/api/v1")

# Longitudinal Health Intelligence (personalized trends, scores, prevention)
from health_intelligence.api.longitudinal_routes import router as longitudinal_router
app.include_router(longitudinal_router, prefix="/api/v1")

# Real-Time Adaptive Health Intelligence (streaming, fusion, alerts, forecasting)
from health_intelligence.api.realtime_routes import router as realtime_router
app.include_router(realtime_router, prefix="/api/v1")

# Autonomous Preventive Health Intelligence (causal reasoning, interventions, simulation, coaching)
from health_intelligence.api.autonomous_routes import router as autonomous_router
app.include_router(autonomous_router, prefix="/api/v1")

# Digital Health Twin & Autonomous Wellness Orchestration (twin, agents, orchestration, governance)
from health_intelligence.api.digital_twin_routes import router as digital_twin_router
app.include_router(digital_twin_router)

# Clinical Interview Engine (adaptive clinical investigation & reasoning)
from health_intelligence.api.clinical_interview_routes import router as clinical_interview_router
app.include_router(clinical_interview_router, prefix="/api/v1")

# Temporal Clinical Intelligence (continuous longitudinal reasoning & severity)
from health_intelligence.api.temporal_clinical_routes import router as temporal_clinical_router
app.include_router(temporal_clinical_router, prefix="/api/v1")

# Clinical Explainability (transparent reasoning, evidence, trust, storytelling)
from health_intelligence.api.explainability_routes import explainability_router
app.include_router(explainability_router, prefix="/api/v1")

# Clinical Governance (safety, emotional safety, escalation, human review, audit)
from health_intelligence.api.clinical_governance_routes import governance_router
app.include_router(governance_router, prefix="/api/v1")

# Mount static uploads directory for profile pictures
import os
from fastapi.staticfiles import StaticFiles

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


