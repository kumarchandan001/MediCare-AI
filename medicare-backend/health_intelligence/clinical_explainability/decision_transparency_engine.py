"""
Decision Transparency Engine — Action Priority Explainability

Explains why the AI prioritized certain actions: escalation, monitoring, follow-up.
Uses emotionally safe, non-alarming language.
"""
import time


class DecisionTransparencyEngine:
    TEMPLATES = {
        "escalation_increased": "Escalation priority increased because {reason}. This suggests closer attention may be helpful.",
        "monitoring_recommended": "Continued monitoring is recommended because {reason}. This is a proactive, not urgent, step.",
        "severity_changed": "Severity assessment shifted because {reason}.",
        "follow_up_triggered": "A follow-up check-in is suggested because {reason}.",
        "hypothesis_weakened": "{condition} has become less likely because {reason}.",
        "hypothesis_strengthened": "{condition} has become more likely because {reason}.",
    }

    def explain_decisions(self, hypotheses, severity_data=None, escalation_data=None,
                          trajectory_data=None, follow_up_data=None):
        res = {"generated_at": time.time(), "decisions": [], "priority_focus": "", "summary": ""}

        # Severity change
        if severity_data:
            level = severity_data.get("severity_level", "minimal")
            if level in ("moderate", "significant", "severe", "critical"):
                score = severity_data.get("severity_score", 0)
                res["decisions"].append({
                    "type": "severity_changed",
                    "explanation": self.TEMPLATES["severity_changed"].format(
                        reason=f"your overall clinical picture is currently assessed as {level} ({round(score * 100)}% severity)"),
                    "priority": "high" if level in ("severe", "critical") else "moderate",
                    "action": f"Severity is {level}",
                })

        # Escalation
        if escalation_data:
            likelihood = escalation_data.get("escalation_likelihood", 0)
            if likelihood > 0.15:
                reason = escalation_data.get("explanation", "evolving clinical signals suggest caution")
                res["decisions"].append({
                    "type": "escalation_increased",
                    "explanation": self.TEMPLATES["escalation_increased"].format(reason=reason),
                    "priority": "high" if likelihood > 0.5 else "moderate",
                    "action": f"Escalation likelihood: {round(likelihood * 100)}%",
                })

        # Follow-up
        if follow_up_data:
            hours = follow_up_data.get("follow_up_hours", 24)
            reason = follow_up_data.get("reason", "ongoing monitoring is beneficial")
            res["decisions"].append({
                "type": "follow_up_triggered",
                "explanation": self.TEMPLATES["follow_up_triggered"].format(reason=reason),
                "priority": "moderate" if hours < 12 else "low",
                "action": f"Follow-up in ~{hours}h",
            })

        # Hypothesis shifts
        for hyp in sorted(hypotheses, key=lambda h: h.get("confidence", 0), reverse=True)[:3]:
            cond = hyp.get("condition", "unknown")
            conf = hyp.get("confidence", 0)
            prev = hyp.get("previous_confidence", conf)
            delta = conf - prev

            if abs(delta) > 0.05:
                if delta > 0:
                    res["decisions"].append({
                        "type": "hypothesis_strengthened",
                        "explanation": self.TEMPLATES["hypothesis_strengthened"].format(
                            condition=cond, reason=f"additional supporting evidence has been gathered"),
                        "priority": "moderate", "action": f"{cond}: +{round(delta * 100)}%",
                    })
                else:
                    res["decisions"].append({
                        "type": "hypothesis_weakened",
                        "explanation": self.TEMPLATES["hypothesis_weakened"].format(
                            condition=cond, reason=f"some expected evidence was not observed"),
                        "priority": "low", "action": f"{cond}: {round(delta * 100)}%",
                    })

        # Monitoring
        if trajectory_data and trajectory_data.get("trajectory") in ("fluctuating", "deteriorating"):
            res["decisions"].append({
                "type": "monitoring_recommended",
                "explanation": self.TEMPLATES["monitoring_recommended"].format(
                    reason=f"the clinical trajectory appears {trajectory_data['trajectory']}"),
                "priority": "moderate", "action": "Continue monitoring",
            })

        # Priority focus
        if res["decisions"]:
            high = [d for d in res["decisions"] if d["priority"] == "high"]
            res["priority_focus"] = high[0]["action"] if high else res["decisions"][0]["action"]

        # Summary
        n = len(res["decisions"])
        if n == 0:
            res["summary"] = "No significant decision changes at this time. The investigation continues at a steady pace."
        else:
            res["summary"] = f"The AI has made {n} reasoning adjustment{'s' if n != 1 else ''} based on the latest evidence."
        return res
