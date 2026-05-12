/**
 * CrossDomainTimeline — Visual timeline component showing all health
 * events across domains in a single, filterable view. Uses color-coded
 * domain indicators and calm, progressive-disclosure design.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useUnifiedHealthMemory, type HealthMemoryEntry } from "./UnifiedHealthMemory";
import type { HealthDomain } from "../UnifiedHealthEngine";

interface CrossDomainTimelineProps {
  daysBack?: number;
  filterDomains?: HealthDomain[];
  maxEntries?: number;
  compact?: boolean;
}

const DOMAIN_COLORS: Record<HealthDomain, string> = {
  disease_intelligence: "#ff6b6b",
  wearable: "#4ecdc4",
  recovery: "#45b7d1",
  sleep: "#6c5ce7",
  activity: "#00b894",
  nutrition: "#fdcb6e",
  medication: "#e17055",
  wellness: "#a29bfe",
  coaching: "#55a3f0",
  preventive: "#00cec9",
  emotional: "#fd79a8",
};

const DOMAIN_ICONS: Record<HealthDomain, string> = {
  disease_intelligence: "🔬",
  wearable: "⌚",
  recovery: "💚",
  sleep: "🌙",
  activity: "🏃",
  nutrition: "🥗",
  medication: "💊",
  wellness: "✨",
  coaching: "🧭",
  preventive: "🛡️",
  emotional: "🧠",
};

const DOMAIN_LABELS: Record<HealthDomain, string> = {
  disease_intelligence: "Investigation",
  wearable: "Wearable",
  recovery: "Recovery",
  sleep: "Sleep",
  activity: "Activity",
  nutrition: "Nutrition",
  medication: "Medication",
  wellness: "Wellness",
  coaching: "Coaching",
  preventive: "Preventive",
  emotional: "Emotional",
};

export default function CrossDomainTimeline({
  daysBack = 30,
  filterDomains,
  maxEntries = 50,
  compact = false,
}: CrossDomainTimelineProps) {
  const memory = useUnifiedHealthMemory();
  const [entries, setEntries] = useState<HealthMemoryEntry[]>([]);
  const [activeDomainFilter, setActiveDomainFilter] = useState<Set<HealthDomain>>(
    new Set(filterDomains || [])
  );
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    const startDate = Date.now() - daysBack * 86_400_000;
    memory.getTimeline(startDate, Date.now(), filterDomains).then(results => {
      setEntries(results.slice(0, maxEntries));
    });
  }, [memory, daysBack, filterDomains, maxEntries]);

  const filteredEntries = useMemo(() => {
    if (activeDomainFilter.size === 0) return entries;
    return entries.filter(e => activeDomainFilter.has(e.domain));
  }, [entries, activeDomainFilter]);

  const toggleDomainFilter = useCallback((domain: HealthDomain) => {
    setActiveDomainFilter(prev => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, HealthMemoryEntry[]> = {};
    for (const entry of filteredEntries) {
      const dateKey = new Date(entry.timestamp).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(entry);
    }
    return groups;
  }, [filteredEntries]);

  const availableDomains = useMemo(() => {
    const domains = new Set<HealthDomain>();
    entries.forEach(e => domains.add(e.domain));
    return [...domains];
  }, [entries]);

  return (
    <div className="cross-domain-timeline" style={{
      padding: compact ? "12px" : "20px",
      background: "rgba(255,255,255,0.02)",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <h3 style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: compact ? "14px" : "16px" }}>
          Health Timeline
        </h3>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
          {filteredEntries.length} events across {availableDomains.length} domains
        </p>
      </div>

      {/* Domain Filters */}
      {!compact && availableDomains.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
          {availableDomains.map(domain => (
            <button
              key={domain}
              onClick={() => toggleDomainFilter(domain)}
              style={{
                padding: "4px 10px",
                borderRadius: "12px",
                border: `1px solid ${DOMAIN_COLORS[domain]}40`,
                background: activeDomainFilter.has(domain) || activeDomainFilter.size === 0
                  ? `${DOMAIN_COLORS[domain]}20` : "transparent",
                color: DOMAIN_COLORS[domain],
                fontSize: "11px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                opacity: activeDomainFilter.size === 0 || activeDomainFilter.has(domain) ? 1 : 0.4,
              }}
            >
              {DOMAIN_ICONS[domain]} {DOMAIN_LABELS[domain]}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {Object.entries(groupedByDate).map(([dateLabel, dayEntries]) => (
          <div key={dateLabel}>
            <div style={{
              fontSize: "11px", color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.5px",
              marginBottom: "8px", fontWeight: 600,
            }}>
              {dateLabel}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "12px", borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
              {dayEntries.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  style={{
                    padding: compact ? "8px 12px" : "10px 14px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                    borderLeft: `3px solid ${DOMAIN_COLORS[entry.domain]}`,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>{DOMAIN_ICONS[entry.domain]}</span>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", flex: 1 }}>
                      {entry.summary}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", whiteSpace: "nowrap" }}>
                      {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {expandedEntry === entry.id && entry.metadata && (
                    <div style={{
                      marginTop: "8px", paddingTop: "8px",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      fontSize: "12px", color: "rgba(255,255,255,0.5)",
                    }}>
                      {entry.score !== undefined && (
                        <div>Score: <strong style={{ color: DOMAIN_COLORS[entry.domain] }}>{entry.score}/100</strong></div>
                      )}
                      {entry.tags.length > 0 && (
                        <div style={{ marginTop: "4px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {entry.tags.map(tag => (
                            <span key={tag} style={{
                              padding: "2px 6px", borderRadius: "6px",
                              background: "rgba(255,255,255,0.06)", fontSize: "10px",
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredEntries.length === 0 && (
          <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
            No health events recorded yet. Your timeline will build as you use the platform.
          </div>
        )}
      </div>
    </div>
  );
}
