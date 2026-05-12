"""
Human Review Trigger Engine — Detects When AI Should Defer

Identifies conditions where AI reasoning should recommend
human clinical review rather than continuing autonomous investigation.
"""
import time


class HumanReviewTriggerEngine:
    def evaluate_review_need(
        self,
        hypotheses: list[dict],
        observations: list[dict],
        severity_score: float = 0.0,
        deterioration_score: float = 0.0,
        contradiction_count: int = 0,
        reasoning_stability: float = 0.7,
        evidence_sufficiency: float = 0.5,
        unresolved_hours: float = 0,
        escalation_level: str = "routine",
    ) -> dict:
        triggers = []
        urgency = "none"

        # 1. High ambiguity investigation
        confs = sorted([h.get("confidence", 0) for h in hypotheses], reverse=True)
        if len(confs) >= 3 and confs[0] < 0.4:
            triggers.append({
                "type": "high_ambiguity",
                "reason": "No hypothesis has reached moderate confidence after investigation.",
                "urgency": "moderate",
            })

        # 2. Severe escalation
        if escalation_level in ("urgent", "emergency"):
            triggers.append({
                "type": "severe_escalation",
                "reason": "Clinical escalation has reached a level requiring professional input.",
                "urgency": "high",
            })

        # 3. Unstable deterioration
        if deterioration_score > 0.6 and reasoning_stability < 0.4:
            triggers.append({
                "type": "unstable_deterioration",
                "reason": "Deterioration is progressing while reasoning remains unstable.",
                "urgency": "high",
            })

        # 4. Conflicting evidence cluster
        if contradiction_count > 3:
            triggers.append({
                "type": "evidence_conflict_cluster",
                "reason": "Multiple contradictory signals suggest the case may be complex.",
                "urgency": "moderate",
            })

        # 5. Persistent unresolved symptoms
        if unresolved_hours > 120 and evidence_sufficiency < 0.5:
            triggers.append({
                "type": "persistent_unresolved",
                "reason": "Symptoms have persisted for an extended period without clear resolution.",
                "urgency": "moderate",
            })

        # 6. Confidence instability
        if reasoning_stability < 0.25:
            triggers.append({
                "type": "confidence_instability",
                "reason": "Hypotheses are shifting rapidly, suggesting complex clinical picture.",
                "urgency": "moderate",
            })

        # Determine overall urgency
        if any(t["urgency"] == "high" for t in triggers):
            urgency = "high"
        elif triggers:
            urgency = "moderate"

        should_recommend = len(triggers) > 0

        recommendations = {
            "none": "",
            "moderate": "Consider consulting a healthcare professional to complement this AI investigation.",
            "high": "Professional medical evaluation is recommended to ensure appropriate clinical guidance.",
        }

        return {
            "generated_at": time.time(),
            "should_recommend_review": should_recommend,
            "triggers": triggers,
            "trigger_count": len(triggers),
            "urgency": urgency,
            "recommendation": recommendations.get(urgency, ""),
            "summary": (f"{len(triggers)} review trigger(s) detected. {recommendations.get(urgency, '')}"
                        if triggers else "No human review triggers detected at this time."),
        }
