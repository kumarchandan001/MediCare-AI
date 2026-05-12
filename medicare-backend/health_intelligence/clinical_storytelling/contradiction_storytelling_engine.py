"""
Contradiction Storytelling Engine — Natural Conflict Narratives

Translates contradictions into calm, understandable stories that explain
conflicts as investigation refinements rather than errors.
"""
import time


class ContradictionStorytellingEngine:
    def narrate_contradictions(self, contradiction_data):
        if not contradiction_data or contradiction_data.get("contradiction_count", 0) == 0:
            return {
                "generated_at": time.time(),
                "narrative": "The current evidence paints a consistent picture. No conflicting signals have been identified.",
                "has_contradictions": False,
            }

        contradictions = contradiction_data.get("contradictions", [])
        parts = []

        parts.append("As part of the ongoing investigation, a few areas where evidence doesn't fully align have been identified.")
        parts.append(" This is a natural part of clinical reasoning — it means the AI is being thorough.")

        for c in contradictions[:3]:  # Cap at 3 for cognitive load
            ctype = c.get("type", "unknown")
            if ctype == "symptom_mismatch":
                symptoms = c.get("conflicting_symptoms", [])
                cond = c.get("condition", "the hypothesis")
                if symptoms:
                    parts.append(f" The presence of {', '.join(symptoms[:2])} doesn't perfectly match expectations for {cond}.")
                    parts.append(" Additional context may help clarify this.")
            elif ctype == "wearable_mismatch":
                parts.append(" Wearable readings don't fully align with the symptom picture.")
                parts.append(" Wearable data can vary — the AI is treating it with appropriate caution.")
            elif ctype == "temporal_inconsistency":
                parts.append(" The timing of symptom changes is somewhat unusual.")
                parts.append(" This may clarify over the next few observations.")
            elif ctype == "severity_conflict":
                parts.append(" Different clinical signals suggest slightly different severity levels.")
                parts.append(" The most reliable indicators are being prioritized.")
            elif ctype == "hypothesis_instability":
                parts.append(" The leading hypotheses are currently close in confidence.")
                parts.append(" More evidence will help differentiate between them.")

        impact = contradiction_data.get("overall_impact", "minimal")
        if impact in ("minimal", "none"):
            parts.append(" Overall, these observations have minimal impact on the investigation direction.")
        elif impact == "moderate":
            parts.append(" These patterns are being factored into the reasoning. Continued monitoring is recommended.")
        else:
            parts.append(" These factors are being given careful consideration. Professional consultation may be helpful.")

        suggestions = contradiction_data.get("resolution_suggestions", [])
        if suggestions:
            parts.append(f" Suggested next step: {suggestions[0]}")

        return {
            "generated_at": time.time(),
            "narrative": " ".join(parts),
            "has_contradictions": True,
            "impact": impact,
        }
