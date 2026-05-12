"""
health_intelligence/differential_reasoning/investigation_strategy_engine.py
───────────────────────────────────────────────────────────────────────────
Guides the clinical interview strategically by suggesting the next
question type based on the current differential reasoning state.

Strategies:
  • hypothesis_targeted   — confirm/deny the leading hypothesis
  • ambiguity_targeted    — resolve the largest ambiguity dimension
  • escalation_targeted   — investigate high-severity red flags
  • exclusion_targeted    — rule out a dangerous condition
"""

from typing import Any, Dict, List


class InvestigationStrategyEngine:

    def suggest_next_question(
        self,
        hypotheses: List[Dict[str, Any]],
        weighted_evidence: Dict[str, Any],
        ambiguity: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Determine the optimal next question strategy."""
        if not hypotheses:
            return {"strategy": "general_intake", "reason": "No hypotheses yet.", "target": None}

        # Priority 1: Escalation-targeted (dangerous conditions with moderate+ probability)
        for h in hypotheses:
            if h.get("severity_priority", 1.0) >= 2.0 and h["confidence"] > 0.15:
                return {
                    "strategy": "escalation_targeted",
                    "reason": f"{h['condition']} is a high-severity concern that needs urgent clarification.",
                    "target": h["condition"],
                }

        # Priority 2: Ambiguity-targeted (high overall ambiguity)
        overall_ambiguity = ambiguity.get("overall", 0)
        if overall_ambiguity > 0.5:
            dims = ambiguity.get("dimensions", {})
            worst_dim = max(dims, key=dims.get) if dims else "evidence_insufficiency"
            return {
                "strategy": "ambiguity_targeted",
                "reason": f"High uncertainty in {worst_dim.replace('_', ' ')} — more information needed.",
                "target": worst_dim,
            }

        # Priority 3: Exclusion-targeted (closely competing conditions)
        if len(hypotheses) >= 2:
            gap = hypotheses[0]["confidence"] - hypotheses[1]["confidence"]
            if gap < 0.08:
                return {
                    "strategy": "exclusion_targeted",
                    "reason": f"{hypotheses[0]['condition']} and {hypotheses[1]['condition']} are closely competing — a distinguishing question can help separate them.",
                    "target": hypotheses[1]["condition"],
                }

        # Priority 4: Hypothesis-targeted (strengthen leading hypothesis)
        return {
            "strategy": "hypothesis_targeted",
            "reason": f"Gathering more evidence to confirm or weaken {hypotheses[0]['condition']}.",
            "target": hypotheses[0]["condition"],
        }
