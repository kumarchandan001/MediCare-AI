"""
Uncertainty Explainer — Calm Ambiguity Normalization

Explains uncertainty as a normal part of clinical investigation.
Never presents uncertainty as system failure.
"""
import time


class UncertaintyExplainer:
    MESSAGES = {
        "overlapping": "Multiple conditions share similar symptom profiles — ongoing observation will help distinguish them.",
        "insufficient": "More information is needed for a clearer picture. This is common in early-stage investigations.",
        "unstable": "The clinical picture has been changing, making conclusions less certain. Continued monitoring is the best approach.",
        "wearable": "Wearable data is showing some variability, which adds uncertainty. The AI is weighing this data cautiously.",
        "temporal": "The progression pattern hasn't fully stabilized, so confidence levels are still evolving.",
    }

    def explain_uncertainty(self, hypotheses, evidence_sufficiency=0.5,
                            wearable_trust=0.5, trajectory_stability=0.5):
        res = {"generated_at": time.time(), "uncertainty_level": "low", "uncertainty_score": 0.0,
               "sources": [], "normalization_message": "", "summary": ""}

        score = 0.0

        # Overlapping conditions
        confs = sorted([h.get("confidence", 0) for h in hypotheses], reverse=True)
        if len(confs) >= 2 and abs(confs[0] - confs[1]) < 0.15:
            score += 0.25
            res["sources"].append({"type": "overlapping", "explanation": self.MESSAGES["overlapping"],
                                   "impact": 0.25})

        # Insufficient evidence
        if evidence_sufficiency < 0.5:
            impact = 0.3 * (1 - evidence_sufficiency)
            score += impact
            res["sources"].append({"type": "insufficient", "explanation": self.MESSAGES["insufficient"],
                                   "impact": round(impact, 3)})

        # Unstable trajectory
        if trajectory_stability < 0.5:
            impact = 0.2 * (1 - trajectory_stability)
            score += impact
            res["sources"].append({"type": "unstable", "explanation": self.MESSAGES["unstable"],
                                   "impact": round(impact, 3)})

        # Wearable uncertainty
        if wearable_trust < 0.5:
            impact = 0.15 * (1 - wearable_trust)
            score += impact
            res["sources"].append({"type": "wearable", "explanation": self.MESSAGES["wearable"],
                                   "impact": round(impact, 3)})

        # Low top confidence
        if confs and confs[0] < 0.4:
            impact = 0.2 * (1 - confs[0])
            score += impact
            res["sources"].append({"type": "temporal", "explanation": self.MESSAGES["temporal"],
                                   "impact": round(impact, 3)})

        res["uncertainty_score"] = min(1.0, round(score, 3))
        res["uncertainty_level"] = ("low" if score < 0.2 else "moderate" if score < 0.45
                                    else "elevated" if score < 0.7 else "high")

        res["normalization_message"] = self._normalize(res["uncertainty_level"])
        res["summary"] = self._summarize(res)
        return res

    def _normalize(self, level):
        msgs = {
            "low": "The investigation has gathered sufficient evidence for reasonable confidence.",
            "moderate": "Some uncertainty remains, which is typical at this stage. The investigation continues.",
            "elevated": "There's meaningful uncertainty in the current assessment. Additional information or monitoring will help.",
            "high": "The clinical picture remains quite uncertain. This is not unusual for complex cases — continued observation is important.",
        }
        return msgs.get(level, msgs["moderate"])

    def _summarize(self, res):
        n = len(res["sources"])
        if n == 0:
            return "Uncertainty levels are low. The investigation has good evidence to work with."
        parts = [f"{n} source{'s' if n != 1 else ''} of uncertainty {'have' if n != 1 else 'has'} been identified."]
        parts.append(f" Overall uncertainty is {res['uncertainty_level']}.")
        parts.append(f" {res['normalization_message']}")
        return " ".join(parts)
