"""
Confidence Shift Explainer — Confidence Stability & Shift Tracking

Explains why hypothesis confidence changed and whether reasoning is stable.
"""
import time


class ConfidenceShiftExplainer:
    def explain_shifts(self, hypotheses, previous_hypotheses=None):
        res = {"generated_at": time.time(), "shifts": [], "stability": "stable",
               "stability_score": 1.0, "summary": ""}

        prev_map = {}
        if previous_hypotheses:
            prev_map = {h.get("condition", ""): h.get("confidence", 0) for h in previous_hypotheses}

        total_delta = 0.0
        for hyp in hypotheses:
            cond = hyp.get("condition", "unknown")
            curr = hyp.get("confidence", 0)
            prev = prev_map.get(cond, hyp.get("previous_confidence", curr))
            delta = curr - prev

            if abs(delta) > 0.03:
                direction = "increased" if delta > 0 else "decreased"
                magnitude = "slightly" if abs(delta) < 0.1 else "moderately" if abs(delta) < 0.25 else "significantly"

                if delta > 0:
                    reason = "supporting evidence has accumulated"
                else:
                    reason = "some expected indicators were not observed"

                res["shifts"].append({
                    "condition": cond, "previous": round(prev * 100), "current": round(curr * 100),
                    "delta": round(delta * 100), "direction": direction, "magnitude": magnitude,
                    "explanation": f"Confidence in {cond} has {magnitude} {direction} ({round(delta * 100):+d}%) because {reason}.",
                })
                total_delta += abs(delta)

        # Stability assessment
        n_shifts = len(res["shifts"])
        large_shifts = sum(1 for s in res["shifts"] if abs(s["delta"]) > 15)

        if n_shifts == 0:
            res["stability"] = "stable"
            res["stability_score"] = 1.0
        elif large_shifts == 0 and n_shifts <= 2:
            res["stability"] = "stable"
            res["stability_score"] = max(0.7, 1.0 - total_delta)
        elif large_shifts <= 1:
            res["stability"] = "adjusting"
            res["stability_score"] = max(0.4, 0.7 - total_delta * 0.5)
        elif large_shifts <= 3:
            res["stability"] = "unstable"
            res["stability_score"] = max(0.2, 0.4 - total_delta * 0.3)
        else:
            res["stability"] = "rapidly_shifting"
            res["stability_score"] = max(0.05, 0.2 - total_delta * 0.2)

        # Summary
        if res["stability"] == "stable":
            res["summary"] = "Reasoning confidence is stable. The investigation is converging on a clearer picture."
        elif res["stability"] == "adjusting":
            res["summary"] = "Some confidence adjustments have occurred. This is typical as new evidence is considered."
        elif res["stability"] == "unstable":
            res["summary"] = "Reasoning confidence is currently unstable as the evidence picture evolves. Additional observation will help."
        else:
            res["summary"] = "Hypotheses are shifting rapidly. The clinical picture is complex and the AI is actively reassessing."

        return res
