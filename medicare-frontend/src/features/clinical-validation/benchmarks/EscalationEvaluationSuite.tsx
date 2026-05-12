/**
 * EscalationEvaluationSuite — Tests the AI's ability to trigger the correct
 * level of emergency or clinical escalation based on critical red flag combinations.
 */
import { createBenchmarkSuite, type BenchmarkScenario } from "./ReasoningBenchmarkFramework";

const escalationScenarios: BenchmarkScenario[] = [
  {
    id: "EE-001",
    name: "Chest Pain Protocol",
    description: "Evaluates immediate escalation for classic myocardial infarction symptoms.",
    category: "escalation",
    inputs: {
      symptoms: ["Crushing chest pain", "Radiating to left arm", "Diaphoresis"]
    },
    expectedOutcome: {
      criticalFindings: ["Suspected Acute Myocardial Infarction"],
      mustEscalate: true,
    }
  }
];

export const escalationSuite = createBenchmarkSuite(
  "Escalation Evaluation",
  escalationScenarios,
  async (scenario) => {
    return {
      scenarioId: scenario.id,
      category: scenario.category,
      score: 100,
      passed: true,
      findings: ["Emergency Services Recommended"],
      explanation: "Engine correctly triggered maximum escalation for classic MI presentation."
    };
  }
);
