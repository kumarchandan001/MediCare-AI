/**
 * ReasoningBenchmarkFramework — The foundational structure for defining,
 * executing, and evaluating clinical reasoning tests against the AI engine.
 */

export interface BenchmarkScenario {
  id: string;
  name: string;
  description: string;
  category: "temporal" | "contradiction" | "sparse_evidence" | "safety" | "escalation";
  inputs: Record<string, any>;
  expectedOutcome: {
    criticalFindings: string[];
    mustEscalate: boolean;
    avoidedPitfalls?: string[];
  };
}

export interface BenchmarkResult {
  scenarioId: string;
  category: BenchmarkScenario["category"];
  score: number; // 0 to 100
  passed: boolean;
  findings: string[];
  explanation: string;
}

export type BenchmarkExecutor = (scenario: BenchmarkScenario) => Promise<BenchmarkResult>;

export function createBenchmarkSuite(
  name: string,
  scenarios: BenchmarkScenario[],
  executor: BenchmarkExecutor
) {
  return async (): Promise<BenchmarkResult[]> => {
    const results: BenchmarkResult[] = [];
    for (const scenario of scenarios) {
      // Simulate slight async execution for realism in UI
      await new Promise(r => setTimeout(r, 100));
      const res = await executor(scenario);
      results.push(res);
    }
    return results;
  };
}
