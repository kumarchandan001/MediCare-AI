"""Verify Step 5 module imports and integration."""

print("=== Step 5: Digital Health Twin Import Verification ===\n")

# Digital Twin
from health_intelligence.digital_twin.digital_twin_engine import DigitalTwinEngine
from health_intelligence.digital_twin.physiological_profile_model import PhysiologicalProfileModel
from health_intelligence.digital_twin.wellness_identity_model import WellnessIdentityModel
from health_intelligence.digital_twin.twin_state_manager import TwinStateManager
from health_intelligence.digital_twin.twin_memory_graph import TwinMemoryGraph
print("[OK] Digital Twin (5 modules)")

# Orchestration
from health_intelligence.orchestration_layer.wellness_orchestrator import WellnessOrchestrator
from health_intelligence.orchestration_layer.energy_budget_manager import EnergyBudgetManager
from health_intelligence.orchestration_layer.explainability_orchestrator import ExplainabilityOrchestrator
from health_intelligence.orchestration_layer.orchestration_stability_controls import OrchestrationStabilityControls
from health_intelligence.orchestration_layer.intervention_coordinator import InterventionCoordinator
print("[OK] Orchestration (5 modules)")

# Agents
from health_intelligence.agents.recovery_agent import RecoveryAgent
from health_intelligence.agents.sleep_agent import SleepAgent
from health_intelligence.agents.stress_agent import StressAgent
from health_intelligence.agents.activity_agent import ActivityAgent
from health_intelligence.agents.resilience_agent import ResilienceAgent
from health_intelligence.agents.agent_negotiation import AgentNegotiation
print("[OK] Agents (6 modules)")

# Simulation (new)
from health_intelligence.simulation.multi_future_simulator import MultiFutureSimulator
from health_intelligence.simulation.scenario_branching import ScenarioBranching
from health_intelligence.simulation.behavioral_response_simulator import BehavioralResponseSimulator
print("[OK] Simulation (3 new modules)")

# Optimization (new)
from health_intelligence.optimization.reinforcement_optimizer import ReinforcementOptimizer
from health_intelligence.optimization.long_term_wellness_optimizer import LongTermWellnessOptimizer
from health_intelligence.optimization.wellness_tradeoff_engine import WellnessTradeoffEngine
print("[OK] Optimization (3 new modules)")

# Adaptation
from health_intelligence.adaptation.self_learning_engine import SelfLearningEngine
from health_intelligence.adaptation.intervention_adaptation import InterventionAdaptation
from health_intelligence.adaptation.meta_learning_hooks import MetaLearningHooks
print("[OK] Adaptation (3 modules)")

# Governance
from health_intelligence.governance.ethical_governance import EthicalGovernance
from health_intelligence.governance.autonomy_boundaries import AutonomyBoundaries
from health_intelligence.governance.human_alignment import HumanAlignment
print("[OK] Governance (3 modules)")

# Insights
from health_intelligence.insights.life_pattern_discovery import LifePatternDiscovery
from health_intelligence.insights.resilience_growth_tracker import ResilienceGrowthTracker
print("[OK] Insights (2 modules)")

# Infrastructure
from health_intelligence.infrastructure.research_expansion_hooks import ResearchExpansionHooks
print("[OK] Infrastructure (1 module)")

# API
from health_intelligence.api.digital_twin_routes import router
print("[OK] API Router")

print("\n=== ALL 33 MODULES IMPORTED SUCCESSFULLY ===\n")

# Quick integration test
twin = DigitalTwinEngine()
signals = {
    "stress_level": 45, "sleep_hours": 7, "recovery_score": 65,
    "fatigue": 35, "active_minutes": 30, "hrv_ms": 42,
    "wellness_score": 68, "burnout_risk": 0.15,
}
result = twin.update(1, signals)
print(f"Twin update OK: keys={list(result.keys())}")

orch = WellnessOrchestrator()
orch.register_agent("stress", StressAgent())
orch.register_agent("sleep", SleepAgent())
report = orch.orchestrate(1, signals)
print(f"Orchestration OK: {report['interventions_delivered']} interventions delivered")

print("\n=== INTEGRATION TEST PASSED ===")
