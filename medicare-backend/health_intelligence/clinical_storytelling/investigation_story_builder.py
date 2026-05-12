"""
Investigation Story Builder — Calm Clinical Investigation Narratives

Generates high-level summaries of the ongoing investigation.
Language: calm, medically coherent, emotionally safe.
"""
import time


class InvestigationStoryBuilder:
    def build_story(self, hypotheses, observations, severity_data=None,
                    trajectory_data=None, contradiction_data=None, recovery_data=None):
        parts = []
        ts = time.time()

        # Opening
        n_obs = len(observations)
        parts.append(f"Based on {n_obs} clinical observation{'s' if n_obs != 1 else ''}, your investigation has been progressing thoughtfully.")

        # Leading hypothesis
        top = sorted(hypotheses, key=lambda h: h.get("confidence", 0), reverse=True)
        if top:
            cond = top[0].get("condition", "the primary concern")
            conf = round(top[0].get("confidence", 0) * 100)
            parts.append(f" {cond} is currently the leading area of investigation at approximately {conf}% confidence.")
            if len(top) > 1:
                alt = top[1].get("condition", "an alternative")
                alt_conf = round(top[1].get("confidence", 0) * 100)
                parts.append(f" {alt} is also being considered ({alt_conf}%).")

        # Trajectory
        if trajectory_data:
            traj = trajectory_data.get("trajectory", "stable")
            if traj == "improving":
                parts.append(" The overall clinical trajectory appears to be improving, which is encouraging.")
            elif traj == "stable":
                parts.append(" Your clinical picture has remained relatively stable.")
            elif traj == "fluctuating":
                parts.append(" Some fluctuation has been observed — this is being monitored carefully.")
            elif traj == "deteriorating":
                parts.append(" Some signals suggest closer attention may be needed. The AI is monitoring this thoughtfully.")

        # Recovery
        if recovery_data and recovery_data.get("is_recovering"):
            quality = round(recovery_data.get("recovery_quality", 0) * 100)
            parts.append(f" Recovery indicators show {quality}% quality — the healing process is being tracked.")

        # Severity
        if severity_data:
            level = severity_data.get("severity_level", "minimal")
            if level in ("moderate", "significant"):
                parts.append(f" The current severity level is {level}. Monitoring continues at an appropriate pace.")
            elif level in ("severe", "critical"):
                parts.append(f" The severity level is {level}. Professional consultation is encouraged.")

        # Contradictions
        if contradiction_data and contradiction_data.get("contradiction_count", 0) > 0:
            n = contradiction_data["contradiction_count"]
            parts.append(f" {n} area{'s' if n != 1 else ''} of conflicting evidence {'are' if n != 1 else 'is'} being evaluated — a normal part of thorough clinical reasoning.")

        # Closing
        parts.append(" The investigation continues to evolve with your ongoing input.")

        return {
            "generated_at": ts,
            "narrative": "".join(parts),
            "tone": "calm",
            "detail_level": "summary",
        }
