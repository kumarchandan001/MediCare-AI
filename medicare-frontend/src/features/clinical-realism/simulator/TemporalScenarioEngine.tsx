/**
 * TemporalScenarioEngine — Generates synthetic temporal scenarios to
 * stress-test the realism engine. Each scenario models a multi-day
 * health trajectory with wearable readings, symptoms, and outcomes.
 */

export interface ScenarioStep {
  day: number;
  hour: number;
  symptoms: string[];
  heartRate: number;
  hrv: number;
  severity: number;
  expectedEscalation: string;
  expectedConfidenceRange: [number, number];
  description: string;
}

export interface TemporalScenario {
  id: string;
  name: string;
  description: string;
  category: "respiratory" | "cardiac" | "fatigue" | "wearable" | "contradiction" | "recovery";
  steps: ScenarioStep[];
  expectedOutcome: string;
}

export const TEMPORAL_SCENARIOS: TemporalScenario[] = [
  {
    id: "resp-deterioration",
    name: "Respiratory Deterioration",
    description: "Gradual respiratory worsening over 5 days with cough → fever → shortness of breath.",
    category: "respiratory",
    expectedOutcome: "Escalation from low → elevated by day 5. Recovery should not appear before day 8.",
    steps: [
      { day: 1, hour: 9, symptoms: ["cough"], heartRate: 72, hrv: 48, severity: 15, expectedEscalation: "none", expectedConfidenceRange: [20, 50], description: "Mild cough reported." },
      { day: 2, hour: 10, symptoms: ["cough", "fatigue"], heartRate: 75, hrv: 44, severity: 25, expectedEscalation: "low", expectedConfidenceRange: [30, 55], description: "Cough persists, fatigue added." },
      { day: 3, hour: 8, symptoms: ["cough", "fatigue", "fever"], heartRate: 82, hrv: 38, severity: 45, expectedEscalation: "moderate", expectedConfidenceRange: [45, 70], description: "Fever develops." },
      { day: 4, hour: 11, symptoms: ["cough", "fever", "shortness_of_breath"], heartRate: 88, hrv: 32, severity: 60, expectedEscalation: "elevated", expectedConfidenceRange: [55, 80], description: "Shortness of breath begins." },
      { day: 5, hour: 9, symptoms: ["cough", "fever", "shortness_of_breath", "chest_tightness"], heartRate: 92, hrv: 28, severity: 72, expectedEscalation: "elevated", expectedConfidenceRange: [60, 85], description: "Chest tightness added — peak severity." },
    ],
  },
  {
    id: "chronic-fatigue",
    name: "Chronic Fatigue Progression",
    description: "Persistent fatigue with minimal wearable changes over 14 days. Tests sparse evidence handling.",
    category: "fatigue",
    expectedOutcome: "Confidence should remain low-moderate. Edge-case detection should activate by day 7.",
    steps: [
      { day: 1, hour: 8, symptoms: ["fatigue"], heartRate: 70, hrv: 50, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [10, 35], description: "Fatigue only." },
      { day: 4, hour: 9, symptoms: ["fatigue"], heartRate: 71, hrv: 48, severity: 15, expectedEscalation: "none", expectedConfidenceRange: [15, 35], description: "Fatigue persists, no change." },
      { day: 7, hour: 8, symptoms: ["fatigue", "headache"], heartRate: 72, hrv: 46, severity: 20, expectedEscalation: "low", expectedConfidenceRange: [20, 40], description: "Headache added." },
      { day: 10, hour: 10, symptoms: ["fatigue", "headache"], heartRate: 73, hrv: 45, severity: 22, expectedEscalation: "low", expectedConfidenceRange: [20, 40], description: "No improvement." },
      { day: 14, hour: 9, symptoms: ["fatigue", "headache", "malaise"], heartRate: 74, hrv: 43, severity: 28, expectedEscalation: "low", expectedConfidenceRange: [25, 45], description: "Malaise added. Chronic flag expected." },
    ],
  },
  {
    id: "erratic-wearable",
    name: "Erratic Wearable Signals",
    description: "Wearable data swings wildly while symptoms remain stable. Tests wearable moderation.",
    category: "wearable",
    expectedOutcome: "Wearable reliability should drop below 70%. Confidence penalties should activate.",
    steps: [
      { day: 1, hour: 8, symptoms: ["mild_headache"], heartRate: 70, hrv: 50, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [15, 40], description: "Baseline: stable." },
      { day: 1, hour: 12, symptoms: ["mild_headache"], heartRate: 110, hrv: 20, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [10, 30], description: "HR spike, HRV collapse — no symptom change." },
      { day: 1, hour: 16, symptoms: ["mild_headache"], heartRate: 65, hrv: 55, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [10, 30], description: "HR drops below baseline — artifact?" },
      { day: 2, hour: 8, symptoms: ["mild_headache"], heartRate: 105, hrv: 22, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [10, 25], description: "Another HR spike — wearable unreliable." },
      { day: 2, hour: 14, symptoms: ["mild_headache"], heartRate: 72, hrv: 48, severity: 10, expectedEscalation: "none", expectedConfidenceRange: [15, 35], description: "Wearable normalizes." },
    ],
  },
  {
    id: "unstable-recovery",
    name: "Unstable Recovery",
    description: "Recovery that oscillates — improving then worsening then improving. Tests temporal coherence.",
    category: "recovery",
    expectedOutcome: "Recovery trend should be 'fragile', not 'confirmed'. Stability score should stay moderate.",
    steps: [
      { day: 1, hour: 8, symptoms: ["fever", "cough", "body_ache"], heartRate: 85, hrv: 35, severity: 55, expectedEscalation: "moderate", expectedConfidenceRange: [50, 75], description: "Initial illness." },
      { day: 3, hour: 9, symptoms: ["cough"], heartRate: 76, hrv: 42, severity: 30, expectedEscalation: "low", expectedConfidenceRange: [40, 60], description: "Significant improvement." },
      { day: 5, hour: 10, symptoms: ["fever", "cough"], heartRate: 82, hrv: 36, severity: 45, expectedEscalation: "moderate", expectedConfidenceRange: [45, 65], description: "Fever returns." },
      { day: 7, hour: 8, symptoms: ["cough"], heartRate: 74, hrv: 44, severity: 25, expectedEscalation: "low", expectedConfidenceRange: [35, 55], description: "Improving again." },
      { day: 9, hour: 9, symptoms: ["mild_cough"], heartRate: 72, hrv: 47, severity: 15, expectedEscalation: "none", expectedConfidenceRange: [25, 45], description: "Gradual resolution — fragile." },
    ],
  },
  {
    id: "contradictory-signals",
    name: "Contradictory Clinical Signals",
    description: "Symptoms suggest one condition, wearables suggest another. Tests contradiction handling.",
    category: "contradiction",
    expectedOutcome: "Multi-conflict edge case should trigger. Confidence should be heavily moderated.",
    steps: [
      { day: 1, hour: 8, symptoms: ["anxiety", "palpitations"], heartRate: 65, hrv: 55, severity: 20, expectedEscalation: "none", expectedConfidenceRange: [15, 40], description: "Anxiety reported but vitals are calm." },
      { day: 1, hour: 14, symptoms: ["chest_pain"], heartRate: 68, hrv: 52, severity: 35, expectedEscalation: "low", expectedConfidenceRange: [25, 50], description: "Chest pain with normal vitals." },
      { day: 2, hour: 9, symptoms: ["chest_pain", "dizziness"], heartRate: 70, hrv: 50, severity: 40, expectedEscalation: "moderate", expectedConfidenceRange: [30, 55], description: "Dizziness added, vitals still normal." },
      { day: 2, hour: 16, symptoms: ["chest_pain", "dizziness", "fatigue"], heartRate: 72, hrv: 48, severity: 42, expectedEscalation: "moderate", expectedConfidenceRange: [30, 50], description: "Accumulating symptoms, calm vitals — contradiction." },
    ],
  },
];

/**
 * Utility to run a scenario step-by-step.
 */
export function getScenarioById(id: string): TemporalScenario | undefined {
  return TEMPORAL_SCENARIOS.find(s => s.id === id);
}

export function getAllScenarios(): TemporalScenario[] {
  return [...TEMPORAL_SCENARIOS];
}
