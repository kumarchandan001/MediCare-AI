"""
health_intelligence/realtime/adaptive_monitor.py
───────────────────────────────────────────────
Continuous adaptive monitoring loop — the heartbeat
of real-time health intelligence.

On each cycle:
  1. Ingest latest signals
  2. Fuse modalities
  3. Infer physiological state
  4. Check adaptive thresholds
  5. Generate alerts if needed
  6. Update shared state coordinator
  7. Push updates to websocket
"""

import logging
from datetime import datetime
from typing import Any, Optional

from health_intelligence.realtime.stream_processor import StreamProcessor
from health_intelligence.wearable_fusion.sensor_fusion_engine import SensorFusionEngine
from health_intelligence.wearable_fusion.physiological_state_engine import (
    PhysiologicalStateEngine,
)
from health_intelligence.context.contextual_reasoning import ContextualReasoningEngine
from health_intelligence.adaptation.dynamic_thresholding import DynamicThresholdEngine
from health_intelligence.realtime.realtime_alerts import RealtimeAlertEngine
from health_intelligence.realtime.state_coordinator import StateCoordinator

log = logging.getLogger(__name__)


class AdaptiveMonitor:
    """
    Continuous monitoring engine that orchestrates
    real-time health intelligence processing.
    """

    def __init__(
        self,
        coordinator: Optional[StateCoordinator] = None,
    ):
        self._stream = StreamProcessor()
        self._fusion = SensorFusionEngine()
        self._physio = PhysiologicalStateEngine()
        self._context = ContextualReasoningEngine()
        self._thresholds = DynamicThresholdEngine()
        self._alerts = RealtimeAlertEngine()
        self._coordinator = coordinator or StateCoordinator()

    async def process_update(
        self,
        user_id: int,
        signals: dict[str, Any],
        timestamp: Optional[datetime] = None,
        user_timezone_offset: float = 0,
    ) -> dict:
        """
        Process a single monitoring cycle for a user.

        This is called each time new wearable data arrives
        or on a periodic schedule.

        Returns a comprehensive monitoring result.
        """
        ts = timestamp or datetime.utcnow()

        # 1. Process & validate signals
        processed = self._stream.process_batch(
            user_id, signals, ts,
        )
        accepted = {
            name: p.clean_value
            for name, p in processed.items()
            if p.accepted and p.clean_value is not None
        }

        if not accepted:
            return {
                "status": "no_valid_signals",
                "processed": len(processed),
                "accepted": 0,
            }

        # 2. Get shared context
        ctx = self._coordinator.get_context(user_id)

        # 3. Fuse signals
        fusion = self._fusion.fuse(
            accepted,
            personal_baselines=ctx.baselines or None,
        )

        # 4. Contextual reasoning
        reasoning = self._context.reason(
            accepted,
            at=ts,
            user_timezone_offset=user_timezone_offset,
            personal_baselines=ctx.baselines or None,
        )

        # 5. Infer physiological state
        physio_state = self._physio.infer_state(
            accepted,
            circadian_phase=reasoning["context"].get("circadian_phase"),
            activity_context=reasoning["context"].get("activity"),
            personal_baselines=ctx.baselines or None,
        )

        # 6. Check adaptive thresholds
        violations = self._thresholds.check_against_thresholds(
            user_id, accepted,
            circadian_phase=reasoning["context"].get("circadian_phase"),
            recovery_state=ctx.recovery_state,
            baseline_confidence=ctx.baseline_confidence,
        )

        # 7. Generate alerts for violations
        new_alerts = []
        for v in violations:
            alert = self._alerts.generate_alert(
                user_id=user_id,
                alert_type=f"threshold_{v['direction']}",
                severity=v["severity"],
                title=v["message"].split("(")[0].strip(),
                message=v["message"],
                contributing_signals={v["metric"]: v["value"]},
                contextual_reasoning=(
                    reasoning["explanations"][0]
                    if reasoning["explanations"] else ""
                ),
                threshold_explanation=v.get("threshold_explanation", ""),
                confidence=fusion.confidence,
            )
            if alert:
                new_alerts.append({
                    "alert_id": alert.alert_id,
                    "severity": alert.severity,
                    "title": alert.title,
                })

        # Also alert on fusion-level concerns
        for fa in fusion.alerts:
            alert = self._alerts.generate_alert(
                user_id=user_id,
                alert_type="sensor_deviation",
                severity=fa["severity"],
                title=f"{fa['signal'].replace('_', ' ').title()} Alert",
                message=fa["message"],
                contributing_signals={fa["signal"]: fa.get("deviation")},
                contextual_reasoning="; ".join(fusion.explanation),
                confidence=fa.get("confidence", 0.5),
            )
            if alert:
                new_alerts.append({
                    "alert_id": alert.alert_id,
                    "severity": alert.severity,
                    "title": alert.title,
                })

        # 8. Update coordinator
        self._coordinator.update_physiological_state(
            user_id, physio_state.state, physio_state.confidence,
        )
        self._coordinator.update_circadian(
            user_id,
            reasoning["context"].get("circadian_phase", "unknown"),
        )
        self._coordinator.update_stream_health(
            user_id,
            self._stream.get_stream_health(user_id).get(
                "acceptance_rate", 1.0,
            ),
        )
        self._coordinator.update_alerts(
            user_id,
            len(self._alerts.get_active_alerts(user_id)),
        )
        self._coordinator.mark_synchronized(user_id)

        # Update adaptive learner with accepted values
        self._thresholds.get_learner().update_batch(
            user_id, accepted, ts,
        )

        return {
            "status": "processed",
            "timestamp": ts.isoformat(),
            "signals_accepted": len(accepted),
            "physiological_state": {
                "state": physio_state.state,
                "confidence": physio_state.confidence,
                "explanation": physio_state.explanation,
            },
            "fusion": {
                "composite_score": fusion.composite_score,
                "confidence": fusion.confidence,
                "risk_amplification": fusion.risk_amplification,
                "available_modalities": fusion.available_modalities,
            },
            "context": reasoning["context"],
            "overall_concern": reasoning["overall_concern"],
            "threshold_violations": len(violations),
            "new_alerts": new_alerts,
            "active_alerts": len(
                self._alerts.get_active_alerts(user_id)
            ),
        }

    # ── Accessors ────────────────────────────────────────────

    def get_coordinator(self) -> StateCoordinator:
        return self._coordinator

    def get_alerts_engine(self) -> RealtimeAlertEngine:
        return self._alerts

    def get_stream_processor(self) -> StreamProcessor:
        return self._stream

    def get_threshold_engine(self) -> DynamicThresholdEngine:
        return self._thresholds
