"""
Trust Transparency Engine — Clinical Trust Indicators

Calculates and exposes evidence sufficiency, wearable reliability,
investigation completeness, and reasoning stability as trust indicators.
"""
import time


class TrustTransparencyEngine:
    def calculate_trust_indicators(self, hypotheses, observations,
                                   evidence_sufficiency=0.5, wearable_trust=0.5,
                                   reasoning_stability=0.7, contradiction_count=0):
        res = {"generated_at": time.time(), "indicators": [], "overall_trust": 0.0, "summary": ""}

        # Evidence sufficiency
        suf_label = "strong" if evidence_sufficiency > 0.7 else "adequate" if evidence_sufficiency > 0.4 else "limited"
        res["indicators"].append({
            "type": "evidence_sufficiency", "label": "Evidence Gathered",
            "value": round(evidence_sufficiency, 2), "status": suf_label,
            "explanation": f"Evidence gathering is {suf_label}. {'The investigation has a solid foundation.' if suf_label == 'strong' else 'More observations may strengthen the assessment.'}",
        })

        # Investigation completeness
        total_expected = sum(len(h.get("expected_symptoms", [])) for h in hypotheses) or 1
        matched = sum(1 for o in observations for h in hypotheses if o.get("symptom") in h.get("evidence_for", []))
        completeness = min(1.0, matched / total_expected)
        comp_label = "thorough" if completeness > 0.7 else "progressing" if completeness > 0.4 else "early"
        res["indicators"].append({
            "type": "investigation_completeness", "label": "Investigation Progress",
            "value": round(completeness, 2), "status": comp_label,
            "explanation": f"The investigation is {comp_label}. {'Key evidence has been gathered.' if comp_label == 'thorough' else 'Continued observation will improve clarity.'}",
        })

        # Wearable reliability
        w_label = "reliable" if wearable_trust > 0.7 else "moderate" if wearable_trust > 0.4 else "uncertain"
        res["indicators"].append({
            "type": "wearable_reliability", "label": "Wearable Confidence",
            "value": round(wearable_trust, 2), "status": w_label,
            "explanation": f"Wearable data is considered {w_label}. {'Readings are consistent and trustworthy.' if w_label == 'reliable' else 'Some variability has been noted — data is being treated with appropriate caution.'}",
        })

        # Reasoning stability
        stab_label = "stable" if reasoning_stability > 0.7 else "adjusting" if reasoning_stability > 0.4 else "evolving"
        res["indicators"].append({
            "type": "reasoning_stability", "label": "Reasoning Stability",
            "value": round(reasoning_stability, 2), "status": stab_label,
            "explanation": f"Clinical reasoning is {stab_label}. {'Confidence levels are consistent.' if stab_label == 'stable' else 'The AI is actively refining its assessment as new evidence emerges.'}",
        })

        # Ambiguity level
        amb = min(1.0, contradiction_count * 0.15 + (1 - evidence_sufficiency) * 0.3)
        amb_label = "low" if amb < 0.2 else "moderate" if amb < 0.5 else "elevated"
        res["indicators"].append({
            "type": "ambiguity_level", "label": "Ambiguity Level",
            "value": round(amb, 2), "status": amb_label,
            "explanation": f"Ambiguity is {amb_label}. {'The clinical picture is fairly clear.' if amb_label == 'low' else 'Some areas require further clarification — this is expected.'}",
        })

        # Overall trust
        weights = [0.3, 0.2, 0.15, 0.2, 0.15]
        values = [evidence_sufficiency, completeness, wearable_trust, reasoning_stability, 1 - amb]
        res["overall_trust"] = round(sum(w * v for w, v in zip(weights, values)), 3)

        trust_label = "high" if res["overall_trust"] > 0.7 else "moderate" if res["overall_trust"] > 0.45 else "developing"
        res["summary"] = (f"Overall investigation trust is {trust_label} ({round(res['overall_trust'] * 100)}%). "
                          f"{'The AI has strong evidence to work with.' if trust_label == 'high' else 'The investigation is progressing and trust will improve with more observations.'}")
        return res
