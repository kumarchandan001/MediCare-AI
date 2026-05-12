/**
 * UnsafeReasoningBlocker — Detects and blocks diagnostic claims, treatment
 * recommendations, and medication suggestions. Ensures all outputs remain
 * advisory and non-authoritative.
 */
import { useCallback } from "react";
import { UNSAFE_PATTERNS } from "./ClinicalSafetyThresholds";

export interface BlockerResult {
  isClean: boolean;
  blockedPatterns: { pattern: string; category: string; replacement: string }[];
  sanitizedText: string;
  alarmingTermsFound: string[];
  disclaimerRequired: boolean;
}

export function useUnsafeReasoningBlocker() {
  const sanitize = useCallback((text: string): BlockerResult => {
    const blockedPatterns: BlockerResult["blockedPatterns"] = [];
    const alarmingTermsFound: string[] = [];
    let sanitized = text;

    // Check diagnostic claims
    for (const pattern of UNSAFE_PATTERNS.DIAGNOSTIC_CLAIMS) {
      const regex = new RegExp(pattern, "gi");
      if (regex.test(sanitized)) {
        const replacement = getSafeReplacement(pattern, "diagnostic");
        sanitized = sanitized.replace(regex, replacement);
        blockedPatterns.push({ pattern, category: "diagnostic_claim", replacement });
      }
    }

    // Check treatment terms
    for (const pattern of UNSAFE_PATTERNS.TREATMENT_TERMS) {
      const regex = new RegExp(pattern, "gi");
      if (regex.test(sanitized)) {
        const replacement = getSafeReplacement(pattern, "treatment");
        sanitized = sanitized.replace(regex, replacement);
        blockedPatterns.push({ pattern, category: "treatment_recommendation", replacement });
      }
    }

    // Check alarming terms (flag but don't always remove — context matters)
    for (const term of UNSAFE_PATTERNS.ALARMING_TERMS) {
      if (sanitized.toLowerCase().includes(term.toLowerCase())) {
        alarmingTermsFound.push(term);
      }
    }

    return {
      isClean: blockedPatterns.length === 0 && alarmingTermsFound.length <= 1,
      blockedPatterns,
      sanitizedText: sanitized,
      alarmingTermsFound,
      disclaimerRequired: blockedPatterns.length > 0 || alarmingTermsFound.length > 0,
    };
  }, []);

  const validateNarrative = useCallback((narrative: string): { isSafe: boolean; concerns: string[]; safeVersion: string } => {
    const result = sanitize(narrative);
    const concerns: string[] = [];

    if (result.blockedPatterns.length > 0) {
      concerns.push(`${result.blockedPatterns.length} unsafe pattern(s) detected and replaced`);
    }
    if (result.alarmingTermsFound.length > 2) {
      concerns.push(`Multiple alarming terms may cause unnecessary anxiety`);
    }

    return {
      isSafe: result.isClean,
      concerns,
      safeVersion: result.sanitizedText,
    };
  }, [sanitize]);

  return { sanitize, validateNarrative };
}

function getSafeReplacement(pattern: string, category: string): string {
  if (category === "diagnostic") {
    const replacements: Record<string, string> = {
      "you have": "the analysis suggests",
      "you are diagnosed": "the assessment indicates",
      "this confirms": "this is consistent with",
      "definitely": "likely",
      "certainly": "appears to be",
      "without doubt": "with reasonable confidence",
      "100%": "high confidence",
      "guaranteed": "strongly suggested",
    };
    return replacements[pattern.toLowerCase()] || "the analysis suggests";
  }

  if (category === "treatment") {
    return "consider discussing with your healthcare provider about";
  }

  return pattern;
}
