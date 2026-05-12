/**
 * CrossSystemInsightHub — Dedicated panel for deep cross-system insights.
 * Shows how health domains interact, influence each other, and produce
 * compound effects. Progressive disclosure from summary to detail.
 */
import React, { useState, useMemo } from "react";
import { useUnifiedHealthContext } from "../UnifiedHealthStateProvider";
import { useCrossSystemReasoning } from "../reasoning/CrossSystemReasoningEngine";
import type { HealthDomain } from "../UnifiedHealthEngine";

export default function CrossSystemInsightHub() {
  const ctx = useUnifiedHealthContext();
  const reasoning = useCrossSystemReasoning();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const analysis = useMemo(() => {
    if (!ctx.unifiedState) return null;
    return reasoning.reason({
      signals: ctx.unifiedState.domainSignals,
      recentEvents: [],
    });
  }, [ctx.unifiedState, reasoning]);

  if (!analysis) return null;

  return (
    <div style={{
      padding: "20px", borderRadius: "16px",
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <h3 style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.9)", fontSize: "15px" }}>
        🔗 Cross-System Intelligence
      </h3>
      <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
        How your health systems interact and influence each other
      </p>

      {/* Overall Assessment */}
      <div style={{
        padding: "14px", borderRadius: "12px", marginBottom: "16px",
        background: "rgba(162,155,254,0.06)", border: "1px solid rgba(162,155,254,0.12)",
      }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "13px", lineHeight: 1.6 }}>
          {analysis.overallAssessment}
        </p>
      </div>

      {/* Recommended Focus */}
      {analysis.recommendedFocus.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "8px" }}>
            Recommended Focus Areas
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {analysis.recommendedFocus.map(domain => (
              <span key={domain} style={{
                padding: "5px 12px", borderRadius: "10px", fontSize: "12px",
                background: "rgba(255,107,107,0.08)", color: "#ff6b6b",
                border: "1px solid rgba(255,107,107,0.15)",
              }}>
                {getDomainLabel(domain)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Amplifiers */}
      {analysis.riskAmplifiers.length > 0 && (
        <CollapsibleSection
          title="⚠️ Risk Amplifiers"
          subtitle={`${analysis.riskAmplifiers.length} interaction${analysis.riskAmplifiers.length > 1 ? "s" : ""} amplifying risk`}
          isOpen={expandedSection === "risks"}
          onToggle={() => setExpandedSection(expandedSection === "risks" ? null : "risks")}
        >
          {analysis.riskAmplifiers.map((amp, i) => (
            <div key={i} style={{
              padding: "12px", borderRadius: "10px", marginBottom: "8px",
              background: "rgba(255,107,107,0.04)", borderLeft: "3px solid rgba(255,107,107,0.3)",
            }}>
              <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>
                {amp.description}
              </p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "12px", fontStyle: "italic" }}>
                💡 {amp.mitigationSuggestion}
              </p>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Protective Factors */}
      {analysis.protectiveFactors.length > 0 && (
        <CollapsibleSection
          title="🛡️ Protective Factors"
          subtitle={`${analysis.protectiveFactors.length} factor${analysis.protectiveFactors.length > 1 ? "s" : ""} supporting your health`}
          isOpen={expandedSection === "protective"}
          onToggle={() => setExpandedSection(expandedSection === "protective" ? null : "protective")}
        >
          {analysis.protectiveFactors.map((pf, i) => (
            <div key={i} style={{
              padding: "12px", borderRadius: "10px", marginBottom: "8px",
              background: "rgba(0,184,148,0.04)", borderLeft: "3px solid rgba(0,184,148,0.3)",
            }}>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "13px" }}>
                {pf.description}
              </p>
              <div style={{
                marginTop: "6px", height: "4px", borderRadius: "2px",
                background: "rgba(255,255,255,0.06)", width: "100px",
              }}>
                <div style={{
                  height: "100%", borderRadius: "2px", width: `${pf.protectionScore}%`,
                  background: "#00b894",
                }} />
              </div>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {/* Detailed Insights */}
      {analysis.insights.length > 0 && (
        <CollapsibleSection
          title="🔍 Detailed Interactions"
          subtitle={`${analysis.insights.length} cross-domain insight${analysis.insights.length > 1 ? "s" : ""}`}
          isOpen={expandedSection === "insights"}
          onToggle={() => setExpandedSection(expandedSection === "insights" ? null : "insights")}
        >
          {analysis.insights.map(insight => (
            <div key={insight.id} style={{
              padding: "12px", borderRadius: "10px", marginBottom: "8px",
              background: "rgba(255,255,255,0.03)",
            }}>
              <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                {insight.sourceDomains.map(d => (
                  <span key={d} style={{
                    fontSize: "10px", padding: "2px 6px", borderRadius: "6px",
                    background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)",
                  }}>
                    {getDomainLabel(d)}
                  </span>
                ))}
              </div>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5 }}>
                {insight.insight}
              </p>
            </div>
          ))}
        </CollapsibleSection>
      )}

      {analysis.insights.length === 0 && analysis.riskAmplifiers.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.4)", fontSize: "13px" }}>
          No significant cross-system interactions detected. As more data accumulates, deeper patterns will emerge.
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, subtitle, isOpen, onToggle, children }: {
  title: string; subtitle: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div onClick={onToggle} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: "10px", cursor: "pointer",
        background: "rgba(255,255,255,0.03)", transition: "all 0.2s ease",
      }}>
        <div>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: 600 }}>{title}</span>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginLeft: "8px" }}>{subtitle}</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▼</span>
      </div>
      {isOpen && <div style={{ padding: "10px 0 0" }}>{children}</div>}
    </div>
  );
}

function getDomainLabel(domain: HealthDomain): string {
  const labels: Record<string, string> = {
    disease_intelligence: "Investigation", wearable: "Wearable", recovery: "Recovery",
    sleep: "Sleep", activity: "Activity", nutrition: "Nutrition", medication: "Medication",
    wellness: "Wellness", coaching: "Coaching", preventive: "Preventive", emotional: "Emotional",
  };
  return labels[domain] || domain;
}
