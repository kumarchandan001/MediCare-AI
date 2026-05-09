"""
health_intelligence/api/realtime_routes.py
───────────────────────────────────────────────
REST + WebSocket API for real-time adaptive health
intelligence.

Endpoints:
  POST  /realtime/ingest          — Ingest wearable signals
  GET   /realtime/live-health     — Current live health state
  GET   /realtime/alerts          — Active real-time alerts
  POST  /realtime/alerts/ack      — Acknowledge an alert
  GET   /realtime/thresholds      — Current adaptive thresholds
  GET   /realtime/stream-health   — Wearable stream health
  POST  /realtime/session/start   — Start a live session
  POST  /realtime/session/end     — End active session
  GET   /realtime/session/active  — Get active session
  GET   /realtime/session/history — Session history
  GET   /realtime/forecast        — Health metric forecasts
  GET   /realtime/risk-projection — Forward risk projection
  GET   /realtime/recovery        — Recovery forecast
  GET   /realtime/drift           — Physiological drift analysis
  GET   /realtime/acute-events    — Acute event detection
  GET   /realtime/resilience      — Resilience report
  GET   /realtime/system-stats    — System statistics
  WS    /realtime/ws/stream       — WebSocket live stream
"""

import logging
from datetime import datetime
from typing import Any, Optional

from fastapi import (
    APIRouter, Depends, HTTPException, WebSocket,
    WebSocketDisconnect, Query,
)
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from features.auth.models import User

from health_intelligence.realtime.realtime_engine import RealtimeEngine
from health_intelligence.analytics.acute_event_detector import AcuteEventDetector
from health_intelligence.analytics.physiological_drift import PhysiologicalDriftDetector
from health_intelligence.analytics.resilience_monitor import ResilienceMonitor
from health_intelligence.prediction.forecasting_engine import ForecastingEngine
from health_intelligence.prediction.risk_projection import RiskProjectionEngine
from health_intelligence.prediction.recovery_forecasting import RecoveryForecaster

log = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Real-Time Health Intelligence"])

# ── Singletons ───────────────────────────────────────────────
_engine = RealtimeEngine()
_acute = AcuteEventDetector()
_drift = PhysiologicalDriftDetector()
_resilience = ResilienceMonitor()
_forecasting = ForecastingEngine()
_risk = RiskProjectionEngine()
_recovery = RecoveryForecaster()


# ── Pydantic Models ──────────────────────────────────────────

class IngestRequest(BaseModel):
    """Wearable signal ingestion payload."""
    heart_rate_bpm: Optional[float] = None
    spo2_percent: Optional[float] = None
    stress_level: Optional[float] = None
    sleep_hours: Optional[float] = None
    steps: Optional[float] = None
    active_minutes: Optional[float] = None
    calories_burned: Optional[float] = None
    hrv_ms: Optional[float] = None
    respiratory_rate: Optional[float] = None
    temperature_celsius: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_glucose: Optional[float] = None
    timezone_offset_hours: float = Field(default=0, description="User's UTC offset")


class SessionStartRequest(BaseModel):
    session_type: str = Field(..., description="workout | sleep | recovery | stress")
    metadata: Optional[dict] = None


class SessionEndRequest(BaseModel):
    metrics: Optional[dict] = None


class AlertAckRequest(BaseModel):
    alert_id: str


# ── Signal Ingestion ─────────────────────────────────────────

