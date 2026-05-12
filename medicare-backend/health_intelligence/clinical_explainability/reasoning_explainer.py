"""
Reasoning Explainer — Layered Clinical Reasoning Chain Generator

Explains the step-by-step clinical reasoning process at three depth levels:
- simple: Calm narrative summary (default for most users)
- intermediate: Key evidence links and hypothesis rationale
- advanced: Full causal chain with temporal and wearable influence

Safety: All explanations use probabilistic, non-diagnostic language.
"""
import time
from typing import Any


class ReasoningExplainer:
    """Generates layered reasoning chain explanations."""

    # ── Calm language templates ──────────────────────────────
    OBSERVATION_TEMPLATES = [
        "You reported {symptom}, which is being considered as part of the investigation.",
        "The presence of {symptom} has been noted and is being evaluated.",
        "{symptom} has been observed and is contributing to the clinical picture.",
    ]

    INFERENCE_TEMPLATES = [
        "This symptom pattern may be associated with {condition}.",
        "Based on the evidence gathered, {condition} remains a possibility worth monitoring.",
        "The combination of symptoms suggests {condition} could be a contributing factor.",
    ]

    HYPOTHESIS_TEMPLATES = [
        "{condition} is currently being investigated with {confidence}% investigative confidence.",
        "The working hypothesis includes {condition} at approximately {confidence}% likelihood.",
    ]

    ESCALATION_TEMPLATES = {
        "calm": "Monitoring continues at a routine pace. No immediate concerns have emerged.",
        "watchful": "Some signals suggest closer attention may be helpful. This is a normal part of thorough investigation.",
        "elevated": "The investigation has identified patterns that warrant timely medical consultation.",
        "urgent": "Based on the evolving evidence, prompt professional evaluation is recommended.",
    }

    def generate_reasoning_chain(
        self,
        observations: list[dict],
        hypotheses: list[dict],
        severity_level: str = "minimal",
        escalation_state: str = "calm",
        wearable_influence: dict | None = None,
        temporal_context: dict | None = None,
        detail_level: str = "simple",
    ) -> dict:
        """
        Generate a complete reasoning chain explanation.

        Args:
            observations: List of {symptom, severity, duration, source}
            hypotheses: List of {condition, confidence, evidence_for, evidence_against}
            severity_level: Current severity classification
            escalation_state: Current escalation state
            wearable_influence: Optional wearable data context
            temporal_context: Optional progression/trajectory context
            detail_level: "simple" | "intermediate" | "advanced"
        """
        chain = {
            "detail_level": detail_level,
            "generated_at": time.time(),
            "steps": [],
            "summary": "",
            "escalation_explanation": "",
        }

        # ── Step 1: Observations ──────────────────────────
        obs_step = self._build_observation_step(observations, detail_level)
        chain["steps"].append(obs_step)

        # ── Step 2: Inferences ────────────────────────────
        inf_step = self._build_inference_step(observations, hypotheses, detail_level)
        chain["steps"].append(inf_step)

        # ── Step 3: Hypotheses ────────────────────────────
        hyp_step = self._build_hypothesis_step(hypotheses, detail_level)
        chain["steps"].append(hyp_step)

        # ── Step 4: Wearable influence (if relevant) ──────
        if wearable_influence and detail_level in ("intermediate", "advanced"):
            wear_step = self._build_wearable_step(wearable_influence, detail_level)
            chain["steps"].append(wear_step)

        # ── Step 5: Temporal influence (advanced only) ────
        if temporal_context and detail_level == "advanced":
            temp_step = self._build_temporal_step(temporal_context)
            chain["steps"].append(temp_step)

        # ── Step 6: Severity & Escalation ─────────────────
        esc_step = self._build_escalation_step(severity_level, escalation_state, detail_level)
        chain["steps"].append(esc_step)

        # ── Compose summary ──────────────────────────────
        chain["summary"] = self._compose_summary(observations, hypotheses, severity_level, escalation_state)
        chain["escalation_explanation"] = self.ESCALATION_TEMPLATES.get(escalation_state, self.ESCALATION_TEMPLATES["calm"])

        return chain

    def _build_observation_step(self, observations: list[dict], detail_level: str) -> dict:
        step = {
            "type": "observation",
            "title": "What was observed",
            "items": [],
        }
        for obs in observations[:8]:  # Cap for cognitive load
            symptom = obs.get("symptom", "unknown").replace("_", " ")
            template_idx = hash(symptom) % len(self.OBSERVATION_TEMPLATES)
            text = self.OBSERVATION_TEMPLATES[template_idx].format(symptom=symptom)

            item = {"text": text, "symptom": symptom}
            if detail_level in ("intermediate", "advanced"):
                item["severity"] = obs.get("severity", 0)
                item["duration"] = obs.get("duration", "unknown")
                item["source"] = obs.get("source", "self-reported")
            step["items"].append(item)
        return step

    def _build_inference_step(self, observations: list[dict], hypotheses: list[dict], detail_level: str) -> dict:
        step = {
            "type": "inference",
            "title": "What patterns emerged",
            "items": [],
        }
        symptoms = [o.get("symptom", "").replace("_", " ") for o in observations]
        for hyp in hypotheses[:5]:
            condition = hyp.get("condition", "unknown")
            evidence_for = hyp.get("evidence_for", [])
            matching = [s for s in symptoms if s in [e.replace("_", " ") for e in evidence_for]]

            if matching:
                text = f"The combination of {', '.join(matching[:3])} may be associated with {condition}."
            else:
                template_idx = hash(condition) % len(self.INFERENCE_TEMPLATES)
                text = self.INFERENCE_TEMPLATES[template_idx].format(condition=condition)

            item = {"text": text, "condition": condition}
            if detail_level == "advanced":
                item["supporting_evidence"] = evidence_for[:5]
                item["conflicting_evidence"] = hyp.get("evidence_against", [])[:3]
            step["items"].append(item)
        return step

    def _build_hypothesis_step(self, hypotheses: list[dict], detail_level: str) -> dict:
        step = {
            "type": "hypothesis",
            "title": "Current working hypotheses",
            "items": [],
        }
        for hyp in sorted(hypotheses, key=lambda h: h.get("confidence", 0), reverse=True)[:5]:
            condition = hyp.get("condition", "unknown")
            conf = round(hyp.get("confidence", 0) * 100)
            template_idx = hash(condition) % len(self.HYPOTHESIS_TEMPLATES)
            text = self.HYPOTHESIS_TEMPLATES[template_idx].format(condition=condition, confidence=conf)

            item = {"text": text, "condition": condition, "confidence": conf}
            if detail_level in ("intermediate", "advanced"):
                item["evidence_strength"] = "strong" if conf > 60 else "moderate" if conf > 30 else "emerging"
            if detail_level == "advanced":
                item["evidence_for"] = hyp.get("evidence_for", [])[:5]
                item["evidence_against"] = hyp.get("evidence_against", [])[:3]
            step["items"].append(item)
        return step

    def _build_wearable_step(self, wearable_influence: dict, detail_level: str) -> dict:
        trust = wearable_influence.get("trust_score", 0.5)
        influence = wearable_influence.get("influence_description", "Wearable data is being considered.")

        reliability = "reliable" if trust > 0.7 else "moderately reliable" if trust > 0.4 else "uncertain"
        text = f"Wearable data (currently {reliability}) {influence}"

        step = {
            "type": "wearable_influence",
            "title": "Wearable data context",
            "items": [{"text": text, "trust_score": trust, "reliability": reliability}],
        }
        if detail_level == "advanced":
            step["items"][0]["anomalies"] = wearable_influence.get("anomalies_detected", 0)
        return step

    def _build_temporal_step(self, temporal_context: dict) -> dict:
        trajectory = temporal_context.get("trajectory", "stable")
        stability = temporal_context.get("stability_score", 0.5)

        text = f"Over the course of this investigation, the clinical trajectory appears {trajectory} with {round(stability * 100)}% stability."

        return {
            "type": "temporal_influence",
            "title": "How reasoning evolved over time",
            "items": [{"text": text, "trajectory": trajectory, "stability": stability}],
        }

    def _build_escalation_step(self, severity_level: str, escalation_state: str, detail_level: str) -> dict:
        esc_text = self.ESCALATION_TEMPLATES.get(escalation_state, self.ESCALATION_TEMPLATES["calm"])

        step = {
            "type": "escalation",
            "title": "Current recommendation",
            "items": [{"text": esc_text, "severity_level": severity_level, "escalation_state": escalation_state}],
        }
        if detail_level in ("intermediate", "advanced"):
            step["items"][0]["severity_context"] = f"Clinical severity is currently assessed as {severity_level}."
        return step

    def _compose_summary(self, observations: list[dict], hypotheses: list[dict], severity_level: str, escalation_state: str) -> str:
        symptom_count = len(observations)
        top_hyp = sorted(hypotheses, key=lambda h: h.get("confidence", 0), reverse=True)
        top_name = top_hyp[0].get("condition", "the primary concern") if top_hyp else "the clinical picture"
        top_conf = round(top_hyp[0].get("confidence", 0) * 100) if top_hyp else 0

        parts = [f"Based on {symptom_count} reported observation{'s' if symptom_count != 1 else ''},"]
        parts.append(f" {top_name} is the leading area of investigation at approximately {top_conf}% confidence.")

        if severity_level in ("moderate", "significant", "severe", "critical"):
            parts.append(f" The current severity level is {severity_level}, and closer monitoring is being maintained.")
        else:
            parts.append(f" The overall clinical picture remains {severity_level}.")

        if escalation_state in ("elevated", "urgent"):
            parts.append(" Professional consultation is recommended at this time.")
        else:
            parts.append(" The investigation continues to evolve with your ongoing input.")

        return "".join(parts)
