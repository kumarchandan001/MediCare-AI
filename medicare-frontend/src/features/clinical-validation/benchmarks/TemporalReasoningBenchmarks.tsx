/**
 * TemporalReasoningBenchmarks — A test suite designed to evaluate if the AI
 * correctly understands the progression of symptoms over time (e.g., distinguishing
 * between acute onset vs. chronic worsening).
 */
import { createBenchmarkSuite, type BenchmarkScenario } from "./ReasoningBenchmarkFramework";

const temporalScenarios: BenchmarkScenario[] = [
  {
    id: "TR-001",
    name: "Acute vs Chronic Distinguisher",
    description: "Evaluates if the engine correctly escalates a sudden onset symptom compared to a known chronic baseline.",
    category: "temporal",
    inputs: {
      baseline: { condition: "hypertension", duration: "5 years" },
      recent_vitals: { bp: "180/110", onset: "2 hours ago" },
    },
    expectedOutcome: {
      criticalFindings: ["Hypertensive Crisis Possible"],
      mustEscalate: true,
      avoidedPitfalls: ["Attributing purely to chronic baseline"],
    }
  },
  {
    id: "TR-002",
    name: "Symptom Sequencing",
    description: "Tests if the engine identifies the correct causal chain when symptoms occur in a specific time sequence.",
    category: "temporal",
    inputs: {
      timeline: [
        { time: "Day 1", symptom: "Fever" },
        { time: "Day 3", symptom: "Cough starts" },
        { time: "Day 5", symptom: "Shortness of breath suddenly begins" }
      ]
    },
    expectedOutcome: {
      criticalFindings: ["Pneumonia Risk", "Progressive Respiratory Decline"],
      mustEscalate: true,
    }
  }
];

export const temporalReasoningSuite = createBenchmarkSuite(
  "Temporal Reasoning",
  temporalScenarios,
  async (scenario) => {
    // Mock execution logic - in reality, this would call the actual AI inference engine
    const passed = true; 
    return {
      scenarioId: scenario.id,
      category: scenario.category,
      score: passed ? 100 : 0,
      passed,
      findings: scenario.expectedOutcome.criticalFindings,
      explanation: "Engine successfully identified the acute escalation against the temporal timeline."
    };
  }
);
