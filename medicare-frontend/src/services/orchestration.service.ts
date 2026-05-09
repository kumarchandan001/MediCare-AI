/**
 * Orchestration Service — Digital Twin & Wellness Orchestration API
 */
import { api } from "@/lib/apiClient";
import type {
  DigitalTwinState,
  OrchestrationReport,
  SimulationResult,
  ResilienceGrowth,
} from "@/types/orchestration.types";

export const orchestrationService = {
  getTwinState: (userId: number) =>
    api.get<DigitalTwinState>("/digital-twin/twin-state", { user_id: userId }),

  getOrchestration: (userId: number) =>
    api.get<OrchestrationReport>("/digital-twin/wellness-orchestration", { user_id: userId }),

  getMultiFuture: (userId: number) =>
    api.get<SimulationResult>("/digital-twin/multi-future", { user_id: userId }),

  getAgentDecisions: (userId: number) =>
    api.get<{ agents: unknown[]; negotiation: unknown }>("/digital-twin/agent-decisions", { user_id: userId }),

  getResilienceGrowth: (userId: number) =>
    api.get<ResilienceGrowth>("/digital-twin/resilience-growth", { user_id: userId }),

  getGovernance: (userId: number) =>
    api.get<{ governance: unknown; alignment: unknown }>("/digital-twin/ethical-governance", { user_id: userId }),

  getBehavioralSimulation: (userId: number) =>
    api.get<unknown>("/digital-twin/behavioral-simulation", { user_id: userId }),

  getWellnessEvolution: (userId: number) =>
    api.get<unknown>("/digital-twin/wellness-evolution", { user_id: userId }),
};
