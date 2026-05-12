/**
 * TemporalHealthStateProvider — Global longitudinal health state.
 * Manages persistent health memory across sessions: investigation history,
 * wearable continuity, recurring patterns, daily status, and recovery tracking.
 * Persists to localStorage for cross-session continuity.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

// ── Investigation history entry ──────────
export interface HealthInvestigation {
  id: string;
  date: string;
  timestamp: number;
  primaryFinding: string;
  confidence: number;
  symptoms: string[];
  escalationLevel: string;
  outcome?: "resolved" | "monitoring" | "worsened" | "recurring" | "unknown";
  recoveryScore?: number;
  governanceSummary?: string;
  followUpDue?: string;
}

// ── Daily status snapshot ────────────────
export interface DailyHealthStatus {
  date: string;
  timestamp: number;
  mood: "good" | "okay" | "poor" | "unknown";
  reportedSymptoms: string[];
  energyLevel: number;      // 0-100
  sleepQuality: number;     // 0-100
  painLevel: number;        // 0-10
  notes: string;
  wearableSynced: boolean;
  checkinCompleted: boolean;
}

// ── Recurring pattern ────────────────────
export interface RecurringPattern {
  id: string;
  symptomCluster: string[];
  occurrences: number;
  lastSeen: string;
  firstSeen: string;
  averageInterval: number;  // days
  associatedConditions: string[];
  severity: "mild" | "moderate" | "concerning";
  trend: "stable" | "increasing" | "decreasing";
}

// ── Wearable continuity snapshot ─────────
export interface WearableContinuity {
  lastSyncTimestamp: number;
  restingHR: { current: number; baseline: number; trend: "stable" | "rising" | "falling" };
  hrv: { current: number; baseline: number; trend: "stable" | "rising" | "falling" };
  sleepScore: { current: number; baseline: number; trend: "stable" | "improving" | "declining" };
  stressLevel: { current: number; baseline: number; trend: "stable" | "rising" | "falling" };
  stepsTrend: "active" | "sedentary" | "recovering" | "unknown";
  driftDetected: boolean;
  driftDetails?: string;
  reliabilityScore: number; // 0-100
}

// ── Recovery tracking ────────────────────
export interface RecoveryState {
  isRecovering: boolean;
  activeCondition: string;
  startDate: string;
  currentDay: number;
  stabilityScore: number;   // 0-100
  milestones: { label: string; reached: boolean; date?: string }[];
  relapseProbability: number;
  trend: "improving" | "stable" | "fragile" | "declining";
}

// ── Follow-up intelligence ───────────────
export interface PendingFollowUp {
  id: string;
  investigationId: string;
  condition: string;
  dueDate: string;
  urgency: "routine" | "soon" | "overdue";
  reason: string;
  adaptivePrompts: string[];
}

// ── Longitudinal narrative ───────────────
export interface JourneyNarrative {
  id: string;
  timestamp: number;
  text: string;
  type: "continuity" | "recovery" | "pattern" | "wearable" | "milestone" | "awareness";
}

// ── Context value ────────────────────────
interface TemporalHealthContextValue {
  // Investigation history
  investigations: HealthInvestigation[];
  addInvestigation: (inv: HealthInvestigation) => void;
  updateInvestigationOutcome: (id: string, outcome: HealthInvestigation["outcome"]) => void;

  // Daily status
  dailyStatuses: DailyHealthStatus[];
  todayStatus: DailyHealthStatus | null;
  recordDailyStatus: (status: Omit<DailyHealthStatus, "date" | "timestamp">) => void;

  // Recurring patterns
  recurringPatterns: RecurringPattern[];
  detectPatterns: (symptoms: string[]) => void;

  // Wearable continuity
  wearableContinuity: WearableContinuity;
  updateWearableContinuity: (update: Partial<WearableContinuity>) => void;

  // Recovery
  activeRecovery: RecoveryState | null;
  startRecoveryTracking: (condition: string) => void;
  updateRecoveryProgress: (update: Partial<RecoveryState>) => void;

  // Follow-ups
  pendingFollowUps: PendingFollowUp[];
  addFollowUp: (followUp: PendingFollowUp) => void;
  dismissFollowUp: (id: string) => void;

  // Journey narratives
  journeyNarratives: JourneyNarrative[];
  addJourneyNarrative: (entry: Omit<JourneyNarrative, "id" | "timestamp">) => void;

  // Computed helpers
  totalInvestigations: number;
  lastInvestigation: HealthInvestigation | null;
  unresolvedConditions: string[];
  healthTrend: "improving" | "stable" | "declining" | "unknown";
  daysMonitored: number;
  hasActiveFollowUps: boolean;
  overduFollowUps: PendingFollowUp[];
}

const TemporalHealthContext = createContext<TemporalHealthContextValue | null>(null);

const STORAGE_KEY = "medicare_longitudinal_health";

export function useTemporalHealth() {
  const ctx = useContext(TemporalHealthContext);
  if (!ctx) throw new Error("useTemporalHealth must be used inside TemporalHealthStateProvider");
  return ctx;
}

// ── Persist / restore from localStorage ──
function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function persistState(state: Record<string, any>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export default function TemporalHealthStateProvider({ children }: { children: React.ReactNode }) {
  const persisted = loadPersistedState();

  // ── Investigations ─────────────────────
  const [investigations, setInvestigations] = useState<HealthInvestigation[]>(
    persisted?.investigations || []
  );

  // ── Daily statuses ─────────────────────
  const [dailyStatuses, setDailyStatuses] = useState<DailyHealthStatus[]>(
    persisted?.dailyStatuses || []
  );

  // ── Recurring patterns ─────────────────
  const [recurringPatterns, setRecurringPatterns] = useState<RecurringPattern[]>(
    persisted?.recurringPatterns || []
  );

  // ── Wearable continuity ────────────────
  const [wearableContinuity, setWearableContinuity] = useState<WearableContinuity>(
    persisted?.wearableContinuity || {
      lastSyncTimestamp: 0,
      restingHR: { current: 0, baseline: 72, trend: "stable" },
      hrv: { current: 0, baseline: 45, trend: "stable" },
      sleepScore: { current: 0, baseline: 75, trend: "stable" },
      stressLevel: { current: 0, baseline: 30, trend: "stable" },
      stepsTrend: "unknown",
      driftDetected: false,
      reliabilityScore: 0,
    }
  );

  // ── Recovery ───────────────────────────
  const [activeRecovery, setActiveRecovery] = useState<RecoveryState | null>(
    persisted?.activeRecovery || null
  );

  // ── Follow-ups ─────────────────────────
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>(
    persisted?.pendingFollowUps || []
  );

  // ── Journey narratives ─────────────────
  const [journeyNarratives, setJourneyNarratives] = useState<JourneyNarrative[]>(
    persisted?.journeyNarratives?.slice(-20) || []
  );

  // ── Persist on change ──────────────────
  useEffect(() => {
    persistState({
      investigations: investigations.slice(-50),
      dailyStatuses: dailyStatuses.slice(-30),
      recurringPatterns,
      wearableContinuity,
      activeRecovery,
      pendingFollowUps,
      journeyNarratives: journeyNarratives.slice(-20),
    });
  }, [investigations, dailyStatuses, recurringPatterns, wearableContinuity, activeRecovery, pendingFollowUps, journeyNarratives]);

  // ── Investigation helpers ──────────────
  const addInvestigation = useCallback((inv: HealthInvestigation) => {
    setInvestigations(prev => [...prev, inv]);
  }, []);

  const updateInvestigationOutcome = useCallback((id: string, outcome: HealthInvestigation["outcome"]) => {
    setInvestigations(prev => prev.map(inv =>
      inv.id === id ? { ...inv, outcome } : inv
    ));
  }, []);

  // ── Daily status helpers ───────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const todayStatus = dailyStatuses.find(s => s.date === todayStr) || null;

  const recordDailyStatus = useCallback((status: Omit<DailyHealthStatus, "date" | "timestamp">) => {
    const date = new Date().toISOString().split("T")[0];
    setDailyStatuses(prev => {
      const filtered = prev.filter(s => s.date !== date);
      return [...filtered, { ...status, date, timestamp: Date.now() }];
    });
  }, []);

  // ── Pattern detection ──────────────────
  const detectPatterns = useCallback((symptoms: string[]) => {
    if (symptoms.length === 0) return;
    const todayDate = new Date().toISOString().split("T")[0];

    setRecurringPatterns(prev => {
      const updated = [...prev];
      symptoms.forEach(sym => {
        const existing = updated.find(p => p.symptomCluster.includes(sym));
        if (existing) {
          existing.occurrences += 1;
          existing.lastSeen = todayDate;
          if (existing.occurrences >= 3) existing.severity = "concerning";
          else if (existing.occurrences >= 2) existing.severity = "moderate";
        } else {
          updated.push({
            id: `pat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            symptomCluster: [sym],
            occurrences: 1,
            lastSeen: todayDate,
            firstSeen: todayDate,
            averageInterval: 0,
            associatedConditions: [],
            severity: "mild",
            trend: "stable",
          });
        }
      });
      return updated;
    });
  }, []);

  // ── Wearable helpers ───────────────────
  const updateWearableContinuity = useCallback((update: Partial<WearableContinuity>) => {
    setWearableContinuity(prev => ({ ...prev, ...update }));
  }, []);

  // ── Recovery helpers ───────────────────
  const startRecoveryTracking = useCallback((condition: string) => {
    setActiveRecovery({
      isRecovering: true,
      activeCondition: condition,
      startDate: new Date().toISOString().split("T")[0],
      currentDay: 1,
      stabilityScore: 50,
      milestones: [
        { label: "Symptoms reported", reached: true, date: new Date().toISOString().split("T")[0] },
        { label: "Investigation complete", reached: true, date: new Date().toISOString().split("T")[0] },
        { label: "First follow-up", reached: false },
        { label: "Symptom improvement", reached: false },
        { label: "Recovery confirmed", reached: false },
      ],
      relapseProbability: 0.3,
      trend: "stable",
    });
  }, []);

  const updateRecoveryProgress = useCallback((update: Partial<RecoveryState>) => {
    setActiveRecovery(prev => prev ? { ...prev, ...update } : null);
  }, []);

  // ── Follow-up helpers ──────────────────
  const addFollowUp = useCallback((followUp: PendingFollowUp) => {
    setPendingFollowUps(prev => [...prev, followUp]);
  }, []);

  const dismissFollowUp = useCallback((id: string) => {
    setPendingFollowUps(prev => prev.filter(f => f.id !== id));
  }, []);

  // ── Narrative helpers ──────────────────
  const addJourneyNarrative = useCallback((entry: Omit<JourneyNarrative, "id" | "timestamp">) => {
    setJourneyNarratives(prev => [...prev, {
      ...entry,
      id: `jn-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    }]);
  }, []);

  // ── Computed values ────────────────────
  const totalInvestigations = investigations.length;
  const lastInvestigation = investigations.length > 0 ? investigations[investigations.length - 1] : null;

  const unresolvedConditions = investigations
    .filter(i => i.outcome !== "resolved" && i.outcome !== "unknown")
    .map(i => i.primaryFinding)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const healthTrend = useMemo(() => {
    if (activeRecovery) {
      if (activeRecovery.trend === "improving") return "improving" as const;
      if (activeRecovery.trend === "declining") return "declining" as const;
      return "stable" as const;
    }
    if (investigations.length === 0) return "unknown" as const;
    const recent = investigations.slice(-3);
    const hasWorsened = recent.some(i => i.outcome === "worsened" || i.outcome === "recurring");
    if (hasWorsened) return "declining" as const;
    return "stable" as const;
  }, [activeRecovery, investigations]);

  const daysMonitored = useMemo(() => {
    if (investigations.length === 0 && dailyStatuses.length === 0) return 0;
    const earliest = Math.min(
      ...(investigations.length > 0 ? [investigations[0].timestamp] : [Date.now()]),
      ...(dailyStatuses.length > 0 ? [dailyStatuses[0].timestamp] : [Date.now()])
    );
    return Math.max(1, Math.ceil((Date.now() - earliest) / 86400000));
  }, [investigations, dailyStatuses]);

  const hasActiveFollowUps = pendingFollowUps.length > 0;
  const overduFollowUps = pendingFollowUps.filter(f => f.urgency === "overdue");

  const value = useMemo<TemporalHealthContextValue>(() => ({
    investigations, addInvestigation, updateInvestigationOutcome,
    dailyStatuses, todayStatus, recordDailyStatus,
    recurringPatterns, detectPatterns,
    wearableContinuity, updateWearableContinuity,
    activeRecovery, startRecoveryTracking, updateRecoveryProgress,
    pendingFollowUps, addFollowUp, dismissFollowUp,
    journeyNarratives, addJourneyNarrative,
    totalInvestigations, lastInvestigation, unresolvedConditions,
    healthTrend, daysMonitored, hasActiveFollowUps, overduFollowUps,
  }), [
    investigations, dailyStatuses, todayStatus, recurringPatterns,
    wearableContinuity, activeRecovery, pendingFollowUps,
    journeyNarratives, totalInvestigations, lastInvestigation,
    unresolvedConditions, healthTrend, daysMonitored,
    hasActiveFollowUps, overduFollowUps,
    addInvestigation, updateInvestigationOutcome, recordDailyStatus,
    detectPatterns, updateWearableContinuity, startRecoveryTracking,
    updateRecoveryProgress, addFollowUp, dismissFollowUp,
    addJourneyNarrative,
  ]);

  return (
    <TemporalHealthContext.Provider value={value}>
      {children}
    </TemporalHealthContext.Provider>
  );
}
