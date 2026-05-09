"""
health_intelligence/optimization/wellness_tradeoff_engine.py
───────────────────────────────────────────────
Calculates costs and benefits of conflicting wellness
choices and recommends the optimal tradeoff.

Examples:
  - More exercise → better fitness, but less recovery time
  - Extended sleep → better rest, but less morning activity
  - Stress reduction break → less productivity, but lower burnout

Each tradeoff includes:
  - Quantified cost/benefit
  - Short-term vs long-term framing
  - Explainable reasoning
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime

log = logging.getLogger(__name__)


@dataclass
class TradeoffOption:
    """One side of a wellness tradeoff."""
    label: str
    benefits: list[str]
    costs: list[str]
    short_term_score: float   # -1 to +1
    long_term_score: float    # -1 to +1
    sustainability: float     # 0–1


@dataclass
class TradeoffAnalysis:
    """Result of a tradeoff evaluation."""
    option_a: TradeoffOption
    option_b: TradeoffOption
    recommended: str         # "a" or "b"
    rationale: str
    confidence: float
    timeframe_bias: str      # "short_term" or "long_term"


# Pre-built tradeoff templates
TRADEOFF_TEMPLATES = {
    "exercise_vs_recovery": {
        "option_a": TradeoffOption(
            label="Increase Exercise",
            benefits=["Improved fitness", "Stress reduction", "Better sleep quality"],
            costs=["Reduced recovery time", "Risk of fatigue accumulation"],
            short_term_score=0.3,
            long_term_score=0.7,
            sustainability=0.6,
        ),
        "option_b": TradeoffOption(
            label="Prioritise Recovery",
            benefits=["Restored energy", "Reduced injury risk", "Mental clarity"],
            costs=["Missed fitness opportunity", "Potential deconditioning"],
            short_term_score=0.5,
            long_term_score=0.4,
            sustainability=0.8,
        ),
    },
    "sleep_vs_morning_activity": {
        "option_a": TradeoffOption(
            label="Extended Sleep",
            benefits=["Reduced sleep debt", "Better cognitive function", "Improved mood"],
            costs=["Less morning activity time", "Shifted routine"],
            short_term_score=0.6,
            long_term_score=0.5,
            sustainability=0.7,
        ),
        "option_b": TradeoffOption(
            label="Morning Exercise",
            benefits=["Energy boost", "Metabolic activation", "Routine consistency"],
            costs=["Reduced sleep duration", "Potential fatigue"],
            short_term_score=0.4,
            long_term_score=0.6,
            sustainability=0.5,
        ),
    },
    "stress_break_vs_productivity": {
        "option_a": TradeoffOption(
            label="Take a Stress Break",
            benefits=["Reduced burnout risk", "Better focus after break", "Emotional reset"],
            costs=["Temporary productivity loss", "Task interruption"],
            short_term_score=0.3,
            long_term_score=0.8,
            sustainability=0.9,
        ),
        "option_b": TradeoffOption(
            label="Push Through",
            benefits=["Task completion", "Short-term output"],
            costs=["Increased burnout risk", "Declining quality", "Recovery debt"],
            short_term_score=0.5,
            long_term_score=-0.3,
            sustainability=0.2,
        ),
    },
}


class WellnessTradeoffEngine:
    """
    Evaluates wellness tradeoffs with explainable
    cost/benefit analysis.
    """

    def evaluate_tradeoff(
        self,
        tradeoff_id: str,
        prefer_long_term: bool = True,
    ) -> dict:
        """Evaluate a pre-built tradeoff."""
        template = TRADEOFF_TEMPLATES.get(tradeoff_id)
        if not template:
            return {"error": f"Unknown tradeoff: {tradeoff_id}"}

        analysis = self._analyse(
            template["option_a"],
            template["option_b"],
            prefer_long_term,
        )
        return self._to_dict(analysis)

    def evaluate_custom(
        self,
        option_a: dict,
        option_b: dict,
        prefer_long_term: bool = True,
    ) -> dict:
        """Evaluate a custom tradeoff."""
        a = TradeoffOption(**option_a)
        b = TradeoffOption(**option_b)
        analysis = self._analyse(a, b, prefer_long_term)
        return self._to_dict(analysis)

    def list_tradeoffs(self) -> list[dict]:
        """List available tradeoff templates."""
        return [
            {
                "id": tid,
                "option_a": t["option_a"].label,
                "option_b": t["option_b"].label,
            }
            for tid, t in TRADEOFF_TEMPLATES.items()
        ]

    def _analyse(
        self,
        option_a: TradeoffOption,
        option_b: TradeoffOption,
        prefer_long_term: bool,
    ) -> TradeoffAnalysis:
        """Run tradeoff analysis."""
        if prefer_long_term:
            score_a = option_a.long_term_score * 0.6 + option_a.sustainability * 0.4
            score_b = option_b.long_term_score * 0.6 + option_b.sustainability * 0.4
            bias = "long_term"
        else:
            score_a = option_a.short_term_score * 0.6 + option_a.sustainability * 0.2 + option_a.long_term_score * 0.2
            score_b = option_b.short_term_score * 0.6 + option_b.sustainability * 0.2 + option_b.long_term_score * 0.2
            bias = "short_term"

        recommended = "a" if score_a >= score_b else "b"
        winner = option_a if recommended == "a" else option_b
        confidence = abs(score_a - score_b) / max(abs(score_a) + abs(score_b), 0.01)

        rationale = (
            f"{winner.label} is recommended because it offers "
            f"{'stronger long-term' if prefer_long_term else 'better short-term'} "
            f"outcomes (sustainability: {winner.sustainability:.0%})."
        )

        return TradeoffAnalysis(
            option_a=option_a,
            option_b=option_b,
            recommended=recommended,
            rationale=rationale,
            confidence=min(0.9, confidence),
            timeframe_bias=bias,
        )

    @staticmethod
    def _to_dict(analysis: TradeoffAnalysis) -> dict:
        return {
            "option_a": {
                "label": analysis.option_a.label,
                "benefits": analysis.option_a.benefits,
                "costs": analysis.option_a.costs,
                "sustainability": analysis.option_a.sustainability,
            },
            "option_b": {
                "label": analysis.option_b.label,
                "benefits": analysis.option_b.benefits,
                "costs": analysis.option_b.costs,
                "sustainability": analysis.option_b.sustainability,
            },
            "recommended": analysis.recommended,
            "rationale": analysis.rationale,
            "confidence": round(analysis.confidence, 3),
            "timeframe_bias": analysis.timeframe_bias,
        }
