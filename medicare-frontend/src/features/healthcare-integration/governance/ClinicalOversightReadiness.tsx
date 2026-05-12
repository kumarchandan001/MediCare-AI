/**
 * ClinicalOversightReadiness — Assesses platform readiness for
 * regulatory clinical oversight and approval pathways.
 */
import { useCallback } from "react";

export interface OversightCategory {
  name: string;
  readiness: number;
  requirements: { item: string; status: "complete" | "in_progress" | "not_started"; critical: boolean }[];
  regulatoryBody: string;
  timeline: string;
}

export function useClinicalOversightReadiness() {
  const assess = useCallback((): { overall: number; categories: OversightCategory[]; blockers: string[] } => {
    const categories: OversightCategory[] = [
      { name: "FDA SaMD Classification", readiness: 15, regulatoryBody: "FDA", timeline: "18-24 months", requirements: [
        { item: "Software classification determination", status: "in_progress", critical: true },
        { item: "Quality management system", status: "not_started", critical: true },
        { item: "Clinical evidence documentation", status: "not_started", critical: true },
        { item: "Pre-submission meeting", status: "not_started", critical: false },
      ]},
      { name: "HIPAA Compliance", readiness: 55, regulatoryBody: "HHS", timeline: "6-12 months", requirements: [
        { item: "Technical safeguards", status: "in_progress", critical: true },
        { item: "Administrative safeguards", status: "in_progress", critical: true },
        { item: "Physical safeguards", status: "complete", critical: true },
        { item: "Business associate agreements", status: "not_started", critical: true },
      ]},
      { name: "Clinical Validation", readiness: 20, regulatoryBody: "IRB", timeline: "12-18 months", requirements: [
        { item: "Study protocol design", status: "not_started", critical: true },
        { item: "IRB approval", status: "not_started", critical: true },
        { item: "Participant recruitment", status: "not_started", critical: false },
        { item: "Data analysis framework", status: "in_progress", critical: false },
      ]},
    ];
    const overall = Math.round(categories.reduce((s, c) => s + c.readiness, 0) / categories.length);
    const blockers = categories.flatMap(c => c.requirements.filter(r => r.critical && r.status === "not_started").map(r => `${c.name}: ${r.item}`));
    return { overall, categories, blockers };
  }, []);

  return { assess };
}
