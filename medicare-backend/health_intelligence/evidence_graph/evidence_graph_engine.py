"""
health_intelligence/evidence_graph/evidence_graph_engine.py
───────────────────────────────────────────────────────────
Main coordinator for the clinical evidence graph.
Maintains a live graph of nodes (symptoms, conditions, wearable signals)
and edges (supports, contradicts, correlates).
"""

from typing import Any, Dict, List
from .causal_evidence_mapper import CausalEvidenceMapper
from .symptom_relationship_graph import SymptomRelationshipGraph
from .contradiction_linker import ContradictionLinker


class EvidenceGraphEngine:

    def __init__(self) -> None:
        self.causal_mapper = CausalEvidenceMapper()
        self.symptom_graph = SymptomRelationshipGraph()
        self.contradiction_linker = ContradictionLinker()
        self._graphs: Dict[str, Dict[str, Any]] = {}

    def build_graph(
        self,
        session_id: str,
        active_symptoms: List[str],
        hypotheses: List[Dict[str, Any]],
        contradictions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Build or update the evidence graph for a session."""
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        # Symptom nodes
        for s in active_symptoms:
            nodes.append({"id": f"s_{s}", "type": "symptom", "label": s.replace("_", " ")})

        # Condition nodes
        for h in hypotheses:
            cond = h["condition"]
            nodes.append({
                "id": f"c_{cond.replace(' ', '_')}",
                "type": "condition",
                "label": cond,
                "confidence": h["confidence"],
            })

        # Causal edges (symptom → condition)
        causal = self.causal_mapper.map_evidence(active_symptoms, hypotheses)
        edges.extend(causal)

        # Symptom relationship edges
        symptom_rels = self.symptom_graph.get_relationships(active_symptoms)
        edges.extend(symptom_rels)

        # Contradiction edges
        contra_edges = self.contradiction_linker.link(contradictions, hypotheses)
        edges.extend(contra_edges)

        graph = {"nodes": nodes, "edges": edges}
        self._graphs[session_id] = graph
        return graph

    def get_graph(self, session_id: str) -> Dict[str, Any]:
        return self._graphs.get(session_id, {"nodes": [], "edges": []})
