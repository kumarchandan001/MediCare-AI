"""
triage_engine.py
────────────────
Categorises the patient into a 4-level triage system.

Levels:
  1. self_monitoring      — Low concern, continue self-care
  2. routine_consultation — Schedule a non-urgent appointment
  3. urgent_evaluation    — Seek medical attention soon
  4. emergency_escalation — Seek immediate emergency care
"""

from typing import Any, Dict


class TriageEngine:

    def classify(
        self,
        severity_score: float,
        severity_level: str,
        deterioration_score: float,
        escalation_likelihood: float,
        trajectory: str,
    ) -> Dict[str, Any]:
        level = self._compute_level(
            severity_score, severity_level, deterioration_score,
            escalation_likelihood, trajectory,
        )
        return {
            "triage_level": level,
            "urgency_score": round(self._urgency(level), 2),
            "action": self._action(level),
            "explanation": self._explain(level, trajectory),
        }

    # ── internals ────────────────────────────────

    @staticmethod
    def _compute_level(
        severity: float, sev_level: str, det: float, esc: float, traj: str,
    ) -> str:
        # Emergency if critical severity or high escalation with deteriorating trajectory
        if sev_level == "critical" or (esc > 0.6 and traj == "deteriorating"):
            return "emergency_escalation"
        if sev_level == "severe" or (det > 0.4 and traj == "deteriorating"):
            return "urgent_evaluation"
        if sev_level in ("moderate", "significant") or traj == "fluctuating":
            return "routine_consultation"
        return "self_monitoring"

    @staticmethod
    def _urgency(level: str) -> float:
        return {
            "self_monitoring": 0.1,
            "routine_consultation": 0.35,
            "urgent_evaluation": 0.65,
            "emergency_escalation": 0.9,
        }.get(level, 0.2)

    @staticmethod
    def _action(level: str) -> str:
        return {
            "self_monitoring": "Continue monitoring symptoms at home. No immediate action required.",
            "routine_consultation": "Consider scheduling a consultation with your healthcare provider.",
            "urgent_evaluation": "It is advisable to seek medical evaluation in a timely manner.",
            "emergency_escalation": "Please consider seeking immediate medical attention.",
        }.get(level, "Continue monitoring.")

    @staticmethod
    def _explain(level: str, trajectory: str) -> str:
        parts = [f"Triage classification: {level.replace('_', ' ')}."]
        if trajectory == "deteriorating":
            parts.append("The worsening trajectory influenced this classification.")
        elif trajectory == "improving":
            parts.append("An improving trajectory has been factored into this assessment.")
        return " ".join(parts)
