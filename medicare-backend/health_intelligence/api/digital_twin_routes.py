"""
health_intelligence/api/digital_twin_routes.py
───────────────────────────────────────────────
REST API for the Digital Health Twin &
Autonomous Wellness Orchestration Layer (Step 5).

Endpoints:
  GET  /twin-state              — Full digital twin state
  GET  /wellness-orchestration  — Run orchestration cycle
  GET  /multi-future            — Multi-future simulation
  GET  /agent-decisions         — Agent proposals & negotiation
  GET  /wellness-evolution      — Long-term wellness trends
  GET  /resilience-growth       — Resilience growth analysis
  GET  /goal-optimization       — Reinforcement optimizer report
  GET  /behavioral-simulation   — Behavioral response prediction
  GET  /intervention-learning   — Self-learning report
  GET  /ethical-governance      — Governance & alignment status
"""

import logging
from fastapi import APIRouter, Query

# ── Digital Twin ──
from health_intelligence.digital_twin.digital_twin_engine import DigitalTwinEngine

# ── Orchestration ──
from health_intelligence.orchestration_layer.wellness_orchestrator import WellnessOrchestrator

# ── Agents ──
from health_intelligence.agents.recovery_agent import RecoveryAgent
from health_intelligence.agents.sleep_agent import SleepAgent
from health_intelligence.agents.stress_agent import StressAgent
from health_intelligence.agents.activity_agent import ActivityAgent
from health_intelligence.agents.resilience_agent import ResilienceAgent
from health_intelligence.agents.agent_negotiation import AgentNegotiation

# ── Simulation ──
from health_intelligence.simulation.multi_future_simulator import MultiFutureSimulator
from health_intelligence.simulation.scenario_branching import ScenarioBranching
from health_intelligence.simulation.behavioral_response_simulator import BehavioralResponseSimulator

# ── Optimization ──
from health_intelligence.optimization.reinforcement_optimizer import ReinforcementOptimizer
from health_intelligence.optimization.long_term_wellness_optimizer import LongTermWellnessOptimizer
from health_intelligence.optimization.wellness_tradeoff_engine import WellnessTradeoffEngine

# ── Adaptation ──
from health_intelligence.adaptation.self_learning_engine import SelfLearningEngine
from health_intelligence.adaptation.intervention_adaptation import InterventionAdaptation
from health_intelligence.adaptation.meta_learning_hooks import MetaLearningHooks

# ── Governance ──
from health_intelligence.governance.ethical_governance import EthicalGovernance
from health_intelligence.governance.autonomy_boundaries import AutonomyBoundaries
from health_intelligence.governance.human_alignment import HumanAlignment

# ── Insights ──
from health_intelligence.insights.life_pattern_discovery import LifePatternDiscovery
from health_intelligence.insights.resilience_growth_tracker import ResilienceGrowthTracker

# ── Infrastructure ──
from health_intelligence.infrastructure.research_expansion_hooks import ResearchExpansionHooks

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/digital-twin", tags=["Digital Health Twin"])

# ── Initialise systems ──────────────────────────────────
orchestrator = WellnessOrchestrator()

# Register agents
_agents = {
    "recovery_agent": RecoveryAgent(),
    "sleep_agent": SleepAgent(),
    "stress_agent": StressAgent(),
    "activity_agent": ActivityAgent(),
    "resilience_agent": ResilienceAgent(),
}
for name, agent in _agents.items():
    orchestrator.register_agent(name, agent)

negotiation = AgentNegotiation()
multi_future = MultiFutureSimulator()
scenario_branching = ScenarioBranching()
behavioral_sim = BehavioralResponseSimulator()
reinforcement = ReinforcementOptimizer()
long_term_opt = LongTermWellnessOptimizer()
tradeoff_engine = WellnessTradeoffEngine()
self_learning = SelfLearningEngine()
intervention_adapt = InterventionAdaptation()
meta_hooks = MetaLearningHooks()
ethical_gov = EthicalGovernance()
boundaries = AutonomyBoundaries()
alignment = HumanAlignment()
pattern_discovery = LifePatternDiscovery()
resilience_tracker = ResilienceGrowthTracker()
research_hooks = ResearchExpansionHooks()


