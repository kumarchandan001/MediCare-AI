"""
Reasoning Transition Tracker — Hypothesis Shift Tracking

Tracks changes in reasoning branches across sessions.
"""
import time


class ReasoningTransitionTracker:
    def __init__(self):
        self._transitions = []

    def record_transition(self, previous_hypotheses, current_hypotheses, trigger="new_evidence"):
        prev_map = {h.get("condition", ""): h.get("confidence", 0) for h in previous_hypotheses}
        curr_map = {h.get("condition", ""): h.get("confidence", 0) for h in current_hypotheses}

        transition = {"timestamp": time.time(), "trigger": trigger, "shifts": [], "new_hypotheses": [], "dropped": []}

        for cond, curr_conf in curr_map.items():
            prev_conf = prev_map.get(cond)
            if prev_conf is None:
                transition["new_hypotheses"].append({"condition": cond, "confidence": round(curr_conf, 3)})
            elif abs(curr_conf - prev_conf) > 0.03:
                transition["shifts"].append({
                    "condition": cond, "previous": round(prev_conf, 3),
                    "current": round(curr_conf, 3), "delta": round(curr_conf - prev_conf, 3),
                })

        for cond in prev_map:
            if cond not in curr_map:
                transition["dropped"].append({"condition": cond, "last_confidence": round(prev_map[cond], 3)})

        self._transitions.append(transition)
        if len(self._transitions) > 30:
            self._transitions = self._transitions[-30:]

        return transition

    def get_transition_history(self):
        return {
            "transitions": self._transitions[-10:],
            "total_transitions": len(self._transitions),
            "summary": f"{len(self._transitions)} reasoning transitions recorded.",
        }
