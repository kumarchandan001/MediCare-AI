/**
 * CrossSystemOrchestrator — Event-driven orchestrator for inter-system
 * communication. When one health domain changes, it propagates effects
 * to dependent domains via an influence graph. Ensures all systems
 * behave as ONE interconnected ecosystem, not isolated modules.
 */
import { useCallback, useRef } from "react";
import type { HealthDomain, DomainSignal, DomainAlert } from "./UnifiedHealthEngine";

// ── Event Types ──────────────────────────
export interface DomainEvent {
  id: string;
  sourceDomain: HealthDomain;
  eventType: "signal_update" | "alert_raised" | "trend_change" | "domain_activated" | "domain_deactivated";
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface PropagationResult {
  affectedDomains: HealthDomain[];
  adjustments: DomainAdjustment[];
  narrative: string;
}

export interface DomainAdjustment {
  targetDomain: HealthDomain;
  adjustmentType: "score_modifier" | "confidence_modifier" | "alert_injection" | "trend_override";
  value: number;
  reason: string;
}

// ── Influence Graph ──────────────────────
// Defines how changes in one domain propagate to others.
// Format: source → { target: influence_strength (0-1) }
const INFLUENCE_GRAPH: Record<string, Record<string, number>> = {
  sleep: {
    recovery: 0.65, activity: 0.45, wellness: 0.55,
    emotional: 0.50, disease_intelligence: 0.20, preventive: 0.30,
  },
  activity: {
    recovery: 0.50, sleep: 0.35, wellness: 0.50,
    preventive: 0.25, emotional: 0.20,
  },
  recovery: {
    disease_intelligence: 0.55, wellness: 0.45,
    activity: 0.30, medication: 0.20, preventive: 0.25,
  },
  emotional: {
    sleep: 0.40, wellness: 0.50, recovery: 0.25,
    disease_intelligence: 0.15, preventive: 0.20,
  },
  medication: {
    recovery: 0.60, disease_intelligence: 0.35,
    wellness: 0.20, preventive: 0.15,
  },
  wearable: {
    disease_intelligence: 0.30, recovery: 0.25,
    activity: 0.35, sleep: 0.20, preventive: 0.20,
  },
  nutrition: {
    wellness: 0.50, recovery: 0.35, activity: 0.25,
    sleep: 0.15, preventive: 0.30,
  },
  disease_intelligence: {
    recovery: 0.40, emotional: 0.30, medication: 0.25,
    preventive: 0.35,
  },
  preventive: {
    wellness: 0.30, coaching: 0.40,
  },
  coaching: {
    wellness: 0.20, emotional: 0.15,
  },
};

export function useCrossSystemOrchestrator() {
  const eventLogRef = useRef<DomainEvent[]>([]);

  /**
   * Propagate a domain event through the influence graph.
   * Returns adjustments that should be applied to dependent domains.
   */
  const propagateEvent = useCallback((event: DomainEvent): PropagationResult => {
    // Log event
    eventLogRef.current.push(event);
    if (eventLogRef.current.length > 200) {
      eventLogRef.current = eventLogRef.current.slice(-100);
    }

    const affectedDomains: HealthDomain[] = [];
    const adjustments: DomainAdjustment[] = [];
    const influences = INFLUENCE_GRAPH[event.sourceDomain] || {};

    for (const [targetDomain, strength] of Object.entries(influences)) {
      const target = targetDomain as HealthDomain;
      affectedDomains.push(target);

      if (event.eventType === "signal_update") {
        const scoreChange = ((event.payload.newScore as number) || 50) - 50;
        const modifier = Math.round(scoreChange * strength * 0.3);

        if (Math.abs(modifier) > 2) {
          adjustments.push({
            targetDomain: target,
            adjustmentType: "score_modifier",
            value: modifier,
            reason: `${formatDomain(event.sourceDomain)} ${scoreChange > 0 ? "improvement" : "decline"} influencing ${formatDomain(target)}`,
          });
        }
      }

      if (event.eventType === "trend_change") {
        const newTrend = event.payload.newTrend as string;
        if (newTrend === "declining" && strength > 0.4) {
          adjustments.push({
            targetDomain: target,
            adjustmentType: "confidence_modifier",
            value: -Math.round(strength * 10),
            reason: `${formatDomain(event.sourceDomain)} decline reducing confidence in ${formatDomain(target)} assessment`,
          });
        }
      }

      if (event.eventType === "alert_raised") {
        const alertLevel = event.payload.level as string;
        if (alertLevel === "urgent" && strength > 0.5) {
          adjustments.push({
            targetDomain: target,
            adjustmentType: "alert_injection",
            value: 1,
            reason: `Urgent ${formatDomain(event.sourceDomain)} alert may affect ${formatDomain(target)}`,
          });
        }
      }
    }

    // Generate propagation narrative
    const narrative = adjustments.length > 0
      ? `Changes in ${formatDomain(event.sourceDomain)} are influencing ${adjustments.length} other health dimension${adjustments.length > 1 ? "s" : ""}.`
      : `${formatDomain(event.sourceDomain)} update noted — no significant cross-system effects detected.`;

    return { affectedDomains, adjustments, narrative };
  }, []);

  /**
   * Get all domains influenced by a source domain.
   */
  const getInfluencedDomains = useCallback((source: HealthDomain): { domain: HealthDomain; strength: number }[] => {
    const influences = INFLUENCE_GRAPH[source] || {};
    return Object.entries(influences)
      .map(([domain, strength]) => ({ domain: domain as HealthDomain, strength }))
      .sort((a, b) => b.strength - a.strength);
  }, []);

  /**
   * Get all domains that influence a target domain.
   */
  const getInfluencingDomains = useCallback((target: HealthDomain): { domain: HealthDomain; strength: number }[] => {
    const results: { domain: HealthDomain; strength: number }[] = [];
    for (const [source, targets] of Object.entries(INFLUENCE_GRAPH)) {
      if (targets[target]) {
        results.push({ domain: source as HealthDomain, strength: targets[target] });
      }
    }
    return results.sort((a, b) => b.strength - a.strength);
  }, []);

  /**
   * Get recent event log for observability.
   */
  const getEventLog = useCallback(() => [...eventLogRef.current], []);

  return { propagateEvent, getInfluencedDomains, getInfluencingDomains, getEventLog };
}

function formatDomain(domain: HealthDomain): string {
  const labels: Record<string, string> = {
    disease_intelligence: "Disease Intelligence",
    wearable: "Wearable Data",
    recovery: "Recovery",
    sleep: "Sleep",
    activity: "Activity",
    nutrition: "Nutrition",
    medication: "Medication",
    wellness: "Wellness",
    coaching: "Coaching",
    preventive: "Preventive Health",
    emotional: "Emotional Wellbeing",
  };
  return labels[domain] || domain;
}
