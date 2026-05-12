/**
 * SharedInvestigationReview — Prepares investigation data for shared
 * clinical review with structured export and evidence documentation.
 */
import { useCallback } from "react";

export interface SharedInvestigation {
  id: string;
  title: string;
  sections: ReviewSection[];
  evidenceChain: { step: string; evidence: string; confidence: number }[];
  exportFormat: "structured_pdf" | "clinical_summary" | "raw_data";
  generatedAt: number;
  disclaimer: string;
}

export interface ReviewSection {
  heading: string;
  content: string;
  dataPoints: { label: string; value: string; source: string }[];
  aiConfidence: number;
  clinicalRelevance: "high" | "moderate" | "low" | "informational";
}

export function useSharedInvestigationReview() {
  const generateReview = useCallback((title: string, sections: ReviewSection[]): SharedInvestigation => ({
    id: `review-${Date.now()}`, title, sections,
    evidenceChain: sections.map(s => ({ step: s.heading, evidence: s.content.slice(0, 100), confidence: s.aiConfidence })),
    exportFormat: "clinical_summary", generatedAt: Date.now(),
    disclaimer: "AI-generated investigation review. Not a clinical diagnosis. Requires healthcare professional interpretation.",
  }), []);

  return { generateReview };
}
