import React from "react";

interface Props {
  completeness: number;
  ambiguity: number;
  stage: string;
  symptomCount: number;
  evidenceSufficiency: string;
  reasoningConfidence: number;
}

const STAGE_ORDER = [
  "initial_intake",
  "symptom_clarification",
  "severity_exploration",
  "context_refinement",
  "risk_assessment",
  "investigation_summary",
  "monitoring_recommendations",
];

const STAGE_LABELS: Record<string, string> = {
  initial_intake: "Initial Intake",
  symptom_clarification: "Symptom Clarification",
  severity_exploration: "Severity Exploration",
  context_refinement: "Context Refinement",
  risk_assessment: "Risk Assessment",
  investigation_summary: "Investigation Summary",
  monitoring_recommendations: "Monitoring",
};

export default function InvestigationProgressTracker({
  completeness,
  ambiguity,
  stage,
  symptomCount,
  evidenceSufficiency,
  reasoningConfidence,
}: Props) {
  const pct = Math.round(completeness * 100);
  const currentStageIdx = STAGE_ORDER.indexOf(stage);

  return (
    <div className="ci-progress-tracker">
      <h3 className="ci-progress-title">Investigation Progress</h3>

      {/* Main progress ring */}
      <div className="ci-progress-ring-wrap">
        <svg viewBox="0 0 120 120" className="ci-progress-ring">
          <circle cx="60" cy="60" r="52" className="ci-ring-bg" />
          <circle
            cx="60"
            cy="60"
            r="52"
            className="ci-ring-fill"
            strokeDasharray={`${pct * 3.27} 327`}
            strokeDashoffset="0"
          />
        </svg>
        <div className="ci-progress-ring-label">
          <span className="ci-progress-pct">{pct}%</span>
          <span className="ci-progress-sub">Complete</span>
        </div>
      </div>

      {/* Stage pipeline */}
      <div className="ci-stage-pipeline">
        {STAGE_ORDER.map((s, i) => (
          <div
            key={s}
            className={`ci-stage-pip ${
              i < currentStageIdx
                ? "ci-stage-done"
                : i === currentStageIdx
                ? "ci-stage-active"
                : "ci-stage-pending"
            }`}
          >
            <span className="ci-pip-dot" />
            <span className="ci-pip-label">{STAGE_LABELS[s]}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="ci-progress-stats">
        <div className="ci-stat-card">
          <span className="ci-stat-value">{symptomCount}</span>
          <span className="ci-stat-label">Symptoms tracked</span>
        </div>
        <div className="ci-stat-card">
          <span className="ci-stat-value">{Math.round(ambiguity * 100)}%</span>
          <span className="ci-stat-label">Remaining ambiguity</span>
        </div>
        <div className="ci-stat-card">
          <span className="ci-stat-value">{Math.round(reasoningConfidence * 100)}%</span>
          <span className="ci-stat-label">Confidence</span>
        </div>
        <div className="ci-stat-card">
          <span className={`ci-stat-value ci-evidence-${evidenceSufficiency}`}>
            {evidenceSufficiency === "sufficient" ? "✓" : "…"}
          </span>
          <span className="ci-stat-label">Evidence</span>
        </div>
      </div>
    </div>
  );
}
