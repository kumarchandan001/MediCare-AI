"""
Reasoning Stability Tracker — State Classification

Tracks reasoning stability states:
  stable, adjusting, unstable, rapidly_shifting, high_ambiguity
Helps users understand when the AI is confident vs. still evolving.
"""
import time


class ReasoningStabilityTracker:
    def __init__(self):
        self._history = []

    def record_state(self, hypotheses, contradiction_count=0, evidence_sufficiency=0.5):
        snapshot = {
            "timestamp": time.time(),
            "confidences": {h.get("condition", f"h{i}"): h.get("confidence", 0) for i, h in enumerate(hypotheses)},
            "contradiction_count": contradiction_count,
            "evidence_sufficiency": evidence_sufficiency,
        }
        self._history.append(snapshot)
        if len(self._history) > 50:
            self._history = self._history[-50:]

    def get_stability_state(self):
        res = {"state": "stable", "stability_score": 1.0, "volatility": 0.0,
               "trend": "converging", "explanation": "", "history_depth": len(self._history)}

        if len(self._history) < 2:
            res["explanation"] = "The investigation is just beginning. Stability will be assessed as more data arrives."
            return res

        recent = self._history[-5:]
        all_conditions = set()
        for s in recent:
            all_conditions.update(s["confidences"].keys())

        # Calculate per-condition volatility
        volatilities = []
        for cond in all_conditions:
            vals = [s["confidences"].get(cond, 0) for s in recent]
            if len(vals) >= 2:
                diffs = [abs(vals[i] - vals[i - 1]) for i in range(1, len(vals))]
                volatilities.append(sum(diffs) / len(diffs))

        avg_vol = sum(volatilities) / len(volatilities) if volatilities else 0

        # Contradiction pressure
        c_counts = [s["contradiction_count"] for s in recent]
        avg_contradictions = sum(c_counts) / len(c_counts)

        # Evidence growth
        suf_vals = [s["evidence_sufficiency"] for s in recent]
        suf_trend = suf_vals[-1] - suf_vals[0] if len(suf_vals) >= 2 else 0

        # Classify state
        res["volatility"] = round(avg_vol, 3)

        if avg_vol < 0.05 and avg_contradictions < 1:
            res["state"] = "stable"
            res["stability_score"] = min(1.0, 0.9 + suf_trend)
            res["trend"] = "converging"
            res["explanation"] = "Reasoning is stable and converging. The AI is growing more confident in its assessment."
        elif avg_vol < 0.12:
            res["state"] = "adjusting"
            res["stability_score"] = max(0.5, 0.7 - avg_vol * 2)
            res["trend"] = "refining" if suf_trend > 0 else "evolving"
            res["explanation"] = "Reasoning is adjusting as new evidence is considered. This is a normal refinement process."
        elif avg_vol < 0.25:
            res["state"] = "unstable"
            res["stability_score"] = max(0.25, 0.5 - avg_vol)
            res["trend"] = "volatile"
            res["explanation"] = "Reasoning is currently unstable as the clinical picture evolves. More observations will help stabilize the assessment."
        else:
            res["state"] = "rapidly_shifting"
            res["stability_score"] = max(0.05, 0.3 - avg_vol)
            res["trend"] = "diverging"
            res["explanation"] = "Hypotheses are shifting rapidly. The evidence picture is complex. The AI is actively working to narrow possibilities."

        if avg_contradictions > 2 and res["state"] not in ("rapidly_shifting",):
            res["state"] = "high_ambiguity"
            res["stability_score"] = min(res["stability_score"], 0.35)
            res["explanation"] = "Multiple contradictory signals are present. The investigation is in a high-ambiguity state — this is expected for complex cases."

        res["stability_score"] = round(res["stability_score"], 3)
        return res
