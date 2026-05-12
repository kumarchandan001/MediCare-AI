"""
Longitudinal Story Engine — Cross-Session Health Narratives

Generates narratives that naturally connect sessions, making the AI feel
longitudinally aware. Example output:
"Compared to your prior investigation, fatigue patterns appear more stable
while respiratory concerns have reduced."
"""
import time


class LongitudinalStoryEngine:
    def __init__(self):
        self._session_snapshots = []

    def record_session(self, hypotheses, observations, severity_level="minimal", trajectory="stable"):
        self._session_snapshots.append({
            "timestamp": time.time(),
            "top_conditions": [h.get("condition", "") for h in sorted(hypotheses, key=lambda h: h.get("confidence", 0), reverse=True)[:3]],
            "confidences": {h.get("condition", ""): h.get("confidence", 0) for h in hypotheses},
            "symptom_count": len(observations),
            "symptoms": [o.get("symptom", "") for o in observations],
            "severity": severity_level,
            "trajectory": trajectory,
        })
        if len(self._session_snapshots) > 20:
            self._session_snapshots = self._session_snapshots[-20:]

    def generate_longitudinal_narrative(self):
        if len(self._session_snapshots) < 2:
            return {
                "generated_at": time.time(),
                "narrative": "This is the beginning of your clinical investigation. As the journey continues, longitudinal insights will emerge.",
                "sessions_analyzed": len(self._session_snapshots),
                "continuity_score": 0.0,
            }

        prev = self._session_snapshots[-2]
        curr = self._session_snapshots[-1]
        parts = []

        # Compare trajectories
        if prev["trajectory"] != curr["trajectory"]:
            parts.append(f"Compared to the previous assessment, your trajectory has shifted from {prev['trajectory']} to {curr['trajectory']}.")
        elif curr["trajectory"] == "stable":
            parts.append("Your clinical state has continued to remain stable since the last assessment.")
        elif curr["trajectory"] == "improving":
            parts.append("The improving trend observed previously continues — this is encouraging.")

        # Compare severity
        sev_order = ["minimal", "mild", "moderate", "significant", "severe", "critical"]
        prev_idx = sev_order.index(prev["severity"]) if prev["severity"] in sev_order else 0
        curr_idx = sev_order.index(curr["severity"]) if curr["severity"] in sev_order else 0
        if curr_idx < prev_idx:
            parts.append(f" Severity has improved from {prev['severity']} to {curr['severity']}.")
        elif curr_idx > prev_idx:
            parts.append(f" Severity has increased to {curr['severity']}. Closer attention is being maintained.")

        # Compare symptoms
        prev_set = set(prev["symptoms"])
        curr_set = set(curr["symptoms"])
        resolved = prev_set - curr_set
        new_syms = curr_set - prev_set
        persistent = prev_set & curr_set

        if resolved:
            parts.append(f" {', '.join(s.replace('_', ' ') for s in list(resolved)[:3])} appear{'s' if len(resolved) == 1 else ''} to have resolved.")
        if new_syms:
            parts.append(f" New observations include {', '.join(s.replace('_', ' ') for s in list(new_syms)[:3])}.")
        if persistent:
            parts.append(f" {', '.join(s.replace('_', ' ') for s in list(persistent)[:3])} {'remains' if len(persistent) == 1 else 'remain'} present and {'is' if len(persistent) == 1 else 'are'} being monitored.")

        # Compare leading hypotheses
        prev_top = prev["top_conditions"][0] if prev["top_conditions"] else None
        curr_top = curr["top_conditions"][0] if curr["top_conditions"] else None
        if prev_top and curr_top:
            if prev_top == curr_top:
                prev_conf = round(prev["confidences"].get(curr_top, 0) * 100)
                curr_conf = round(curr["confidences"].get(curr_top, 0) * 100)
                if curr_conf > prev_conf:
                    parts.append(f" Confidence in {curr_top} has grown from {prev_conf}% to {curr_conf}%.")
                elif curr_conf < prev_conf:
                    parts.append(f" Confidence in {curr_top} has adjusted from {prev_conf}% to {curr_conf}%.")
            else:
                parts.append(f" The primary focus has shifted from {prev_top} to {curr_top}.")

        # Continuity scoring
        continuity = 0.0
        if persistent:
            continuity += 0.3
        if prev_top == curr_top:
            continuity += 0.4
        if prev["trajectory"] == curr["trajectory"]:
            continuity += 0.3
        continuity = min(1.0, continuity)

        return {
            "generated_at": time.time(),
            "narrative": " ".join(parts) if parts else "The investigation continues building context.",
            "sessions_analyzed": len(self._session_snapshots),
            "continuity_score": round(continuity, 2),
        }
