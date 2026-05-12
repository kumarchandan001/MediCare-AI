/**
 * ComplianceStressTester — Injects edge cases to validate governance
 * guards block unsafe outputs. Tests recovery from governance failures.
 */

export interface StressTestResult {
  testName: string;
  passed: boolean;
  details: string;
  duration: number;
}

export interface StressTestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  results: StressTestResult[];
  overallPassed: boolean;
}

export function runComplianceStressTests(guardEvaluate: (input: any) => any): StressTestSuite {
  const results: StressTestResult[] = [];

  // Test 1: Zero-symptom investigation should cap confidence
  results.push(runTest("Zero Symptom Confidence Cap", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Unknown", confidence: 80 }],
      escalation: "none", evidenceScore: 20, stabilityScore: 50,
      wearableReliability: 0, warningCount: 0, symptomCount: 0, conversationTurns: 1,
    });
    return r.modifiedOutput.disclaimers.length > 1;
  }));

  // Test 2: Max warnings should trigger flag
  results.push(runTest("Warning Accumulation Flag", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Test", confidence: 50 }],
      escalation: "moderate", evidenceScore: 40, stabilityScore: 60,
      wearableReliability: 50, warningCount: 15, symptomCount: 3, conversationTurns: 5,
    });
    return r.checks.some((c: any) => c.name === "warning_accumulation" && !c.passed);
  }));

  // Test 3: Emergency with 0 evidence should be blocked
  results.push(runTest("Emergency Zero Evidence Block", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Cardiac", confidence: 90 }],
      escalation: "emergency", evidenceScore: 5, stabilityScore: 30,
      wearableReliability: 20, warningCount: 10, symptomCount: 1, conversationTurns: 1,
    });
    return r.modifiedOutput.escalation === "elevated";
  }));

  // Test 4: Perfect input should pass clean
  results.push(runTest("Perfect Input Clean Pass", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Cold", confidence: 60 }],
      escalation: "low", evidenceScore: 80, stabilityScore: 95,
      wearableReliability: 90, warningCount: 0, symptomCount: 5, conversationTurns: 6,
    });
    return r.passed && r.remediations.length === 0;
  }));

  // Test 5: Rapid escalation (1 turn) should be moderated
  results.push(runTest("Rapid Escalation Moderation", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Sepsis", confidence: 75 }],
      escalation: "critical", evidenceScore: 60, stabilityScore: 70,
      wearableReliability: 80, warningCount: 2, symptomCount: 4, conversationTurns: 1,
    });
    return r.modifiedOutput.escalation !== "critical";
  }));

  // Test 6: 100% confidence should never pass through
  results.push(runTest("100% Confidence Block", () => {
    const r = guardEvaluate({
      hypotheses: [{ condition: "Definite", confidence: 100 }],
      escalation: "moderate", evidenceScore: 90, stabilityScore: 95,
      wearableReliability: 95, warningCount: 0, symptomCount: 6, conversationTurns: 8,
    });
    const maxConf = Math.max(...r.modifiedOutput.hypotheses.map((h: any) => h.confidence));
    return maxConf <= 85;
  }));

  const passed = results.filter(r => r.passed).length;

  return {
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    results,
    overallPassed: passed === results.length,
  };
}

function runTest(name: string, fn: () => boolean): StressTestResult {
  const start = performance.now();
  try {
    const passed = fn();
    return { testName: name, passed, details: passed ? "OK" : "Assertion failed", duration: performance.now() - start };
  } catch (e) {
    return { testName: name, passed: false, details: `Error: ${e}`, duration: performance.now() - start };
  }
}
