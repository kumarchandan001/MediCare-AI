/**
 * ClinicalSafetyThresholds — Centralized threshold configuration for all
 * governance guards. Exported constants consumed by every safety component.
 * Supports environment-specific overrides (dev vs production).
 */

const IS_PRODUCTION = import.meta.env.PROD;

// ── Confidence Boundaries ────────────────
export const CONFIDENCE_THRESHOLDS = {
  /** Maximum confidence any hypothesis can display to user */
  MAX_DISPLAY_CONFIDENCE: IS_PRODUCTION ? 85 : 90,
  /** Minimum evidence score required for confidence above 70% */
  HIGH_CONFIDENCE_MIN_EVIDENCE: 60,
  /** Below this evidence score, confidence is capped at this value */
  LOW_EVIDENCE_CONFIDENCE_CAP: 55,
  /** Minimum symptoms required for any confidence above 50% */
  MIN_SYMPTOMS_FOR_MODERATE_CONFIDENCE: 2,
  /** Confidence floor — never show 0% to avoid false negatives */
  CONFIDENCE_FLOOR: 5,
} as const;

// ── Escalation Safety ────────────────────
export const ESCALATION_THRESHOLDS = {
  /** Minimum evidence score required for critical escalation */
  CRITICAL_MIN_EVIDENCE: 50,
  /** Minimum confidence for emergency escalation */
  EMERGENCY_MIN_CONFIDENCE: 60,
  /** Maximum escalation jumps per session */
  MAX_ESCALATION_JUMPS_PER_SESSION: 3,
  /** Cooldown between escalation changes (ms) */
  ESCALATION_COOLDOWN_MS: 30_000,
  /** Minimum conversation turns before allowing critical escalation */
  MIN_TURNS_FOR_CRITICAL: 3,
} as const;

// ── Reasoning Safety ─────────────────────
export const REASONING_THRESHOLDS = {
  /** Maximum hypothesis rank change per turn */
  MAX_RANK_CHANGE_PER_TURN: 2,
  /** Minimum stability score to pass governance */
  MIN_STABILITY_SCORE: 30,
  /** Maximum warnings before governance flags investigation */
  MAX_WARNINGS_BEFORE_FLAG: 8,
  /** Confidence variance threshold for instability detection */
  INSTABILITY_VARIANCE_THRESHOLD: 15,
} as const;

// ── Wearable Safety ──────────────────────
export const WEARABLE_THRESHOLDS = {
  /** Below this reliability, wearable data gets disclaimer */
  LOW_RELIABILITY_THRESHOLD: 60,
  /** Below this, wearable data is excluded from reasoning */
  EXCLUSION_THRESHOLD: 30,
  /** Maximum influence wearable can have on confidence (0-1) */
  MAX_WEARABLE_INFLUENCE: 0.3,
  /** Drift variance threshold for artifact detection */
  DRIFT_ARTIFACT_THRESHOLD: 25,
} as const;

// ── Emotional Safety ─────────────────────
export const EMOTIONAL_THRESHOLDS = {
  /** Maximum cognitive load score before pacing intervention */
  MAX_COGNITIVE_LOAD: 75,
  /** Maximum consecutive questions before forced pause */
  MAX_CONSECUTIVE_QUESTIONS: 8,
  /** Minimum seconds between AI messages for pacing */
  MIN_MESSAGE_INTERVAL_SEC: 2,
  /** Maximum anxiety-inducing terms in a single response */
  MAX_ALARMING_TERMS: 2,
} as const;

// ── Audit & Compliance ───────────────────
export const AUDIT_THRESHOLDS = {
  /** Maximum audit entries to keep in localStorage */
  MAX_STORED_ENTRIES: 500,
  /** Maximum age of audit entries before cleanup (30 days) */
  MAX_ENTRY_AGE_MS: 30 * 24 * 60 * 60 * 1000,
  /** Minimum audit completeness score for compliance */
  MIN_COMPLETENESS_SCORE: 70,
} as const;

// ── Unsafe Content Patterns ──────────────
export const UNSAFE_PATTERNS = {
  /** Terms that should never appear in AI output without disclaimer */
  DIAGNOSTIC_CLAIMS: [
    "you have", "you are diagnosed", "this confirms", "definitely",
    "certainly", "without doubt", "100%", "guaranteed",
  ],
  /** Terms requiring immediate disclaimer */
  TREATMENT_TERMS: [
    "take this medication", "you should take", "prescribe", "dosage",
    "start treatment", "stop taking",
  ],
  /** Alarming terms that need emotional moderation */
  ALARMING_TERMS: [
    "fatal", "terminal", "death", "dying", "worst case",
    "life-threatening", "dangerous", "critical condition",
  ],
} as const;

// ── Recovery & Resilience ────────────────
export const RECOVERY_THRESHOLDS = {
  /** Maximum time (ms) to consider a recovery checkpoint valid */
  CHECKPOINT_VALIDITY_MS: 4 * 60 * 60 * 1000, // 4 hours
  /** Maximum retries for session recovery */
  MAX_RECOVERY_RETRIES: 3,
  /** Minimum data required for recovery (conversation entries) */
  MIN_RECOVERY_DATA: 2,
} as const;

export type AllThresholds = {
  confidence: typeof CONFIDENCE_THRESHOLDS;
  escalation: typeof ESCALATION_THRESHOLDS;
  reasoning: typeof REASONING_THRESHOLDS;
  wearable: typeof WEARABLE_THRESHOLDS;
  emotional: typeof EMOTIONAL_THRESHOLDS;
  audit: typeof AUDIT_THRESHOLDS;
  recovery: typeof RECOVERY_THRESHOLDS;
};

export function getAllThresholds(): AllThresholds {
  return {
    confidence: CONFIDENCE_THRESHOLDS,
    escalation: ESCALATION_THRESHOLDS,
    reasoning: REASONING_THRESHOLDS,
    wearable: WEARABLE_THRESHOLDS,
    emotional: EMOTIONAL_THRESHOLDS,
    audit: AUDIT_THRESHOLDS,
    recovery: RECOVERY_THRESHOLDS,
  };
}
