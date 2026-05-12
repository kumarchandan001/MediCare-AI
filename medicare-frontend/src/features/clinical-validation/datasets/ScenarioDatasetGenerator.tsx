/**
 * ScenarioDatasetGenerator — Programmatically generates synthetic clinical
 * scenarios (with controlled complexity) for benchmark testing. Produces
 * datasets with known ground truth for evaluating AI accuracy.
 */
import { useCallback } from "react";
import type { BenchmarkScenario } from "../benchmarks/ReasoningBenchmarkFramework";

export function useScenarioDatasetGenerator() {
  const generateTemporalScenarios = useCallback((count: number): BenchmarkScenario[] => {
    const scenarios: BenchmarkScenario[] = [];
    for (let i = 0; i < count; i++) {
      scenarios.push({
        id: `SYNTH-T-${i + 1}`,
        name: `Synthetic Temporal Scenario ${i + 1}`,
        description: `Auto-generated temporal reasoning test case #${i + 1}`,
        category: "temporal",
        inputs: {
          timeline: [
            { time: "Day 1", symptom: "Baseline symptom A" },
            { time: `Day ${3 + i}`, symptom: "Escalation symptom B" },
          ],
        },
        expectedOutcome: {
          criticalFindings: ["Temporal escalation detected"],
          mustEscalate: i % 2 === 0,
        },
      });
    }
    return scenarios;
  }, []);

  const generateContradictionScenarios = useCallback((count: number): BenchmarkScenario[] => {
    const scenarios: BenchmarkScenario[] = [];
    for (let i = 0; i < count; i++) {
      scenarios.push({
        id: `SYNTH-C-${i + 1}`,
        name: `Synthetic Contradiction Scenario ${i + 1}`,
        description: `Auto-generated contradiction handling test case #${i + 1}`,
        category: "contradiction",
        inputs: {
          self_report: "Patient reports feeling fine",
          wearable_data: { anomaly: true, severity: (i + 1) * 10 },
        },
        expectedOutcome: {
          criticalFindings: ["Objective-subjective mismatch"],
          mustEscalate: (i + 1) * 10 > 50,
        },
      });
    }
    return scenarios;
  }, []);

  return { generateTemporalScenarios, generateContradictionScenarios };
}
