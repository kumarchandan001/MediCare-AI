import React from "react";
import { temporalClinicalService } from "../temporal-clinical.service";
import type { LongitudinalSnapshot, SeverityData, TriageData, WearableTrustData } from "../temporal-clinical.service";
import SymptomEvolutionTimeline from "./SymptomEvolutionTimeline";
import DeteriorationRiskPanel from "./DeteriorationRiskPanel";
import RecoveryProgressView from "./RecoveryProgressView";
import SeverityStateMonitor from "./SeverityStateMonitor";
import EscalationPredictionPanel from "./EscalationPredictionPanel";
import WearableClinicalFusionView from "./WearableClinicalFusionView";
import LongitudinalInvestigationView from "./LongitudinalInvestigationView";
import ClinicalTrendExplorer from "./ClinicalTrendExplorer";
import TemporalExplainabilityPanel from "./TemporalExplainabilityPanel";

interface Props {
  sessionId: string | null;
  userId?: string;
}

export default function TemporalClinicalWorkspace({ sessionId, userId = "current_user" }: Props) {
  const [snapshot, setSnapshot] = React.useState<LongitudinalSnapshot | null>(null);
  const [severity, setSeverity] = React.useState<SeverityData | null>(null);
  const [triage, setTriage] = React.useState<TriageData | null>(null);
  const [wearableTrust, setWearableTrust] = React.useState<WearableTrustData | null>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [activeView, setActiveView] = React.useState<"overview" | "evolution" | "explain">("overview");

  const fetchData = React.useCallback(async () => {
    if (!sessionId) return;
    try {
      const [snapRes, sevRes, triRes, trustRes] = await Promise.allSettled([
        temporalClinicalService.getSnapshot(sessionId, userId),
        temporalClinicalService.getSeverity(sessionId),
        temporalClinicalService.getTriage(sessionId),
        temporalClinicalService.getWearableTrust(sessionId),
      ]);
      if (snapRes.status === "fulfilled") setSnapshot((snapRes.value as any)?.data || null);
      if (sevRes.status === "fulfilled") setSeverity((sevRes.value as any)?.data || null);
      if (triRes.status === "fulfilled") setTriage((triRes.value as any)?.data || null);
      if (trustRes.status === "fulfilled") setWearableTrust((trustRes.value as any)?.data || null);
    } catch {
      // Temporal data may not be available yet
    }
  }, [sessionId, userId]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  React.useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [sessionId, fetchData]);

  if (!sessionId) return null;

  if (!snapshot && !severity) {
    return (
      <div className="tc-panel" style={{ textAlign: "center" }}>
        <p style={{ fontSize: ".78rem", color: "var(--tc-text-dim)" }}>
          Temporal monitoring will activate as the investigation progresses.
        </p>
      </div>
    );
  }

  const views = [
    { key: "overview" as const, label: "Overview" },
    { key: "evolution" as const, label: "Evolution" },
    { key: "explain" as const, label: "Insights" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button className="tc-collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? "▶ Show Monitoring" : "▼ Continuous Monitoring"}
      </button>

      {!collapsed && (
        <>
          {/* Severity at top — always visible */}
          <SeverityStateMonitor severity={severity} triage={triage} />

          {/* View tabs */}
          <div className="dr-tabs">
            {views.map((v) => (
              <button
                key={v.key}
                className={`dr-tab ${activeView === v.key ? "dr-tab-active" : ""}`}
                onClick={() => setActiveView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {activeView === "overview" && snapshot && (
            <>
              <ClinicalTrendExplorer
                trajectory={snapshot.trajectory}
                deterioration={snapshot.deterioration}
                recovery={snapshot.recovery}
                escalation={snapshot.escalation}
              />
              <DeteriorationRiskPanel deterioration={snapshot.deterioration} />
              <RecoveryProgressView recovery={snapshot.recovery} />
              <EscalationPredictionPanel escalation={snapshot.escalation} />
              <WearableClinicalFusionView trust={wearableTrust} />
            </>
          )}

          {activeView === "evolution" && snapshot && (
            <>
              <SymptomEvolutionTimeline evolution={snapshot.symptom_evolution} />
              <LongitudinalInvestigationView snapshot={snapshot} />
            </>
          )}

          {activeView === "explain" && snapshot && (
            <TemporalExplainabilityPanel snapshot={snapshot} />
          )}
        </>
      )}
    </div>
  );
}
