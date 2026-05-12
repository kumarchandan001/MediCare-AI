"""
health_intelligence/evidence_graph/contradiction_linker.py
──────────────────────────────────────────────────────────
Links detected contradictions to confidence penalties on the evidence graph.
"""

from typing import Any, Dict, List


class ContradictionLinker:

    def link(
        self,
        contradictions: List[Dict[str, Any]],
        hypotheses: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Create graph edges representing contradictory evidence."""
        edges: List[Dict[str, Any]] = []
        active_conditions = {h["condition"] for h in hypotheses}

        for c in contradictions:
            cond = c.get("condition", "")
            if cond in active_conditions:
                edges.append({
                    "source": f"contradiction_{len(edges)}",
                    "target": f"c_{cond.replace(' ', '_')}",
                    "type": "contradicts",
                    "reason": c.get("reason", ""),
                    "penalty": c.get("penalty", 0.1),
                })

        return edges
