/**
 * GovernanceScenarioRunner — Runs predefined governance scenarios through
 * the full pipeline. Validates audit trail integrity, safety guard
 * effectiveness, and escalation moderation.
 */

export interface GovernanceScenario {
  name: string;
  description: string;
  input: {
    hypotheses: { condition: string; confidence: number }[];
    escalation: string;
    evidenceScore: number;
    symptomCount: number;
    wearableReliability: number;
    stabilityScore: number;
    warningCount: number;
    conversationTurns: number;
  };
  expectedOutcome: {
    shouldPass: boolean;
    shouldModerate: boolean;
    maxConfidence?: number;
    expectedEscalation?: string;
    shouldHaveDisclaimers: boolean;
  };
}

export interface ScenarioResult {
  scenario: string;
  passed: boolean;
  checks: { name: string; expected: string; actual: string; passed: boolean }[];
  duration: number;
}

// ── Predefined Governance Scenarios ──────
export const GOVERNANCE_SCENARIOS: GovernanceScenario[] = [
  {
    name: "Overconfident Diagnosis",
    description: "Tests governance cap on 95% confidence with moderate evidence",
    input: {
      hypotheses: [{ condition: "Type 2 Diabetes", confidence: 95 }],
      escalation: "moderate", evidenceScore: 55, symptomCount: 3,
      wearableReliability: 80, stabilityScore: 70, warningCount: 1, conversationTurns: 5,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: true, maxConfidence: 85,
      shouldHaveDisclaimers: true,
    },
  },
  {
    name: "Critical Escalation Without Evidence",
    description: "Tests escalation downgrade when evidence is insufficient",
    input: {
      hypotheses: [{ condition: "Cardiac Event", confidence: 70 }],
      escalation: "critical", evidenceScore: 30, symptomCount: 1,
      wearableReliability: 40, stabilityScore: 50, warningCount: 4, conversationTurns: 2,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: true, expectedEscalation: "elevated",
      shouldHaveDisclaimers: true,
    },
  },
  {
    name: "Sparse Symptom High Confidence",
    description: "Tests confidence reduction with only 1 symptom",
    input: {
      hypotheses: [{ condition: "Migraine", confidence: 75 }],
      escalation: "low", evidenceScore: 40, symptomCount: 1,
      wearableReliability: 90, stabilityScore: 80, warningCount: 0, conversationTurns: 3,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: true, maxConfidence: 55,
      shouldHaveDisclaimers: true,
    },
  },
  {
    name: "Clean Investigation Pass",
    description: "Tests that a well-evidenced moderate investigation passes cleanly",
    input: {
      hypotheses: [{ condition: "Common Cold", confidence: 65 }],
      escalation: "low", evidenceScore: 75, symptomCount: 5,
      wearableReliability: 85, stabilityScore: 90, warningCount: 0, conversationTurns: 6,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: false,
      shouldHaveDisclaimers: false,
    },
  },
  {
    name: "Unstable Reasoning",
    description: "Tests governance response to reasoning instability",
    input: {
      hypotheses: [{ condition: "Anxiety Disorder", confidence: 60 }, { condition: "Thyroid Issue", confidence: 55 }],
      escalation: "moderate", evidenceScore: 45, symptomCount: 4,
      wearableReliability: 70, stabilityScore: 20, warningCount: 6, conversationTurns: 8,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: true,
      shouldHaveDisclaimers: true,
    },
  },
  {
    name: "Emergency With Strong Evidence",
    description: "Tests that legitimate emergencies are NOT blocked",
    input: {
      hypotheses: [{ condition: "Acute Appendicitis", confidence: 80 }],
      escalation: "emergency", evidenceScore: 85, symptomCount: 6,
      wearableReliability: 90, stabilityScore: 85, warningCount: 0, conversationTurns: 7,
    },
    expectedOutcome: {
      shouldPass: true, shouldModerate: false, expectedEscalation: "emergency",
      shouldHaveDisclaimers: true,
    },
  },
];

export function runScenario(scenario: GovernanceScenario, guardEvaluate: (input: any) => any): ScenarioResult {
  const start = performance.now();
  const result = guardEvaluate({
    hypotheses: scenario.input.hypotheses,
    escalation: scenario.input.escalation,
    evidenceScore: scenario.input.evidenceScore,
    stabilityScore: scenario.input.stabilityScore,
    wearableReliability: scenario.input.wearableReliability,
    warningCount: scenario.input.warningCount,
    symptomCount: scenario.input.symptomCount,
    conversationTurns: scenario.input.conversationTurns,
  });
  const duration = performance.now() - start;

  const checks: ScenarioResult["checks"] = [];

  // Check pass/fail
  checks.push({
    name: "governance_pass",
    expected: String(scenario.expectedOutcome.shouldPass),
    actual: String(result.passed),
    passed: result.passed === scenario.expectedOutcome.shouldPass,
  });

  // Check moderation
  const wasModerated = result.remediations.length > 0;
  checks.push({
    name: "moderation_applied",
    expected: String(scenario.expectedOutcome.shouldModerate),
    actual: String(wasModerated),
    passed: wasModerated === scenario.expectedOutcome.shouldModerate,
  });

  // Check confidence cap
  if (scenario.expectedOutcome.maxConfidence !== undefined) {
    const actualMax = Math.max(...(result.modifiedOutput.hypotheses || []).map((h: any) => h.confidence), 0);
    checks.push({
      name: "confidence_cap",
      expected: `<= ${scenario.expectedOutcome.maxConfidence}`,
      actual: String(actualMax.toFixed(0)),
      passed: actualMax <= scenario.expectedOutcome.maxConfidence,
    });
  }

  // Check escalation
  if (scenario.expectedOutcome.expectedEscalation) {
    checks.push({
      name: "escalation_level",
      expected: scenario.expectedOutcome.expectedEscalation,
      actual: result.modifiedOutput.escalation || scenario.input.escalation,
      passed: (result.modifiedOutput.escalation || scenario.input.escalation) === scenario.expectedOutcome.expectedEscalation,
    });
  }

  // Check disclaimers
  const hasDisclaimers = (result.modifiedOutput.disclaimers || []).length > 1;  // >1 because base disclaimer always present
  checks.push({
    name: "disclaimers_present",
    expected: String(scenario.expectedOutcome.shouldHaveDisclaimers),
    actual: String(hasDisclaimers),
    passed: hasDisclaimers === scenario.expectedOutcome.shouldHaveDisclaimers,
  });

  return {
    scenario: scenario.name,
    passed: checks.every(c => c.passed),
    checks,
    duration,
  };
}
