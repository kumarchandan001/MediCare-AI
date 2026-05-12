"""
Contradiction Explainer — Conflict Resolution Storytelling

Explains contradictions as normal investigative refinements.
"""
import time


class ContradictionExplainer:
    TYPES = {
        "symptom_mismatch": {
            "label": "Symptom Pattern Mismatch",
            "tpl": "Some symptoms don't fully align with {c}. This is common during early investigation.",
        },
        "wearable_mismatch": {
            "label": "Wearable Data Inconsistency",
            "tpl": "Wearable readings don't fully match the expected pattern for {c}. Wearable data can vary due to many factors.",
        },
        "temporal_inconsistency": {
            "label": "Progression Pattern Change",
            "tpl": "The timeline of changes doesn't follow a typical pattern for {c}. The picture may still be evolving.",
        },
        "severity_conflict": {
            "label": "Severity Signal Conflict",
            "tpl": "Different signals suggest different severity levels. The most reliable indicators are being prioritized.",
        },
        "hypothesis_instability": {
            "label": "Evolving Hypothesis",
            "tpl": "Leading hypotheses have shifted recently — a normal part of clinical reasoning.",
        },
    }

    def detect_and_explain(self, hypotheses, observations, wearable_data=None,
                           wearable_trust=0.5, severity_signals=None, trajectory_data=None):
        res = {"generated_at": time.time(), "contradictions": [], "contradiction_count": 0,
               "overall_impact": "none", "confidence_reduction": 0.0, "resolution_suggestions": [], "summary": ""}
        symptom_set = {o.get("symptom", "") for o in observations}

        for hyp in hypotheses:
            cond = hyp.get("condition", "unknown")
            against = hyp.get("evidence_against", [])
            conflicts = [e for e in against if e in symptom_set]
            if conflicts:
                res["contradictions"].append({
                    "type": "symptom_mismatch", "label": self.TYPES["symptom_mismatch"]["label"],
                    "condition": cond, "conflicting_symptoms": [s.replace("_", " ") for s in conflicts],
                    "explanation": self.TYPES["symptom_mismatch"]["tpl"].format(c=cond),
                    "confidence_impact": -min(0.15, len(conflicts) * 0.05), "severity": "mild" if len(conflicts) < 2 else "moderate",
                })

        if wearable_data and wearable_trust < 0.5:
            for hyp in hypotheses[:1]:
                cond = hyp.get("condition", "unknown")
                if hyp.get("confidence", 0) > 0.3:
                    res["contradictions"].append({
                        "type": "wearable_mismatch", "label": self.TYPES["wearable_mismatch"]["label"],
                        "condition": cond, "explanation": self.TYPES["wearable_mismatch"]["tpl"].format(c=cond),
                        "trust_score": wearable_trust, "confidence_impact": -0.05, "severity": "mild",
                    })

        if trajectory_data and trajectory_data.get("volatility", 0) > 0.4:
            cond = hypotheses[0].get("condition", "the clinical picture") if hypotheses else "the clinical picture"
            res["contradictions"].append({
                "type": "temporal_inconsistency", "label": self.TYPES["temporal_inconsistency"]["label"],
                "condition": cond, "explanation": self.TYPES["temporal_inconsistency"]["tpl"].format(c=cond),
                "volatility": trajectory_data["volatility"], "confidence_impact": -0.08,
                "severity": "moderate" if trajectory_data["volatility"] > 0.6 else "mild",
            })

        if severity_signals:
            s_sev = severity_signals.get("symptom_severity", 0)
            w_sev = severity_signals.get("wearable_severity", 0)
            if abs(s_sev - w_sev) > 0.3:
                res["contradictions"].append({
                    "type": "severity_conflict", "label": self.TYPES["severity_conflict"]["label"],
                    "explanation": self.TYPES["severity_conflict"]["tpl"],
                    "confidence_impact": -0.06, "severity": "moderate",
                })

        confs = [h.get("confidence", 0) for h in hypotheses]
        if len(confs) >= 2:
            top2 = sorted(confs, reverse=True)[:2]
            if abs(top2[0] - top2[1]) < 0.1 and top2[0] > 0.2:
                res["contradictions"].append({
                    "type": "hypothesis_instability", "label": self.TYPES["hypothesis_instability"]["label"],
                    "explanation": self.TYPES["hypothesis_instability"]["tpl"],
                    "confidence_impact": -0.04, "severity": "mild",
                })

        res["contradiction_count"] = len(res["contradictions"])
        total = sum(abs(c.get("confidence_impact", 0)) for c in res["contradictions"])
        res["confidence_reduction"] = total
        res["overall_impact"] = "none" if res["contradiction_count"] == 0 else "minimal" if total < 0.15 else "moderate" if total < 0.3 else "significant"

        if any(c["type"] == "symptom_mismatch" for c in res["contradictions"]):
            res["resolution_suggestions"].append("Providing more symptom details may help clarify these patterns.")
        if any(c["type"] == "wearable_mismatch" for c in res["contradictions"]):
            res["resolution_suggestions"].append("Continued wearable monitoring will help establish reliable baselines.")
        if any(c["type"] == "temporal_inconsistency" for c in res["contradictions"]):
            res["resolution_suggestions"].append("Tracking symptoms over the next few days will help identify clearer trends.")

        if res["contradiction_count"] == 0:
            res["summary"] = "The current evidence is broadly consistent. No significant contradictions identified."
        else:
            n = res["contradiction_count"]
            res["summary"] = (f"The investigation has identified {n} area{'s' if n != 1 else ''} where evidence "
                              f"doesn't fully align. This is normal — continued monitoring will help resolve these patterns.")
        return res
