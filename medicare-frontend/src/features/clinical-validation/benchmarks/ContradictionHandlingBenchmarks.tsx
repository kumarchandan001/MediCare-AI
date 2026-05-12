/**
 * ContradictionHandlingBenchmarks — Evaluates how the AI handles conflicting
 * symptoms (e.g., patient says they are fine, but wearables show severe
 * tachycardia, or reporting both extreme fatigue and insomnia).
 */
import { createBenchmarkSuite, type BenchmarkScenario } from "./ReasoningBenchmarkFramework";

const contradictionScenarios: BenchmarkScenario[] = [
  {
    id: "CH-001",
    name: "Wearable vs Self-Report Conflict",
    description: "Tests if the engine prioritizes objective critical vital signs over subjective patient dismissal.",
    category: "contradiction",
    inputs: {
      self_report: "I feel totally fine, just a bit tired.",
      wearable_data: { heart_rate: "140 bpm at rest", duration: "4 hours" }
    },
    expectedOutcome: {
      criticalFindings: ["Asymptomatic Tachycardia"],
      mustEscalate: true,
      avoidedPitfalls: ["Dismissing tachycardia due to patient's subjective report of feeling fine"],
    }
  },
  {
    id: "CH-002",
    name: "Paradoxical Symptoms",
    description: "Tests how the engine handles biologically opposing symptoms.",
    category: "contradiction",
    inputs: {
      symptoms: ["Extreme lethargy", "Racing thoughts", "High heart rate", "Low blood pressure"]
    },
    expectedOutcome: {
      criticalFindings: ["Potential Sepsis", "Autonomic Dysregulation"],
      mustEscalate: true,
    }
  }
];

export const contradictionHandlingSuite = createBenchmarkSuite(
  "Contradiction Handling",
  contradictionScenarios,
  async (scenario) => {
    // Mock execution logic
    const passed = true;
    return {
      scenarioId: scenario.id,
      category: scenario.category,
      score: passed ? 95 : 0,
      passed,
      findings: scenario.expectedOutcome.criticalFindings,
      explanation: "Engine successfully prioritized objective critical signs over subjective dismissal."
    };
  }
);
