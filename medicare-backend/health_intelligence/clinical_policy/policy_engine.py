"""
Policy Engine — Central Policy Manager

Centralized repository of clinical policy constants and rules.
All subsystems should reference this for consistent behavior.
"""


class PolicyEngine:
    """Singleton-style policy repository."""

    CONFIDENCE = {
        "absolute_cap": 0.85,
        "high_evidence_threshold": 0.7,
        "moderate_threshold": 0.4,
        "low_threshold": 0.2,
        "min_evidence_for_high": 3,
        "contradiction_penalty_per": 0.08,
        "max_contradiction_penalty": 0.25,
    }

    ESCALATION = {
        "routine_max_severity": 0.3,
        "watchful_max_severity": 0.5,
        "elevated_max_severity": 0.7,
        "urgent_max_severity": 0.85,
        "emergency_keywords": [
            "chest_pain", "difficulty_breathing", "severe_chest_pressure",
            "sudden_numbness", "sudden_confusion", "loss_of_consciousness",
            "seizure", "stroke_symptoms", "cardiac_arrest", "respiratory_failure",
        ],
        "cooldown_hours": 4,
        "max_alerts_per_day": 6,
    }

    WEARABLE = {
        "high_trust_threshold": 0.7,
        "moderate_trust_threshold": 0.4,
        "low_trust_threshold": 0.2,
        "max_influence_weight": 0.3,
        "anomaly_suppression_threshold": 3,
        "noise_filter_window_hours": 2,
    }

    UNCERTAINTY = {
        "max_acceptable_uncertainty": 0.8,
        "ambiguity_preservation_threshold": 0.3,
        "evidence_sufficiency_low": 0.3,
        "evidence_sufficiency_adequate": 0.5,
        "evidence_sufficiency_strong": 0.7,
    }

    CONTRADICTION = {
        "minor_threshold": 1,
        "moderate_threshold": 3,
        "severe_threshold": 5,
        "confidence_penalty_per": 0.08,
        "escalation_boost_threshold": 3,
    }

    EMOTIONAL = {
        "max_cognitive_load": 0.7,
        "max_hypotheses_shown": 4,
        "max_evidence_items": 6,
        "max_contradictions_shown": 3,
        "narrative_max_chars": 500,
        "anxiety_score_threshold": 0.3,
    }

    REVIEW = {
        "high_ambiguity_confidence_threshold": 0.4,
        "persistent_symptom_hours": 120,
        "instability_threshold": 0.25,
        "deterioration_review_threshold": 0.6,
    }

    @classmethod
    def get_all_policies(cls) -> dict:
        return {
            "confidence": cls.CONFIDENCE,
            "escalation": cls.ESCALATION,
            "wearable": cls.WEARABLE,
            "uncertainty": cls.UNCERTAINTY,
            "contradiction": cls.CONTRADICTION,
            "emotional": cls.EMOTIONAL,
            "review": cls.REVIEW,
        }