def _sample_signals(user_id: int) -> dict[str, float]:
    """Generate sample signals for development/testing."""
    import hashlib
    seed = int(hashlib.md5(str(user_id).encode()).hexdigest()[:8], 16) % 100
    return {
        "heart_rate_bpm": 68 + seed * 0.2,
        "stress_level": 35 + seed * 0.3,
        "sleep_hours": 7.5 - seed * 0.02,
        "active_minutes": 25 + seed * 0.3,
        "recovery_score": 70 - seed * 0.2,
        "fatigue": 30 + seed * 0.2,
        "wellness_score": 68 - seed * 0.15,
        "hrv_ms": 45 + seed * 0.1,
        "steps": 5500 + seed * 30,
        "burnout_risk": 0.1 + seed * 0.003,
        "resilience": 60 + seed * 0.1,
    }


# ── Endpoints ────────────────────────────────────────────

@router.get("/twin-state")
async def get_twin_state(user_id: int = Query(1, description="User ID")):
    """Get the full digital twin state."""
    signals = _sample_signals(user_id)
    orchestrator.twin.update(user_id, signals)
    return orchestrator.twin.get_twin_state(user_id)


@router.get("/wellness-orchestration")
async def run_orchestration(user_id: int = Query(1, description="User ID")):
    """Run a full wellness orchestration cycle."""
    signals = _sample_signals(user_id)
    report = orchestrator.orchestrate(user_id, signals)

    # Run governance check
    gov_check = ethical_gov.run_governance_check(user_id, report)
    align_check = alignment.check_alignment(user_id, report)

    report["governance"] = gov_check
    report["alignment"] = align_check

    return report


@router.get("/multi-future")
async def simulate_multi_future(
    user_id: int = Query(1, description="User ID"),
    horizon_days: int = Query(7, description="Simulation horizon (max 14)"),
):
    """Simulate multiple possible wellness futures."""
    signals = _sample_signals(user_id)
    result = multi_future.simulate(user_id, signals, horizon_days)
    return multi_future.to_dict(result)


@router.get("/agent-decisions")
async def get_agent_decisions(user_id: int = Query(1, description="User ID")):
    """Get all agent proposals and negotiation results."""
    signals = _sample_signals(user_id)
    twin_state = orchestrator.twin.get_twin_state(user_id)

    proposals: list[dict] = []
    for name, agent in _agents.items():
        proposal = agent.evaluate(user_id, signals, twin_state)
        proposals.append(proposal)

    resolved = negotiation.negotiate_batch(proposals, signals)

    return {
        "raw_proposals": proposals,
        "resolved_order": resolved,
        "active_agents": len(_agents),
    }


@router.get("/wellness-evolution")
async def get_wellness_evolution(user_id: int = Query(1, description="User ID")):
    """Get long-term wellness evolution trends."""
    return long_term_opt.analyse_trends(user_id)


@router.get("/resilience-growth")
async def get_resilience_growth(user_id: int = Query(1, description="User ID")):
    """Get resilience growth analysis."""
    return resilience_tracker.analyse_growth(user_id)


@router.get("/goal-optimization")
async def get_goal_optimization(user_id: int = Query(1, description="User ID")):
    """Get reinforcement optimizer report."""
    return reinforcement.get_optimization_report(user_id)


@router.get("/behavioral-simulation")
async def get_behavioral_simulation(
    user_id: int = Query(1, description="User ID"),
    category: str = Query("sleep_schedule", description="Intervention category"),
):
    """Predict behavioral response to an intervention."""
    signals = _sample_signals(user_id)
    return behavioral_sim.predict_response(
        user_id, category,
        stress_level=signals.get("stress_level", 40),
        fatigue=signals.get("fatigue", 30),
    )


@router.get("/intervention-learning")
async def get_intervention_learning(user_id: int = Query(1, description="User ID")):
    """Get self-learning and adaptation report."""
    return {
        "self_learning": self_learning.get_learning_report(user_id),
        "adaptations": intervention_adapt.get_all_adaptations(user_id),
        "meta_learning": meta_hooks.get_evolution_summary(user_id),
    }


@router.get("/ethical-governance")
async def get_ethical_governance(user_id: int = Query(1, description="User ID")):
    """Get ethical governance status."""
    signals = _sample_signals(user_id)
    report = orchestrator.orchestrate(user_id, signals)
    gov = ethical_gov.run_governance_check(user_id, report)
    align = alignment.check_alignment(user_id, report)
    violations = boundaries.get_violations(user_id)

    return {
        "governance": gov,
        "alignment": align,
        "boundary_violations": violations,
        "research_hooks": research_hooks.get_status(),
    }
