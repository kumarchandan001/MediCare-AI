"""
Evidence Explainer — Causal Evidence Relationship Engine

Explains why specific evidence matters, how it connects to hypotheses,
and whether it strengthens, weakens, or introduces ambiguity.

Causal explanations:
  symptom → condition inference
  wearable → severity influence
  progression → escalation influence
  recovery → confidence adjustment
"""
import time
from typing import Any


class EvidenceExplainer:
    """Generates human-readable explanations of evidence significance."""

    STRENGTH_LABELS = {
        "strong": "strongly supports",
        "moderate": "moderately supports",
        "weak": "weakly suggests",
        "conflicting": "presents conflicting signals for",
        "missing": "is not yet available to evaluate",
    }

    def explain_evidence_landscape(
        self,
        hypotheses: list[dict],
        observations: list[dict],
        wearable_data: dict | None = None,
        wearable_trust: float = 0.5,
    ) -> dict:
        """
        Generate a complete evidence transparency explanation.

        Returns:
            dict with strong_evidence, weak_evidence, missing_evidence,
            conflicting_evidence, wearable_evidence, causal_links, summary
        """
        result = {
            "generated_at": time.time(),
            "strong_evidence": [],
            "weak_evidence": [],
            "missing_evidence": [],
            "conflicting_evidence": [],
            "wearable_evidence": [],
            "causal_links": [],
            "sufficiency_score": 0.0,
            "summary": "",
        }

        symptom_set = {o.get("symptom", "") for o in observations}

        for hyp in hypotheses:
            condition = hyp.get("condition", "unknown")
            confidence = hyp.get("confidence", 0)
            evidence_for = hyp.get("evidence_for", [])
            evidence_against = hyp.get("evidence_against", [])
            expected = hyp.get("expected_symptoms", [])

            # ── Strong evidence ───────────────────────
            matched = [e for e in evidence_for if e in symptom_set]
            for ev in matched:
                result["strong_evidence"].append({
                    "symptom": ev.replace("_", " "),
                    "condition": condition,
                    "explanation": f"{ev.replace('_', ' ')} {self.STRENGTH_LABELS['strong']} {condition}.",
                    "strength": "strong",
                })
                result["causal_links"].append({
                    "from": ev.replace("_", " "),
                    "to": condition,
                    "type": "supports",
                    "strength": min(1.0, confidence + 0.1),
                })

            # ── Weak evidence ─────────────────────────
            unmatched_for = [e for e in evidence_for if e not in symptom_set]
            for ev in unmatched_for[:3]:
                result["weak_evidence"].append({
                    "symptom": ev.replace("_", " "),
                    "condition": condition,
                    "explanation": f"{ev.replace('_', ' ')} was expected but not clearly observed, which {self.STRENGTH_LABELS['weak']} {condition}.",
                    "strength": "weak",
                })

            # ── Conflicting evidence ──────────────────
            for ev in evidence_against[:3]:
                result["conflicting_evidence"].append({
                    "symptom": ev.replace("_", " "),
                    "condition": condition,
                    "explanation": f"{ev.replace('_', ' ')} {self.STRENGTH_LABELS['conflicting']} {condition}. This is a normal part of clinical investigation.",
                    "strength": "conflicting",
                })
                result["causal_links"].append({
                    "from": ev.replace("_", " "),
                    "to": condition,
                    "type": "weakens",
                    "strength": max(0.0, 1.0 - confidence),
                })

            # ── Missing evidence ──────────────────────
            missing = [e for e in expected if e not in symptom_set and e not in evidence_for]
            for ev in missing[:3]:
                result["missing_evidence"].append({
                    "symptom": ev.replace("_", " "),
                    "condition": condition,
                    "explanation": f"Information about {ev.replace('_', ' ')} {self.STRENGTH_LABELS['missing']} {condition}.",
                    "strength": "missing",
                })

        # ── Wearable evidence ─────────────────────────
        if wearable_data:
            reliability = "reliable" if wearable_trust > 0.7 else "moderately reliable" if wearable_trust > 0.4 else "uncertain"
            for metric, value in wearable_data.items():
                result["wearable_evidence"].append({
                    "metric": metric,
                    "value": value,
                    "reliability": reliability,
                    "trust_score": wearable_trust,
                    "explanation": f"{metric.replace('_', ' ')} reading of {value} is considered {reliability} and is being factored into the assessment.",
                })

        # ── Sufficiency scoring ───────────────────────
        total_expected = sum(len(h.get("expected_symptoms", [])) for h in hypotheses) or 1
        total_matched = len(result["strong_evidence"])
        result["sufficiency_score"] = min(1.0, total_matched / total_expected)

        # ── Summary ──────────────────────────────────
        strong_count = len(result["strong_evidence"])
        conflict_count = len(result["conflicting_evidence"])
        missing_count = len(result["missing_evidence"])

        parts = [f"The investigation has identified {strong_count} strong supporting observation{'s' if strong_count != 1 else ''}."]
        if conflict_count:
            parts.append(f" {conflict_count} conflicting signal{'s' if conflict_count != 1 else ''} {'are' if conflict_count != 1 else 'is'} being evaluated — this is a normal part of thorough clinical reasoning.")
        if missing_count:
            parts.append(f" {missing_count} piece{'s' if missing_count != 1 else ''} of evidence {'are' if missing_count != 1 else 'is'} still being gathered.")
        if wearable_data:
            parts.append(f" Wearable data is being considered with {reliability} confidence.")

        result["summary"] = "".join(parts)
        return result
