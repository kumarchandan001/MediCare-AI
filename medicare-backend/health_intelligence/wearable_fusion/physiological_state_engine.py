"""
health_intelligence/wearable_fusion/physiological_state_engine.py
───────────────────────────────────────────────
Infers the current physiological state from fused sensor
data — the "digital physiology" layer.

States:
  resting | active | stressed | recovering |
  sleeping | fatigued | abnormal | workout | unknown

Extensible for future Digital Twin expansion:
  - Physiological simulation
  - Adaptive health agents
  - Recovery simulation models
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from health_intelligence.wearable_fusion.sensor_fusion_engine import (
    SensorFusionEngine, FusionResult,
)
from health_intelligence.models import PhysiologicalStateLog

log = logging.getLogger(__name__)

# State inference rules: signal thresholds
STATE_RULES = {
    "sleeping": {
        "conditions": {
            "heart_rate_bpm": ("lt", 60),
            "steps": ("lt", 50),
            "active_minutes": ("lt", 5),
        },
        "min_signals": 2,
        "priority": 10,
    },
    "workout": {
        "conditions": {
            "heart_rate_bpm": ("gt", 110),
            "steps": ("gt", 500),
            "active_minutes": ("gt", 20),
        },
        "min_signals": 2,
        "priority": 9,
    },
    "stressed": {
        "conditions": {
            "stress_level": ("gt", 65),
            "heart_rate_bpm": ("gt", 85),
        },
        "min_signals": 1,
        "priority": 7,
    },
    "fatigued": {
        "conditions": {
            "sleep_hours": ("lt", 5.5),
            "stress_level": ("gt", 55),
            "heart_rate_bpm": ("gt", 80),
        },
        "min_signals": 2,
        "priority": 6,
    },
    "recovering": {
        "conditions": {
            "heart_rate_bpm": ("lt", 75),
            "stress_level": ("lt", 35),
            "steps": ("lt", 2000),
        },
        "min_signals": 2,
        "priority": 5,
    },
    "active": {
        "conditions": {
            "steps": ("gt", 3000),
            "active_minutes": ("gt", 15),
        },
        "min_signals": 1,
        "priority": 4,
    },
    "resting": {
        "conditions": {
            "heart_rate_bpm": ("lt", 75),
            "stress_level": ("lt", 40),
            "steps": ("lt", 1000),
        },
        "min_signals": 2,
        "priority": 3,
    },
}

# Abnormal thresholds
ABNORMAL_THRESHOLDS = {
    "heart_rate_bpm": (40, 150),
    "spo2_percent": (88, None),
    "stress_level": (None, 90),
}


@dataclass
class PhysiologicalState:
    """Inferred physiological state with metadata."""
    state: str
    confidence: float
    contributing_signals: dict[str, Any]
    context: dict[str, Any]
    fusion_snapshot: dict[str, float]
    alternative_states: list[dict]
    explanation: list[str]
    inferred_at: str


class PhysiologicalStateEngine:
    """
    Infers the user's current physiological state from
    fused multi-modal sensor data.

    Designed extensibly for future Digital Twin expansion.
    """

    def __init__(self):
        self._fusion = SensorFusionEngine()
        self._state_history: list[str] = []  # in-memory recent states

    def infer_state(
        self,
        signals: dict[str, Any],
        timestamps: Optional[dict[str, datetime]] = None,
        personal_baselines: Optional[dict[str, float]] = None,
        circadian_phase: Optional[str] = None,
        activity_context: Optional[str] = None,
    ) -> PhysiologicalState:
        """
        Infer the current physiological state from raw signals.

        Returns PhysiologicalState with confidence and explanation.
        """
        # Fuse signals
        fusion = self._fusion.fuse(
            signals, timestamps, personal_baselines,
        )
        values = fusion.signal_contributions
        explanation: list[str] = []

        # Check for abnormal first (highest priority)
        abnormal = self._check_abnormal(signals)
        if abnormal:
            explanation.append(
                f"Abnormal reading detected: {abnormal['detail']}"
            )
            state_result = PhysiologicalState(
                state="abnormal",
                confidence=abnormal["confidence"],
                contributing_signals=abnormal["signals"],
                context={
                    "circadian_phase": circadian_phase,
                    "activity_context": activity_context,
                },
                fusion_snapshot={
                    k: v for k, v in signals.items()
                    if v is not None
                },
                alternative_states=[],
                explanation=explanation,
                inferred_at=datetime.utcnow().isoformat(),
            )
            self._state_history.append("abnormal")
            return state_result

        # Score each candidate state
        candidates: list[dict] = []
        for state_name, rule in STATE_RULES.items():
            score = self._score_state(signals, rule)
            if score["match_count"] >= rule["min_signals"]:
                candidates.append({
                    "state": state_name,
                    "score": score["score"],
                    "match_count": score["match_count"],
                    "matched_signals": score["matched"],
                    "priority": rule["priority"],
                })

        # Sort by score * priority
        candidates.sort(
            key=lambda c: c["score"] * c["priority"],
            reverse=True,
        )

        if not candidates:
            self._state_history.append("unknown")
            return PhysiologicalState(
                state="unknown",
                confidence=0.3,
                contributing_signals={},
                context={
                    "circadian_phase": circadian_phase,
                    "activity_context": activity_context,
                },
                fusion_snapshot={
                    k: v for k, v in signals.items()
                    if v is not None
                },
                alternative_states=[],
                explanation=["Insufficient signal clarity to determine state."],
                inferred_at=datetime.utcnow().isoformat(),
            )

        best = candidates[0]
        confidence = min(best["score"] / 100.0, 0.95)

        # Context adjustments
        if circadian_phase == "night" and best["state"] == "resting":
            best["state"] = "sleeping"
            confidence = min(confidence + 0.1, 0.95)
            explanation.append(
                "Resting state during night → reclassified as sleeping."
            )

        if activity_context == "exercise" and best["state"] == "active":
            best["state"] = "workout"
            confidence = min(confidence + 0.1, 0.95)
            explanation.append(
                "Active state during exercise → reclassified as workout."
            )

        # Fusion confidence modulates state confidence
        confidence *= fusion.confidence if fusion.confidence > 0 else 0.5

        explanation.append(
            f"State '{best['state']}' inferred from "
            f"{best['match_count']} matching signals "
            f"(confidence: {confidence:.2f})."
        )

        self._state_history.append(best["state"])
        if len(self._state_history) > 100:
            self._state_history = self._state_history[-50:]

        return PhysiologicalState(
            state=best["state"],
            confidence=round(confidence, 3),
            contributing_signals=best["matched_signals"],
            context={
                "circadian_phase": circadian_phase,
                "activity_context": activity_context,
                "fusion_confidence": fusion.confidence,
                "risk_amplification": fusion.risk_amplification,
            },
            fusion_snapshot={
                k: v for k, v in signals.items() if v is not None
            },
            alternative_states=[
                {
                    "state": c["state"],
                    "score": round(c["score"], 1),
                }
                for c in candidates[1:4]
            ],
            explanation=explanation,
            inferred_at=datetime.utcnow().isoformat(),
        )

    async def infer_and_persist(
        self,
        db: AsyncSession,
        user_id: int,
        signals: dict[str, Any],
        **kwargs,
    ) -> PhysiologicalState:
        """Infer state and persist to database."""
        state = self.infer_state(signals, **kwargs)

        log_entry = PhysiologicalStateLog(
            user_id=user_id,
            state=state.state,
            confidence=state.confidence,
            contributing_signals=state.contributing_signals,
            context=state.context,
            fusion_snapshot=state.fusion_snapshot,
        )
        db.add(log_entry)
        return state

    # ── Internal helpers ─────────────────────────────────────

    @staticmethod
    def _score_state(
        signals: dict[str, Any],
        rule: dict,
    ) -> dict:
        """Score how well signals match a state's conditions."""
        conditions = rule["conditions"]
        match_count = 0
        total = len(conditions)
        matched: dict[str, Any] = {}

        for signal_name, (op, threshold) in conditions.items():
            value = signals.get(signal_name)
            if value is None:
                continue

            hit = False
            if op == "gt" and float(value) > threshold:
                hit = True
            elif op == "lt" and float(value) < threshold:
                hit = True

            if hit:
                match_count += 1
                matched[signal_name] = {
                    "value": value,
                    "condition": f"{op} {threshold}",
                }

        score = (match_count / total * 100) if total > 0 else 0
        return {
            "match_count": match_count,
            "total": total,
            "score": score,
            "matched": matched,
        }

    @staticmethod
    def _check_abnormal(signals: dict[str, Any]) -> Optional[dict]:
        """Check for critically abnormal readings."""
        for name, (low, high) in ABNORMAL_THRESHOLDS.items():
            value = signals.get(name)
            if value is None:
                continue

            val = float(value)
            if low is not None and val < low:
                return {
                    "confidence": 0.85,
                    "detail": f"{name}={val} below critical threshold {low}",
                    "signals": {name: val},
                }
            if high is not None and val > high:
                return {
                    "confidence": 0.85,
                    "detail": f"{name}={val} above critical threshold {high}",
                    "signals": {name: val},
                }

        return None

    def get_recent_states(self, n: int = 10) -> list[str]:
        """Return the N most recent inferred states."""
        return self._state_history[-n:]
