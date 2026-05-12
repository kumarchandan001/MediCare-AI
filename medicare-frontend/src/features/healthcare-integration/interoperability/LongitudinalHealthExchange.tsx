/**
 * LongitudinalHealthExchange — Manages portable longitudinal health
 * records that can be exchanged across healthcare ecosystems.
 */
import { useCallback } from "react";

export interface PortableHealthRecord {
  id: string;
  version: string;
  createdAt: number;
  lastUpdated: number;
  sections: HealthRecordSection[];
  metadata: { source: string; format: string; disclaimer: string };
  checksum: string;
}

export interface HealthRecordSection {
  type: "demographics" | "conditions" | "medications" | "allergies" | "vitals" | "labs" | "procedures" | "immunizations" | "wellness";
  entries: number;
  dateRange: { earliest: number; latest: number } | null;
  completeness: number;
}

export function useLongitudinalHealthExchange() {
  const generatePortableRecord = useCallback((sections: HealthRecordSection[]): PortableHealthRecord => ({
    id: `phr-${Date.now()}`, version: "1.0", createdAt: Date.now(), lastUpdated: Date.now(),
    sections, metadata: { source: "MediCare AI Health Intelligence", format: "MediCare Portable Health Record v1", disclaimer: "AI-generated health record. Not a certified medical record. For informational purposes only." },
    checksum: btoa(JSON.stringify(sections).slice(0, 50)),
  }), []);

  const assessPortability = useCallback((record: PortableHealthRecord): { portable: boolean; completeness: number; gaps: string[] } => {
    const requiredSections: HealthRecordSection["type"][] = ["conditions", "medications", "allergies", "vitals"];
    const present = record.sections.map(s => s.type);
    const missing = requiredSections.filter(r => !present.includes(r));
    const avgCompleteness = record.sections.length > 0 ? record.sections.reduce((s, sec) => s + sec.completeness, 0) / record.sections.length : 0;
    return { portable: missing.length === 0 && avgCompleteness > 50, completeness: avgCompleteness, gaps: missing.map(m => `Missing required section: ${m}`) };
  }, []);

  return { generatePortableRecord, assessPortability };
}
