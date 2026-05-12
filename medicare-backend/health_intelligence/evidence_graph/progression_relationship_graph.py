"""
progression_relationship_graph.py
─────────────────────────────────
Visualises escalation and recovery pathways as a directed graph.

Responsibilities:
  - Build nodes for clinical states at each time step
  - Create edges representing escalation or recovery transitions
  - Provide a structured graph for frontend rendering
"""

from typing import Any, Dict, List


class ProgressionRelationshipGraph:

    def build_graph(
        self,
        trajectory_snapshots: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build a progression graph from a series of trajectory snapshots."""
        if len(trajectory_snapshots) < 2:
            return {"nodes": [], "edges": [], "pathways": []}

        nodes = []
        edges = []
        pathways = []

        for i, snap in enumerate(trajectory_snapshots):
            node_id = f"state_{i}"
            nodes.append({
                "id": node_id,
                "type": "clinical_state",
                "severity": snap.get("severity", 0),
                "trajectory": snap.get("trajectory", "unknown"),
                "label": f"Step {i + 1}",
            })

            if i > 0:
                prev_sev = trajectory_snapshots[i - 1].get("severity", 0)
                curr_sev = snap.get("severity", 0)
                delta = curr_sev - prev_sev

                if delta > 0.05:
                    edge_type = "escalation"
                elif delta < -0.05:
                    edge_type = "recovery"
                else:
                    edge_type = "stable"

                edges.append({
                    "source": f"state_{i - 1}",
                    "target": node_id,
                    "type": edge_type,
                    "delta": round(delta, 3),
                })
                pathways.append(edge_type)

        return {
            "nodes": nodes,
            "edges": edges,
            "pathways": pathways,
            "dominant_pathway": self._dominant(pathways),
        }

    @staticmethod
    def _dominant(pathways: List[str]) -> str:
        if not pathways:
            return "unknown"
        counts: Dict[str, int] = {}
        for p in pathways:
            counts[p] = counts.get(p, 0) + 1
        return max(counts, key=counts.get)
