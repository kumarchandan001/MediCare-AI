"""
Cognitive Load Balancer — Manages Information Density

Ensures the user is never overwhelmed with too much clinical detail.
Controls:
- Max items shown per section
- Detail level appropriateness
- Information chunking for mobile
"""
import time


class CognitiveLoadBalancer:
    LIMITS = {
        "max_hypotheses_shown": 4,
        "max_evidence_items": 6,
        "max_contradictions": 3,
        "max_decisions": 4,
        "max_graph_nodes": 10,
        "max_graph_edges": 8,
        "max_narrative_chars": 500,
        "max_trust_indicators": 5,
    }

    def balance_output(self, output_data: dict) -> dict:
        balanced = {}
        trimmed = []

        # Hypotheses
        hyps = output_data.get("hypotheses", [])
        if len(hyps) > self.LIMITS["max_hypotheses_shown"]:
            balanced["hypotheses"] = hyps[:self.LIMITS["max_hypotheses_shown"]]
            trimmed.append(f"hypotheses: {len(hyps)} -> {self.LIMITS['max_hypotheses_shown']}")
        else:
            balanced["hypotheses"] = hyps

        # Evidence
        for key in ("strong_evidence", "weak_evidence", "missing_evidence", "conflicting_evidence"):
            items = output_data.get(key, [])
            if len(items) > self.LIMITS["max_evidence_items"]:
                balanced[key] = items[:self.LIMITS["max_evidence_items"]]
                trimmed.append(f"{key}: {len(items)} -> {self.LIMITS['max_evidence_items']}")
            else:
                balanced[key] = items

        # Contradictions
        contras = output_data.get("contradictions", [])
        if len(contras) > self.LIMITS["max_contradictions"]:
            balanced["contradictions"] = contras[:self.LIMITS["max_contradictions"]]
            trimmed.append(f"contradictions: {len(contras)} -> {self.LIMITS['max_contradictions']}")
        else:
            balanced["contradictions"] = contras

        # Narrative
        narrative = output_data.get("narrative", "")
        if len(narrative) > self.LIMITS["max_narrative_chars"]:
            balanced["narrative"] = narrative[:self.LIMITS["max_narrative_chars"]] + "..."
            trimmed.append("narrative truncated for readability")
        else:
            balanced["narrative"] = narrative

        # Graph
        nodes = output_data.get("nodes", [])
        if len(nodes) > self.LIMITS["max_graph_nodes"]:
            balanced["nodes"] = nodes[:self.LIMITS["max_graph_nodes"]]
            trimmed.append(f"graph nodes: {len(nodes)} -> {self.LIMITS['max_graph_nodes']}")
        else:
            balanced["nodes"] = nodes

        load_score = self._calculate_load(output_data)

        return {
            "generated_at": time.time(),
            "balanced_data": balanced,
            "trimmed_items": trimmed,
            "cognitive_load_score": load_score,
            "is_balanced": load_score < 0.7,
            "summary": (f"Cognitive load: {load_score:.0%}. "
                        + (f"{len(trimmed)} section(s) trimmed for clarity." if trimmed
                           else "Information density is manageable.")),
        }

    def _calculate_load(self, data: dict) -> float:
        score = 0.0
        score += min(0.2, len(data.get("hypotheses", [])) * 0.04)
        score += min(0.15, len(data.get("contradictions", [])) * 0.05)
        score += min(0.15, len(data.get("strong_evidence", [])) * 0.025)
        score += min(0.1, len(data.get("nodes", [])) * 0.01)
        score += min(0.1, len(data.get("narrative", "")) / 1000)
        return min(1.0, round(score, 3))
