"""
health_intelligence/digital_twin/wellness_identity_model.py
───────────────────────────────────────────────
Maintains a stable long-term behavioural identity
for the digital twin. (Refinement 1)

Prevents:
  - Excessive personalization drift
  - Unstable wellness identity changes
  - Reactive behavioural oscillation

Provides:
  - Resilience archetypes (Endurer, Sprinter, Steady)
  - Stable behavioural anchors
  - Consistency-aware personalization
  - Adaptation stability tracking

The identity evolves on a WEEKLY cadence, not per-signal,
ensuring the digital twin remains recognisable over time.
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


# ── Resilience Archetypes ────────────────────────────────
# Classify users into behavioural archetypes for
# coaching tone and intervention selection.

ARCHETYPES = {
    "endurer": {
        "description": "Tolerates high stress but recovers slowly",
        "coaching_bias": "recovery_focused",
        "intervention_style": "gentle_progressive",
    },
    "sprinter": {
        "description": "High energy bursts followed by crash recovery",
        "coaching_bias": "pacing_focused",
        "intervention_style": "structured_rest",
    },
    "steady": {
        "description": "Consistent moderate performance with stable recovery",
        "coaching_bias": "motivational",
        "intervention_style": "incremental_challenge",
    },
    "adaptive": {
        "description": "Quickly adjusts to new routines and stressors",
        "coaching_bias": "exploratory",
        "intervention_style": "varied_approach",
    },
    "fragile": {
        "description": "Sensitive to disruptions, needs protective support",
        "coaching_bias": "supportive",
        "intervention_style": "ultra_low_friction",
    },
}


@dataclass
class BehavioralAnchor:
    """A stable reference point for a behavioral dimension."""
    dimension: str
    anchor_value: float
    confidence: float
    stability: float        # 0–1 (how stable this anchor is)
    last_weekly_update: str


@dataclass
class WellnessIdentity:
    """The user's long-term wellness identity."""
    archetype: str = "steady"
    archetype_confidence: float = 0.3
    archetype_stability: float = 0.5

    # Behavioural anchors (EMA-smoothed weekly values)
    anchors: dict[str, BehavioralAnchor] = field(default_factory=dict)

    # Drift tracking
    drift_score: float = 0.0              # 0–1 (how much identity shifted recently)
    drift_velocity: float = 0.0           # rate of change
    max_allowed_drift: float = 0.15       # safety bound

    # Adaptation stability
    weeks_at_current_archetype: int = 0
    archetype_history: list[str] = field(default_factory=list)

    # Consistency metrics
    behavioral_consistency: float = 0.5   # 0–1
    personalization_stability: float = 0.5

    last_identity_update: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class WellnessIdentityModel:
    """
    Maintains stable long-term behavioral identity,
    preventing reactive oscillation while allowing
    genuine long-term evolution.
    """

    # Weekly EMA alpha (very slow, stable)
    _WEEKLY_ALPHA = 0.08

    def __init__(self):
        self._identities: dict[int, WellnessIdentity] = {}

    def get_identity(self, user_id: int) -> WellnessIdentity:
        if user_id not in self._identities:
            self._identities[user_id] = WellnessIdentity()
            self._init_anchors(user_id)
        return self._identities[user_id]

    def update_weekly(
        self,
        user_id: int,
        weekly_averages: dict[str, float],
    ) -> WellnessIdentity:
        """
        Update the identity from weekly averages.
        Called on a weekly cadence, NOT per-signal.
        """
        identity = self.get_identity(user_id)
        now = datetime.utcnow().isoformat()

        # Update anchors
        total_drift = 0.0
        anchor_count = 0

        for dim, value in weekly_averages.items():
            if dim in identity.anchors:
                anchor = identity.anchors[dim]
                old_val = anchor.anchor_value

                # EMA update
                new_val = old_val * (1 - self._WEEKLY_ALPHA) + value * self._WEEKLY_ALPHA
                drift = abs(new_val - old_val) / max(abs(old_val), 1)

                # Clamp drift to prevent runaway identity shifts
                if drift > identity.max_allowed_drift:
                    clamped = old_val + (new_val - old_val) * (identity.max_allowed_drift / max(drift, 0.001))
                    new_val = clamped
                    drift = identity.max_allowed_drift

                anchor.anchor_value = round(new_val, 3)
                anchor.stability = round(max(0, 1.0 - drift * 5), 3)
                anchor.last_weekly_update = now

                total_drift += drift
                anchor_count += 1

        # Update drift tracking
        avg_drift = total_drift / max(anchor_count, 1)
        old_drift = identity.drift_score
        identity.drift_velocity = round(avg_drift - old_drift, 4)
        identity.drift_score = round(avg_drift, 4)

        # Behavioral consistency (inverse of drift)
        identity.behavioral_consistency = round(
            max(0, 1.0 - identity.drift_score * 3), 3,
        )

        # Re-classify archetype
        self._update_archetype(user_id, weekly_averages)

        identity.personalization_stability = round(
            (identity.archetype_stability + identity.behavioral_consistency) / 2, 3,
        )
        identity.last_identity_update = now
        return identity

    def _update_archetype(
        self,
        user_id: int,
        averages: dict[str, float],
    ) -> None:
        """Classify archetype from behavioral patterns."""
        identity = self.get_identity(user_id)

        stress = averages.get("stress_level", 40)
        recovery = averages.get("recovery_score", 65)
        consistency = identity.behavioral_consistency
        fatigue = averages.get("fatigue", 30)

        # Scoring
        scores: dict[str, float] = {
            "endurer": 0,
            "sprinter": 0,
            "steady": 0,
            "adaptive": 0,
            "fragile": 0,
        }

        # Endurer: high stress tolerance, slow recovery
        if stress > 55 and recovery < 55:
            scores["endurer"] += 0.4
        # Sprinter: variable energy, crash patterns
        if consistency < 0.4 and fatigue > 50:
            scores["sprinter"] += 0.4
        # Steady: consistent moderate
        if 0.5 <= consistency and 45 <= recovery <= 80:
            scores["steady"] += 0.4
        # Adaptive: quick recovery, varied routines
        if recovery > 70 and consistency < 0.6:
            scores["adaptive"] += 0.3
        # Fragile: low recovery, high fatigue
        if recovery < 40 and fatigue > 60:
            scores["fragile"] += 0.5

        best = max(scores, key=scores.get)  # type: ignore
        best_score = scores[best]

        # Only change archetype if confident AND different for multiple weeks
        if best != identity.archetype:
            if best_score > 0.35:
                # Require 3+ weeks of signal before switching
                identity.weeks_at_current_archetype = 0
                # Don't switch yet — just track
                if len(identity.archetype_history) >= 3:
                    recent = identity.archetype_history[-3:]
                    if all(a == best for a in recent):
                        identity.archetype = best
                        identity.archetype_confidence = round(best_score, 3)

                identity.archetype_history.append(best)
                if len(identity.archetype_history) > 12:
                    identity.archetype_history = identity.archetype_history[-12:]
            else:
                identity.weeks_at_current_archetype += 1
        else:
            identity.weeks_at_current_archetype += 1
            identity.archetype_stability = min(
                1.0,
                0.3 + identity.weeks_at_current_archetype * 0.05,
            )

    def _init_anchors(self, user_id: int) -> None:
        """Initialise default behavioural anchors."""
        identity = self.get_identity(user_id)
        now = datetime.utcnow().isoformat()
        defaults = {
            "stress_level": 35.0,
            "recovery_score": 65.0,
            "sleep_hours": 7.5,
            "active_minutes": 30.0,
            "fatigue": 30.0,
            "wellness_score": 65.0,
            "resilience": 60.0,
        }
        for dim, val in defaults.items():
            identity.anchors[dim] = BehavioralAnchor(
                dimension=dim,
                anchor_value=val,
                confidence=0.3,
                stability=0.5,
                last_weekly_update=now,
            )

    def to_dict(self, user_id: int) -> dict:
        identity = self.get_identity(user_id)
        archetype_info = ARCHETYPES.get(identity.archetype, {})
        return {
            "archetype": identity.archetype,
            "archetype_info": archetype_info,
            "archetype_confidence": identity.archetype_confidence,
            "archetype_stability": identity.archetype_stability,
            "weeks_at_archetype": identity.weeks_at_current_archetype,
            "behavioral_consistency": identity.behavioral_consistency,
            "personalization_stability": identity.personalization_stability,
            "drift": {
                "score": identity.drift_score,
                "velocity": identity.drift_velocity,
                "max_allowed": identity.max_allowed_drift,
            },
            "anchors": {
                dim: {
                    "value": a.anchor_value,
                    "stability": a.stability,
                }
                for dim, a in identity.anchors.items()
            },
        }