@router.post("/ingest", summary="Ingest wearable signals")
async def ingest_signals(
    payload: IngestRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Ingest new wearable data — triggers the full real-time
    intelligence pipeline: fusion, context, thresholds, alerts.
    """
    signals = {
        k: v for k, v in payload.model_dump().items()
        if v is not None and k != "timezone_offset_hours"
    }

    if not signals:
        raise HTTPException(400, "No valid signals provided")

    result = await _engine.ingest(
        db, user.id, signals,
        user_timezone_offset=payload.timezone_offset_hours,
    )

    # Feed analytics engines
    accepted = {k: v for k, v in signals.items() if isinstance(v, (int, float))}
    _acute.record_batch(user.id, accepted)
    _drift.record_batch(user.id, accepted)
    _resilience.record_batch(user.id, accepted)

    await db.commit()

    return {
        "status": "success",
        "data": result,
    }


# ── Live Health State ────────────────────────────────────────

@router.get("/live-health", summary="Current live health state")
async def get_live_health(
    user: User = Depends(get_current_user),
):
    """Get the current synchronized health state snapshot."""
    return {
        "status": "success",
        "data": _engine.get_live_health(user.id),
    }


# ── Alerts ───────────────────────────────────────────────────

@router.get("/alerts", summary="Active real-time alerts")
async def get_alerts(
    severity: Optional[str] = Query(None),
    user: User = Depends(get_current_user),
):
    """Get all active real-time alerts."""
    alerts = _engine.get_realtime_alerts(user.id)
    if severity:
        alerts = [a for a in alerts if a["severity"] == severity]
    return {
        "status": "success",
        "count": len(alerts),
        "data": alerts,
    }


@router.post("/alerts/ack", summary="Acknowledge an alert")
async def acknowledge_alert(
    payload: AlertAckRequest,
    user: User = Depends(get_current_user),
):
    """Acknowledge a specific alert."""
    success = _engine.get_realtime_alerts  # access engine
    alert_engine = _engine._monitor.get_alerts_engine()
    ack = alert_engine.acknowledge_alert(user.id, payload.alert_id)
    return {"status": "success", "acknowledged": ack}


# ── Adaptive Thresholds ─────────────────────────────────────

@router.get("/thresholds", summary="Current adaptive thresholds")
async def get_thresholds(
    user: User = Depends(get_current_user),
):
    """Get current personalized adaptive thresholds."""
    return {
        "status": "success",
        "data": _engine.get_adaptive_thresholds(user.id),
    }


# ── Stream Health ────────────────────────────────────────────

@router.get("/stream-health", summary="Wearable stream health")
async def get_stream_health(
    user: User = Depends(get_current_user),
):
    """Get the health status of wearable data streams."""
    return {
        "status": "success",
        "data": _engine.get_stream_health(user.id),
    }


# ── Session Management ──────────────────────────────────────

@router.post("/session/start", summary="Start a live session")
async def start_session(
    payload: SessionStartRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Start a workout, sleep, recovery, or stress session."""
    result = await _engine.start_session(
        db, user.id, payload.session_type, payload.metadata,
    )
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return {"status": "success", "data": result}


@router.post("/session/end", summary="End active session")
async def end_session(
    payload: SessionEndRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """End the currently active session with metrics."""
    result = await _engine.end_session(db, user.id, payload.metrics)
    if "error" in result:
        raise HTTPException(400, result["error"])
    await db.commit()
    return {"status": "success", "data": result}


@router.get("/session/active", summary="Get active session")
async def get_active_session(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get the currently active session."""
    session = await _engine.session_manager.get_active_session(
        db, user.id,
    )
    return {
        "status": "success",
        "data": session,
    }


@router.get("/session/history", summary="Session history")
async def get_session_history(
    session_type: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get recent completed sessions."""
    sessions = await _engine.session_manager.get_session_history(
        db, user.id, session_type, limit,
    )
    return {
        "status": "success",
        "count": len(sessions),
        "data": sessions,
    }


# ── Forecasting ──────────────────────────────────────────────

@router.get("/forecast", summary="Health metric forecasts")
async def get_forecast(
    metric: Optional[str] = Query(None),
    lookback_days: int = Query(14, le=30),
    forecast_days: int = Query(7, le=14),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Forecast health metric trajectories with uncertainty bounds.
    """
    if metric:
        result = await _forecasting.forecast_metric(
            db, user.id, metric, lookback_days, forecast_days,
        )
    else:
        result = await _forecasting.forecast_all_metrics(
            db, user.id, lookback_days, forecast_days,
        )
    return {"status": "success", "data": result}


# ── Risk Projection ──────────────────────────────────────────

@router.get("/risk-projection", summary="Forward risk projection")
async def get_risk_projection(
    user: User = Depends(get_current_user),
):
    """
    Project forward wellness decline risks (burnout,
    immune vulnerability, sleep debt, etc.).
    """
    ctx = _engine.coordinator.get_context(user.id)
    # Use latest known signals from coordinator
    signals: dict[str, float] = {}
    if ctx.baselines:
        signals = dict(ctx.baselines)

    result = _risk.assess_risks(
        user.id, signals,
        trend_direction=ctx.trend_direction,
        recovery_state=ctx.recovery_state,
    )
    return {"status": "success", "data": result}


# ── Recovery Forecast ────────────────────────────────────────

@router.get("/recovery", summary="Recovery forecast")
async def get_recovery_forecast(
    user: User = Depends(get_current_user),
):
    """Estimate time-to-recovery and trajectory."""
    ctx = _engine.coordinator.get_context(user.id)
    signals: dict[str, float] = {}
    if ctx.baselines:
        signals = dict(ctx.baselines)

    result = _recovery.forecast_recovery(
        user.id,
        current_state=ctx.current_state,
        current_signals=signals,
    )
    return {"status": "success", "data": result}


# ── Drift Detection ─────────────────────────────────────────

@router.get("/drift", summary="Physiological drift analysis")
async def get_drift(
    window_hours: float = Query(4.0, le=24),
    user: User = Depends(get_current_user),
):
    """Detect slow physiological drift over hours."""
    drifts = _drift.detect_drift(user.id, window_hours)
    return {
        "status": "success",
        "count": len(drifts),
        "data": drifts,
    }


# ── Acute Events ─────────────────────────────────────────────

@router.get("/acute-events", summary="Acute event detection")
async def get_acute_events(
    user: User = Depends(get_current_user),
):
    """Detect sudden dangerous physiological changes."""
    ctx = _engine.coordinator.get_context(user.id)
    signals: dict[str, float] = {}
    if ctx.baselines:
        signals = dict(ctx.baselines)

    events = _acute.detect_acute_events(user.id, signals)
    return {
        "status": "success",
        "count": len(events),
        "data": events,
    }


# ── Resilience Report ────────────────────────────────────────

@router.get("/resilience", summary="Resilience report")
async def get_resilience(
    user: User = Depends(get_current_user),
):
    """Get the user's resilience monitoring report."""
    report = _resilience.get_resilience_report(user.id)
    return {"status": "success", "data": report}


# ── System Stats ─────────────────────────────────────────────

@router.get("/system-stats", summary="Real-time system statistics")
async def get_system_stats(
    user: User = Depends(get_current_user),
):
    """Get real-time engine system statistics."""
    return {"status": "success", "data": _engine.get_system_stats()}


# ── WebSocket ────────────────────────────────────────────────

@router.websocket("/ws/stream")
async def websocket_stream(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for live health intelligence streaming.

    Expects JSON messages with wearable data.
    Pushes real-time health updates back.
    """
    # Simple auth via query param for WebSocket
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing auth token")
        return

    # TODO: Validate token and extract user_id
    # For now, accept connections but require proper auth in production
    user_id = 0
    try:
        from features.auth.dependencies import decode_access_token
        payload = decode_access_token(token)
        user_id = payload.get("sub", 0)
    except Exception:
        await websocket.close(code=4001, reason="Invalid token")
        return

    connected = await _engine.ws_manager.connect(websocket, user_id)
    if not connected:
        return

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "heartbeat":
                await websocket.send_json({"type": "heartbeat_ack"})
                continue

            if data.get("type") == "ingest":
                signals = data.get("signals", {})
                if signals:
                    result = await _engine.ingest(
                        db, user_id, signals,
                        user_timezone_offset=data.get(
                            "timezone_offset", 0,
                        ),
                    )
                    await websocket.send_json({
                        "type": "ingest_ack",
                        "data": result,
                    })

    except WebSocketDisconnect:
        _engine.ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        log.exception("WebSocket error for user %d", user_id)
        _engine.ws_manager.disconnect(websocket, user_id)
