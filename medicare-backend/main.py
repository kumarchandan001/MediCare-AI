import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from core.config import settings
from core.database import engine, Base
from shared.error_handler import register_error_handlers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
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
    logger.info("MediCare AI API ready ✓")

    yield  # App runs here

    # Shutdown
    logger.info("Shutting down...")
    await engine.dispose()


# ── Create FastAPI app ──────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Based Personal Health Assistant API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

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

# Mount static uploads directory for profile pictures
import os
from fastapi.staticfiles import StaticFiles

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


