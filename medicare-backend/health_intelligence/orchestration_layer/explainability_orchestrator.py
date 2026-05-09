"""
health_intelligence/orchestration_layer/explainability_orchestrator.py
───────────────────────────────────────────────
Unified explainability across all agents and systems.
(Refinement 4)

Aggregates:
  - Cross-agent reasoning summaries
  - Orchestration rationale
  - Intervention decision tracing
  - Simulation explanation layers
  - Wellness tradeoff explanations
  - Agent conflict resolution reasoning

Users should understand:
  - WHY interventions were chosen
  - WHY certain wellness tradeoffs occurred
  - WHY simulations produced certain outcomes
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

log = logging.getLogger(__name__)


@dataclass
class ReasoningTrace:
    """A single reasoning step from any subsystem."""
    source: str             # agent name, engine name, etc.
    step: str               # what happened
    rationale: str           # why
    confidence: float = 0.5
    timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


@dataclass
class ExplainabilityReport:
    """Unified cross-system explainability report."""
    user_id: int
    traces: list[ReasoningTrace]
    summary: str
    key_decisions: list[dict]
    tradeoffs: list[dict]
    agent_contributions: dict[str, str]
    confidence_range: tuple[float, float]
    generated_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat(),
    )


class ExplainabilityOrchestrator:
    """
    Collects and unifies reasoning traces from all
    subsystems into coherent, human-readable explanations.
    """

    def __init__(self):
        # user_id → list of traces (current cycle)
        self._traces: dict[int, list[ReasoningTrace]] = defaultdict(list)
        self._max_traces = 50

    def record_trace(
        self,
        user_id: int,
        source: str,
        step: str,
        rationale: str,
        confidence: float = 0.5,
    ) -> None:
        """Record a reasoning trace from any subsystem."""
        self._traces[user_id].append(ReasoningTrace(
            source=source,
            step=step,
            rationale=rationale,
            confidence=confidence,
        ))
        # Prune
        if len(self._traces[user_id]) > self._max_traces:
            self._traces[user_id] = self._traces[user_id][-self._max_traces:]

    def record_tradeoff(
        self,
        user_id: int,
        option_a: str,
        option_b: str,
        chosen: str,
        rationale: str,
    ) -> None:
        """Record a wellness tradeoff decision."""
        self.record_trace(
            user_id,
            source="tradeoff_engine",
            step=f"Tradeoff: {option_a} vs {option_b} → chose {chosen}",
            rationale=rationale,
        )

    def record_agent_decision(
        self,
        user_id: int,
        agent_name: str,
        decision: str,
        rationale: str,
        confidence: float = 0.5,
    ) -> None:
        """Record an agent's autonomous decision."""
        self.record_trace(
            user_id, source=agent_name,
            step=decision, rationale=rationale,
            confidence=confidence,
        )

    def generate_report(self, user_id: int) -> dict:
        """
        Generate a unified explainability report
        from all collected traces.
        """
        traces = self._traces.get(user_id, [])

        if not traces:
            return {
                "summary": "No reasoning activity recorded yet.",
                "traces": [],
                "key_decisions": [],
                "tradeoffs": [],
                "agent_contributions": {},
            }

        # Group by source
        by_source: dict[str, list[ReasoningTrace]] = defaultdict(list)
        for t in traces:
            by_source[t.source].append(t)

        # Agent contributions
        contributions: dict[str, str] = {}
        for source, source_traces in by_source.items():
            latest = source_traces[-1]
            contributions[source] = latest.rationale

        # Key decisions (high-confidence traces)
        key_decisions = [
            {
                "source": t.source,
                "decision": t.step,
                "rationale": t.rationale,
                "confidence": t.confidence,
            }
            for t in traces
            if t.confidence >= 0.5
        ]

        # Tradeoffs
        tradeoffs = [
            {
                "decision": t.step,
                "rationale": t.rationale,
            }
            for t in traces
            if t.source == "tradeoff_engine"
        ]

        # Confidence range
        confidences = [t.confidence for t in traces]
        conf_range = (
            round(min(confidences), 3),
            round(max(confidences), 3),
        )

        # Summary
        summary = self._build_summary(traces, contributions)

        return {
            "summary": summary,
            "key_decisions": key_decisions[-10:],
            "tradeoffs": tradeoffs,
            "agent_contributions": contributions,
            "confidence_range": conf_range,
            "total_traces": len(traces),
            "generated_at": datetime.utcnow().isoformat(),
        }

    def clear_cycle(self, user_id: int) -> None:
        """Clear traces for a new orchestration cycle."""
        self._traces[user_id] = []

    @staticmethod
    def _build_summary(
        traces: list[ReasoningTrace],
        contributions: dict[str, str],
    ) -> str:
        """Build a human-readable summary."""
        parts: list[str] = []

        sources = list(contributions.keys())
        if sources:
            parts.append(
                f"This cycle involved {len(sources)} system(s): "
                f"{', '.join(sources)}."
            )

        high_conf = [t for t in traces if t.confidence >= 0.6]
        if high_conf:
            parts.append(
                f"{len(high_conf)} high-confidence decision(s) were made."
            )

        tradeoff_count = sum(1 for t in traces if t.source == "tradeoff_engine")
        if tradeoff_count:
            parts.append(
                f"{tradeoff_count} wellness tradeoff(s) were evaluated."
            )

        return " ".join(parts) if parts else "Minimal reasoning activity this cycle."
