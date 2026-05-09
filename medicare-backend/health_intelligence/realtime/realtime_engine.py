"""
health_intelligence/realtime/realtime_engine.py
───────────────────────────────────────────────
Main orchestrator for the real-time adaptive health
intelligence system.

This is the top-level entry point that ties together:
  - Stream processing
  - Sensor fusion
  - Context-aware reasoning
  - Dynamic thresholding
  - Adaptive monitoring
  - Session management
  - State coordination
  - WebSocket streaming
  - Alert dispatch

Singleton-style: one engine instance per application.
"""

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.realtime.adaptive_monitor import AdaptiveMonitor
from health_intelligence.realtime.session_manager import SessionManager
from health_intelligence.realtime.state_coordinator import StateCoordinator
from health_intelligence.streaming.realtime_event_dispatcher import (
    RealtimeEventDispatcher, HealthEvent, EventPriority,
)
from health_intelligence.streaming.websocket_manager import (
    WebSocketConnectionManager,
)

log = logging.getLogger(__name__)


class RealtimeEngine:
    """
    Top-level orchestrator for real-time adaptive
    health intelligence.

    Usage:
        engine = RealtimeEngine()
        await engine.start()
        result = await engine.ingest(db, user_id, signals)
        await engine.stop()
    """

    def __init__(self):
        self._coordinator = StateCoordinator()
        self._monitor = AdaptiveMonitor(coordinator=self._coordinator)
        self._sessions = SessionManager()
        self._dispatcher = RealtimeEventDispatcher()
        self._ws_manager = WebSocketConnectionManager()
        self._started = False

    # ── Lifecycle ────────────────────────────────────────────

    async def start(self) -> None:
        """Start all background services."""
        if self._started:
            return
        await self._dispatcher.start()
        await self._ws_manager.start_flush_loop()
        self._started = True
        log.info("RealtimeEngine started")

    async def stop(self) -> None:
        """Stop all background services."""
        await self._dispatcher.stop()
        await self._ws_manager.stop_flush_loop()
        self._started = False
        log.info("RealtimeEngine stopped")

    # ── Signal ingestion ─────────────────────────────────────

    async def ingest(
        self,
        db: AsyncSession,
        user_id: int,
        signals: dict[str, Any],
        timestamp: Optional[datetime] = None,
        user_timezone_offset: float = 0,
    ) -> dict:
        """
        Main entry point for ingesting new wearable data.

        Orchestrates:
          1. Adaptive monitoring (fusion, context, thresholds)
          2. State persistence
          3. Event dispatch
          4. WebSocket push
        """
        # 1. Run adaptive monitoring
        result = await self._monitor.process_update(
            user_id, signals, timestamp, user_timezone_offset,
        )

        # 2. Persist physiological state if meaningful
        state = result.get("physiological_state", {})
        if state.get("confidence", 0) > 0.3:
            from health_intelligence.wearable_fusion.physiological_state_engine import (
                PhysiologicalStateEngine,
            )
            pse = PhysiologicalStateEngine()
            await pse.infer_and_persist(
                db, user_id, signals,
                circadian_phase=result.get("context", {}).get("circadian_phase"),
                activity_context=result.get("context", {}).get("activity"),
            )

        # 3. Dispatch events
        await self._dispatcher.publish(HealthEvent(
            topic="health.update",
            payload={
                "state": state.get("state"),
                "score": result.get("fusion", {}).get("composite_score"),
                "alerts": result.get("new_alerts", []),
            },
            user_id=user_id,
            priority=(
                EventPriority.HIGH
                if result.get("new_alerts")
                else EventPriority.NORMAL
            ),
        ))

        # 4. Push to WebSocket
        await self._ws_manager.send_to_user(user_id, {
            "type": "health_update",
            "data": {
                "physiological_state": state,
                "fusion_score": result.get("fusion", {}).get("composite_score"),
                "alerts": result.get("new_alerts", []),
                "active_alerts": result.get("active_alerts", 0),
                "timestamp": (timestamp or datetime.utcnow()).isoformat(),
            },
        })

        return result

    # ── Session management ───────────────────────────────────

    async def start_session(
        self,
        db: AsyncSession,
        user_id: int,
        session_type: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Start a live session (workout, sleep, etc.)."""
        result = await self._sessions.start_session(
            db, user_id, session_type, metadata,
        )
        if "session_id" in result:
            self._coordinator.update_session(
                user_id, session_type, result["session_id"],
            )
        return result

    async def end_session(
        self,
        db: AsyncSession,
        user_id: int,
        metrics: Optional[dict] = None,
    ) -> dict:
        """End the active session."""
        result = await self._sessions.end_session(
            db, user_id, metrics,
        )
        self._coordinator.update_session(user_id, None, None)
        return result

    # ── State queries ────────────────────────────────────────

    def get_live_health(self, user_id: int) -> dict:
        """Get the current live health state for a user."""
        return self._coordinator.get_snapshot(user_id)

    def get_realtime_alerts(self, user_id: int) -> list[dict]:
        """Get active real-time alerts."""
        return self._monitor.get_alerts_engine().get_active_alerts(user_id)

    def get_adaptive_thresholds(self, user_id: int, **kwargs) -> dict:
        """Get current adaptive thresholds."""
        ctx = self._coordinator.get_context(user_id)
        return self._monitor.get_threshold_engine().compute_thresholds(
            user_id,
            circadian_phase=ctx.circadian_phase,
            recovery_state=ctx.recovery_state,
            baseline_confidence=ctx.baseline_confidence,
            **kwargs,
        )

    def get_stream_health(self, user_id: int) -> dict:
        """Get stream health status."""
        return self._monitor.get_stream_processor().get_stream_health(
            user_id,
        )

    # ── Component access ─────────────────────────────────────

    @property
    def coordinator(self) -> StateCoordinator:
        return self._coordinator

    @property
    def ws_manager(self) -> WebSocketConnectionManager:
        return self._ws_manager

    @property
    def dispatcher(self) -> RealtimeEventDispatcher:
        return self._dispatcher

    @property
    def session_manager(self) -> SessionManager:
        return self._sessions

    def get_system_stats(self) -> dict:
        """Get overall system statistics."""
        return {
            "started": self._started,
            "active_users": self._coordinator.active_users,
            "ws_connections": self._ws_manager.active_connections,
            "dispatcher": self._dispatcher.get_stats(),
            "ws_stats": self._ws_manager.get_stats(),
        }
