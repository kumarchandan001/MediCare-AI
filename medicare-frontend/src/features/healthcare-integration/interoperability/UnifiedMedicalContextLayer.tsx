/**
 * UnifiedMedicalContextLayer — Unifies medical context from multiple
 * sources into a coherent clinical picture for decision support.
 */
import { useCallback } from "react";

export interface MedicalContext {
  patientId: string;
  conditions: { name: string; status: string; source: string; confidence: number }[];
  medications: { name: string; dosage: string; source: string; active: boolean }[];
  allergies: { allergen: string; severity: string; source: string }[];
  recentVitals: { metric: string; value: number; unit: string; timestamp: number }[];
  contextCompleteness: number;
  sources: string[];
  lastConsolidated: number;
  disclaimer: string;
}

export function useUnifiedMedicalContextLayer() {
  const consolidateContext = useCallback((sources: { name: string; data: Partial<MedicalContext> }[]): MedicalContext => {
    const conditions = sources.flatMap(s => (s.data.conditions || []).map(c => ({ ...c, source: s.name })));
    const medications = sources.flatMap(s => (s.data.medications || []).map(m => ({ ...m, source: s.name })));
    const allergies = sources.flatMap(s => (s.data.allergies || []).map(a => ({ ...a, source: s.name })));
    const vitals = sources.flatMap(s => s.data.recentVitals || []);
    const fields = [conditions.length > 0, medications.length > 0, allergies.length > 0, vitals.length > 0];
    const completeness = (fields.filter(Boolean).length / fields.length) * 100;
    return {
      patientId: "", conditions, medications, allergies, recentVitals: vitals,
      contextCompleteness: completeness, sources: sources.map(s => s.name),
      lastConsolidated: Date.now(),
      disclaimer: "Consolidated from multiple sources — verify with authoritative clinical records",
    };
  }, []);

  return { consolidateContext };
}
