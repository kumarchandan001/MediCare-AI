/**
 * CalmStateProvider — Global calm-mode context
 *
 * Wraps the application and derives visual-intensity parameters from
 * the user's physiological context. Components consume via useAdaptiveCalmMode().
 *
 * The provider smoothly transitions between calm levels using a debounced
 * evaluation to avoid flicker when metrics are volatile.
 */
import React, { createContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  CalmLevel,
  determineCalmLevel,
  getCalmVisualParams,
  getTimeOfDaySoftening,
  type CalmVisualParams,
  type PhysiologicalContext,
} from "@/utils/AdaptiveCalmModeManager";

// ── Context shape ────────────────────────
export interface CalmContextValue {
  level: CalmLevel;
  params: CalmVisualParams;
  /** Manual override to force a calm level (e.g., user settings) */
  setOverride: (level: CalmLevel | null) => void;
  /** Update the physiological context (usually from WebSocket/store) */
  updatePhysiologicalContext: (ctx: PhysiologicalContext) => void;
}

export const CalmContext = createContext<CalmContextValue | null>(null);

// ── Default context ──────────────────────
const DEFAULT_CONTEXT: PhysiologicalContext = {
  stressLevel: 25,
  burnoutRisk: 15,
  cognitiveLoad: 0.3,
  recoveryBandwidth: 0.7,
  emotionalStrain: 0.15,
};

interface Props {
  children: React.ReactNode;
  /** Initial physiological context */
  initialContext?: PhysiologicalContext;
  /** Debounce (ms) before switching calm levels */
  debounceMs?: number;
}

export function CalmStateProvider({
  children,
  initialContext = DEFAULT_CONTEXT,
  debounceMs = 3000,
}: Props) {
  const [override, setOverride] = useState<CalmLevel | null>(null);
  const [physioCtx, setPhysioCtx] = useState<PhysiologicalContext>(initialContext);
  const [activeLevel, setActiveLevel] = useState<CalmLevel>(() => determineCalmLevel(initialContext));
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced level evaluation — prevents flicker from noisy metrics
  useEffect(() => {
    if (override) {
      setActiveLevel(override);
      return;
    }

    const proposed = determineCalmLevel(physioCtx);
    if (proposed === activeLevel) return;

    // Escalating to calmer is faster than de-escalating
    const delay = proposed > activeLevel ? debounceMs * 0.5 : debounceMs;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setActiveLevel(proposed);
    }, delay);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [physioCtx, override, activeLevel, debounceMs]);

  const updatePhysiologicalContext = useCallback((ctx: PhysiologicalContext) => {
    setPhysioCtx(ctx);
  }, []);

  // Apply time-of-day softening on top of base params
  const params = useMemo(() => {
    const base = getCalmVisualParams(activeLevel);
    const todFactor = getTimeOfDaySoftening();

    if (todFactor === 0) return base;

    return {
      ...base,
      glowOpacity: Math.max(0.2, base.glowOpacity - todFactor),
      accentIntensity: Math.max(0.3, base.accentIntensity - todFactor * 0.5),
    };
  }, [activeLevel]);

  const value = useMemo<CalmContextValue>(
    () => ({
      level: activeLevel,
      params,
      setOverride,
      updatePhysiologicalContext,
    }),
    [activeLevel, params, updatePhysiologicalContext],
  );

  return (
    <CalmContext.Provider value={value}>
      {/* Apply global contrast filter */}
      <div
        style={{
          filter: params.contrastFilter,
          transition: `filter ${params.transitionSpeed}`,
          minHeight: "100%",
        }}
      >
        {children}
      </div>
    </CalmContext.Provider>
  );
}
