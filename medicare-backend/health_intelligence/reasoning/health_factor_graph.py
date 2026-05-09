"""
health_intelligence/reasoning/health_factor_graph.py
───────────────────────────────────────────────
Directed acyclic graph of causal health relationships.

Models cause-effect chains between health factors:
  Poor Sleep → Elevated Stress → Recovery Decline
  Sedentary → Fatigue → Immune Vulnerability

Every edge has:
  - causal_weight (0–1 strength of influence)
  - evidence_level (how well-established the link is)
  - latency (how long before cause manifests as effect)
  - bidirectional flag (some links are feedback loops)

The graph is the knowledge base that the reasoning
engine traverses to explain *why* things change.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class CausalEdge:
    """A single causal relationship between two health factors."""
    cause: str
    effect: str
    causal_weight: float          # 0–1: strength of influence
    evidence_level: float         # 0–1: how established the link is
    latency_hours: float          # typical delay before effect manifests
    bidirectional: bool = False   # true if A↔B feedback loop
    mechanism: str = ""           # human-readable explanation
    conditions: list[str] = field(default_factory=list)  # when this link activates


@dataclass
class HealthFactor:
    """A node in the factor graph."""
    name: str
    category: str                 # sleep, stress, activity, recovery, etc.
    observable: bool = True       # can we measure it directly?
    description: str = ""
    normal_range: Optional[tuple[float, float]] = None


class HealthFactorGraph:
    """
    Directed graph of causal health relationships.

    This is the knowledge base for the causal reasoning engine.
    It encodes well-established physiological relationships
    (NOT disease diagnosis — wellness causality only).
    """

    def __init__(self):
        self._factors: dict[str, HealthFactor] = {}
        self._edges: list[CausalEdge] = []
        self._adjacency: dict[str, list[CausalEdge]] = {}
        self._reverse_adj: dict[str, list[CausalEdge]] = {}
        self._build_default_graph()

    # ── Graph queries ────────────────────────────────────────

    def get_effects_of(self, cause: str) -> list[CausalEdge]:
        """Get all downstream effects of a factor."""
        return self._adjacency.get(cause, [])

    def get_causes_of(self, effect: str) -> list[CausalEdge]:
        """Get all upstream causes of a factor."""
        return self._reverse_adj.get(effect, [])

    def get_factor(self, name: str) -> Optional[HealthFactor]:
        return self._factors.get(name)

    def get_all_factors(self) -> list[HealthFactor]:
        return list(self._factors.values())

    def get_causal_chain(
        self,
        root_cause: str,
        max_depth: int = 5,
    ) -> list[dict]:
        """
        Trace the full causal chain from a root cause,
        computing cumulative influence at each step.
        """
        chain: list[dict] = []
        visited: set[str] = set()
        self._trace_chain(root_cause, 1.0, 0, max_depth, visited, chain)
        return chain

    def get_competing_causes(
        self,
        observed_effect: str,
    ) -> list[dict]:
        """
        Get all possible causes of an observed effect,
        ranked by causal weight and evidence level.
        """
        causes = self.get_causes_of(observed_effect)
        ranked = []
        for edge in causes:
            combined = edge.causal_weight * 0.6 + edge.evidence_level * 0.4
            ranked.append({
                "cause": edge.cause,
                "effect": edge.effect,
                "causal_weight": edge.causal_weight,
                "evidence_level": edge.evidence_level,
                "combined_score": round(combined, 3),
                "mechanism": edge.mechanism,
                "latency_hours": edge.latency_hours,
            })
        ranked.sort(key=lambda x: x["combined_score"], reverse=True)
        return ranked

    def get_feedback_loops(self) -> list[list[str]]:
        """Identify feedback loops in the graph."""
        loops: list[list[str]] = []
        for edge in self._edges:
            if edge.bidirectional:
                loops.append([edge.cause, edge.effect])
        return loops

    # ── Graph construction ───────────────────────────────────

    def add_factor(self, factor: HealthFactor) -> None:
        self._factors[factor.name] = factor

    def add_edge(self, edge: CausalEdge) -> None:
        self._edges.append(edge)
        self._adjacency.setdefault(edge.cause, []).append(edge)
        self._reverse_adj.setdefault(edge.effect, []).append(edge)

    def to_dict(self) -> dict:
        """Serialize the graph for API responses."""
        return {
            "factors": [
                {
                    "name": f.name,
                    "category": f.category,
                    "observable": f.observable,
                    "description": f.description,
                }
                for f in self._factors.values()
            ],
            "edges": [
                {
                    "cause": e.cause,
                    "effect": e.effect,
                    "weight": e.causal_weight,
                    "evidence": e.evidence_level,
                    "mechanism": e.mechanism,
                }
                for e in self._edges
            ],
            "feedback_loops": self.get_feedback_loops(),
        }

    # ── Internal ─────────────────────────────────────────────

    def _trace_chain(
        self,
        current: str,
        cumulative_weight: float,
        depth: int,
        max_depth: int,
        visited: set,
        chain: list[dict],
    ) -> None:
        if depth >= max_depth or current in visited:
            return
        visited.add(current)

        for edge in self.get_effects_of(current):
            new_weight = cumulative_weight * edge.causal_weight
            if new_weight < 0.05:
                continue  # too weak to matter

            chain.append({
                "depth": depth,
                "cause": edge.cause,
                "effect": edge.effect,
                "direct_weight": edge.causal_weight,
                "cumulative_weight": round(new_weight, 4),
                "mechanism": edge.mechanism,
                "latency_hours": edge.latency_hours,
            })
            self._trace_chain(
                edge.effect, new_weight, depth + 1,
                max_depth, visited, chain,
            )

    def _build_default_graph(self) -> None:
        """
        Build the default health factor graph with
        well-established physiological relationships.
        """
        # ── Factors ──
        factors = [
            HealthFactor("sleep_quality", "sleep", True,
                         "Overall sleep quality and duration"),
            HealthFactor("sleep_debt", "sleep", False,
                         "Cumulative sleep deficit"),
            HealthFactor("stress_level", "stress", True,
                         "Acute and chronic stress"),
            HealthFactor("stress_accumulation", "stress", False,
                         "Sustained stress buildup"),
            HealthFactor("physical_activity", "activity", True,
                         "Exercise and movement"),
            HealthFactor("sedentary_behavior", "activity", True,
                         "Extended inactivity"),
            HealthFactor("recovery_quality", "recovery", False,
                         "Post-stress recovery effectiveness"),
            HealthFactor("resilience", "recovery", False,
                         "Ability to bounce back from stressors"),
            HealthFactor("fatigue", "energy", False,
                         "Physical and mental tiredness"),
            HealthFactor("hrv_quality", "cardiac", True,
                         "Heart rate variability as autonomic health proxy"),
            HealthFactor("resting_hr", "cardiac", True,
                         "Resting heart rate"),
            HealthFactor("immune_readiness", "immune", False,
                         "Estimated immune system resilience"),
            HealthFactor("cognitive_performance", "cognitive", False,
                         "Mental sharpness and focus"),
            HealthFactor("hydration", "nutrition", True,
                         "Hydration status"),
            HealthFactor("mood_stability", "psychological", False,
                         "Emotional regulation capacity"),
            HealthFactor("burnout_risk", "psychological", False,
                         "Risk of psychological burnout"),
        ]
        for f in factors:
            self.add_factor(f)

        # ── Edges (causal relationships) ──
        edges = [
            # Sleep cascade
            CausalEdge("sleep_quality", "fatigue", 0.85, 0.9, 4,
                        mechanism="Poor sleep directly causes fatigue accumulation"),
            CausalEdge("sleep_quality", "stress_level", 0.65, 0.85, 6,
                        mechanism="Sleep deprivation elevates cortisol and stress response"),
            CausalEdge("sleep_quality", "recovery_quality", 0.8, 0.9, 8,
                        mechanism="Sleep is the primary recovery mechanism"),
            CausalEdge("sleep_quality", "immune_readiness", 0.7, 0.8, 24,
                        mechanism="Sleep deprivation impairs immune function"),
            CausalEdge("sleep_quality", "cognitive_performance", 0.75, 0.85, 4,
                        mechanism="Sleep loss degrades attention and decision-making"),
            CausalEdge("sleep_quality", "hrv_quality", 0.6, 0.75, 12,
                        mechanism="Poor sleep reduces parasympathetic tone"),
            CausalEdge("sleep_quality", "mood_stability", 0.7, 0.8, 6,
                        mechanism="Sleep disruption destabilizes emotional regulation"),

            # Sleep debt cascade
            CausalEdge("sleep_debt", "fatigue", 0.9, 0.85, 24,
                        mechanism="Cumulative deficit compounds tiredness"),
            CausalEdge("sleep_debt", "resilience", 0.7, 0.75, 48,
                        mechanism="Sustained deficit erodes stress recovery capacity"),
            CausalEdge("sleep_debt", "burnout_risk", 0.65, 0.7, 72,
                        mechanism="Chronic sleep debt is a burnout precursor"),

            # Stress cascade
            CausalEdge("stress_level", "sleep_quality", 0.7, 0.85, 6,
                        bidirectional=True,
                        mechanism="Stress disrupts sleep onset and quality"),
            CausalEdge("stress_level", "resting_hr", 0.55, 0.8, 2,
                        mechanism="Sympathetic activation elevates resting HR"),
            CausalEdge("stress_level", "hrv_quality", 0.65, 0.8, 2,
                        mechanism="Stress suppresses vagal tone"),
            CausalEdge("stress_level", "recovery_quality", 0.6, 0.75, 4,
                        mechanism="Elevated cortisol impairs recovery pathways"),
            CausalEdge("stress_accumulation", "burnout_risk", 0.8, 0.85, 168,
                        mechanism="Chronic unresolved stress drives burnout"),
            CausalEdge("stress_accumulation", "immune_readiness", 0.55, 0.7, 72,
                        mechanism="Sustained cortisol suppresses immune responses"),

            # Activity effects
            CausalEdge("physical_activity", "sleep_quality", 0.5, 0.75, 12,
                        mechanism="Moderate exercise improves sleep depth"),
            CausalEdge("physical_activity", "stress_level", -0.5, 0.7, 2,
                        mechanism="Exercise reduces cortisol (negative = reducing)"),
            CausalEdge("physical_activity", "fatigue", 0.3, 0.65, 1,
                        mechanism="Acute exercise causes temporary fatigue"),
            CausalEdge("physical_activity", "resilience", 0.45, 0.7, 168,
                        mechanism="Regular exercise builds stress resilience"),

            # Sedentary cascade
            CausalEdge("sedentary_behavior", "fatigue", 0.5, 0.7, 24,
                        mechanism="Inactivity paradoxically increases fatigue"),
            CausalEdge("sedentary_behavior", "mood_stability", 0.4, 0.65, 48,
                        mechanism="Prolonged sitting worsens mood regulation"),
            CausalEdge("sedentary_behavior", "recovery_quality", 0.35, 0.6, 24,
                        mechanism="Lack of movement slows metabolic recovery"),

            # Recovery / Resilience
            CausalEdge("recovery_quality", "resilience", 0.75, 0.8, 48,
                        mechanism="Good recovery builds resilience over time"),
            CausalEdge("resilience", "stress_level", -0.4, 0.7, 0,
                        mechanism="Higher resilience dampens stress response"),
            CausalEdge("resilience", "burnout_risk", -0.6, 0.75, 0,
                        mechanism="Resilience protects against burnout"),

            # Fatigue cascade
            CausalEdge("fatigue", "cognitive_performance", 0.7, 0.85, 2,
                        mechanism="Fatigue directly impairs cognition"),
            CausalEdge("fatigue", "physical_activity", -0.5, 0.7, 0,
                        mechanism="Fatigue reduces motivation to exercise"),
            CausalEdge("fatigue", "mood_stability", 0.5, 0.7, 4,
                        mechanism="Chronic tiredness destabilizes mood"),

            # Hydration
            CausalEdge("hydration", "cognitive_performance", 0.4, 0.65, 2,
                        mechanism="Dehydration impairs focus and cognition"),
            CausalEdge("hydration", "fatigue", 0.35, 0.6, 4,
                        mechanism="Mild dehydration increases perceived fatigue"),
            CausalEdge("hydration", "resting_hr", 0.3, 0.55, 2,
                        mechanism="Dehydration increases cardiac demand"),

            # Mood / Burnout
            CausalEdge("mood_stability", "stress_level", 0.45, 0.65, 0,
                        bidirectional=True,
                        mechanism="Poor mood amplifies stress perception"),
            CausalEdge("burnout_risk", "cognitive_performance", 0.6, 0.7, 0,
                        mechanism="Burnout severely degrades mental performance"),
            CausalEdge("burnout_risk", "immune_readiness", 0.5, 0.65, 48,
                        mechanism="Burnout states suppress immune function"),
        ]
        for e in edges:
            self.add_edge(e)

        log.debug(
            "Health factor graph built: %d factors, %d edges",
            len(self._factors), len(self._edges),
        )
