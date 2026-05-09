import React from "react";

interface ContextData {
  age?: number;
  gender?: string;
  chronic_conditions?: string[];
  recent_sleep_quality?: string;
  wearable_heart_rate?: string;
}

interface Props {
  context: ContextData | null;
  symptoms: string[];
}

export default function InterviewContextSidebar({ context, symptoms }: Props) {
  return (
    <aside className="ci-context-sidebar">
      <h4 className="ci-sidebar-title">Patient Context</h4>

      {/* Active symptoms */}
      {symptoms.length > 0 && (
        <div className="ci-sidebar-section">
          <span className="ci-sidebar-label">Active Symptoms</span>
          <div className="ci-symptom-tags">
            {symptoms.map((s) => (
              <span key={s} className="ci-symptom-tag">
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Context info */}
      {context && (
        <>
          {context.age && (
            <div className="ci-sidebar-row">
              <span className="ci-sidebar-label">Age</span>
              <span className="ci-sidebar-value">{context.age}</span>
            </div>
          )}
          {context.gender && (
            <div className="ci-sidebar-row">
              <span className="ci-sidebar-label">Gender</span>
              <span className="ci-sidebar-value">{context.gender}</span>
            </div>
          )}
          {context.recent_sleep_quality && (
            <div className="ci-sidebar-row">
              <span className="ci-sidebar-label">Sleep Quality</span>
              <span className="ci-sidebar-value">{context.recent_sleep_quality}</span>
            </div>
          )}
          {context.wearable_heart_rate && (
            <div className="ci-sidebar-row">
              <span className="ci-sidebar-label">Heart Rate</span>
              <span className="ci-sidebar-value">{context.wearable_heart_rate}</span>
            </div>
          )}
          {context.chronic_conditions && context.chronic_conditions.length > 0 && (
            <div className="ci-sidebar-section">
              <span className="ci-sidebar-label">Chronic Conditions</span>
              <div className="ci-symptom-tags">
                {context.chronic_conditions.map((c) => (
                  <span key={c} className="ci-symptom-tag ci-chronic-tag">{c}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!context && symptoms.length === 0 && (
        <p className="ci-sidebar-empty">Context will appear as you share information.</p>
      )}
    </aside>
  );
}
