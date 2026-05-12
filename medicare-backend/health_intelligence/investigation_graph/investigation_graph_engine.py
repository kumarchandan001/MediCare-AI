"""
Investigation Graph Engine — Orchestrates clinical reasoning pathway graphs.

Maps relationships between symptoms, evidence, conditions, progression,
escalation, recovery, and contradictions into a navigable graph structure.
"""
import time


class InvestigationGraphEngine:
    def build_graph(self, hypotheses, observations, contradictions=None,
                    trajectory_data=None, recovery_data=None, escalation_data=None):
        graph = {"generated_at": time.time(), "nodes": [], "edges": [],
                 "focus_node": None, "summary": ""}

        node_ids = set()

        # Symptom nodes
        for obs in observations:
            s = obs.get("symptom", "unknown")
            nid = f"symptom_{s}"
            if nid not in node_ids:
                node_ids.add(nid)
                graph["nodes"].append({
                    "id": nid, "type": "symptom", "label": s.replace("_", " "),
                    "severity": obs.get("severity", 0), "status": "active",
                })

        # Condition nodes
        for hyp in hypotheses:
            cond = hyp.get("condition", "unknown")
            nid = f"condition_{cond}"
            if nid not in node_ids:
                node_ids.add(nid)
                graph["nodes"].append({
                    "id": nid, "type": "condition", "label": cond,
                    "confidence": hyp.get("confidence", 0),
                    "status": "investigating",
                })

            # Edges: symptom → condition
            for ev in hyp.get("evidence_for", []):
                src = f"symptom_{ev}"
                if src in node_ids:
                    graph["edges"].append({
                        "from": src, "to": nid, "type": "supports",
                        "strength": min(1.0, hyp.get("confidence", 0) + 0.1),
                        "label": "supports",
                    })

            for ev in hyp.get("evidence_against", []):
                src = f"symptom_{ev}"
                if src in node_ids:
                    graph["edges"].append({
                        "from": src, "to": nid, "type": "weakens",
                        "strength": 0.5, "label": "weakens",
                    })

        # Trajectory node
        if trajectory_data:
            tid = "trajectory_state"
            node_ids.add(tid)
            graph["nodes"].append({
                "id": tid, "type": "trajectory",
                "label": f"Trajectory: {trajectory_data.get('trajectory', 'stable')}",
                "stability": trajectory_data.get("stability_score", 0.5),
                "status": trajectory_data.get("trajectory", "stable"),
            })
            # Connect trajectory to top condition
            if hypotheses:
                graph["edges"].append({
                    "from": tid, "to": f"condition_{hypotheses[0].get('condition', '')}",
                    "type": "influences", "strength": 0.4, "label": "progression influence",
                })

        # Escalation node
        if escalation_data and escalation_data.get("escalation_likelihood", 0) > 0.1:
            eid = "escalation_state"
            node_ids.add(eid)
            graph["nodes"].append({
                "id": eid, "type": "escalation",
                "label": f"Escalation: {round(escalation_data.get('escalation_likelihood', 0) * 100)}%",
                "likelihood": escalation_data.get("escalation_likelihood", 0),
                "status": "monitoring",
            })

        # Recovery node
        if recovery_data and recovery_data.get("is_recovering"):
            rid = "recovery_state"
            node_ids.add(rid)
            graph["nodes"].append({
                "id": rid, "type": "recovery",
                "label": f"Recovery: {round(recovery_data.get('recovery_quality', 0) * 100)}%",
                "quality": recovery_data.get("recovery_quality", 0),
                "status": "recovering",
            })

        # Focus node (highest priority)
        conditions = [n for n in graph["nodes"] if n["type"] == "condition"]
        if conditions:
            graph["focus_node"] = max(conditions, key=lambda n: n.get("confidence", 0))["id"]

        graph["summary"] = (f"Investigation graph: {len(graph['nodes'])} clinical elements, "
                            f"{len(graph['edges'])} relationships mapped.")
        return graph
