import React from "react";
import type { LongitudinalSnapshot, FollowUpData } from "../temporal-clinical.service";

interface Props {
  snapshot: LongitudinalSnapshot | null;
}

export default function LongitudinalInvestigationView({ snapshot }: Props) {
  if (!snapshot) return null;

  const { narrative, follow_up, recurrence, trajectory } = snapshot;

  return (
    <div className="tc-panel">
      <h3 className="tc-section-title">
        Longitudinal Summary
        <span className="tc-badge" style={{
          background: trajectory.trajectory === "improving" ? "var(--tc-teal-dim)" :
            trajectory.trajectory === "deteriorating" ? "var(--tc-red-dim)" :
            trajectory.trajectory === "fluctuating" ? "var(--tc-amber-dim)" : "var(--tc-surface-hover)",
          color: trajectory.trajectory === "improving" ? "var(--tc-teal)" :
            trajectory.trajectory === "deteriorating" ? "var(--tc-red)" :
            trajectory.trajectory === "fluctuating" ? "var(--tc-amber)" : "var(--tc-text-dim)",
        }}>
          {trajectory.trajectory}
        </span>
      </h3>

      {/* Clinical narrative */}
      <div className="tc-narrative">{narrative}</div>

      {/* Recurrence */}
      {recurrence.is_recurring && (
        <p style={{ fontSize: ".75rem", color: "var(--tc-purple)", marginTop: "8px" }}>
          Recurring pattern detected ({recurrence.matching_episodes} prior episodes).
          {recurrence.recurring_conditions.length > 0 && (
            <> Most associated: {recurrence.recurring_conditions[0].condition}.</>
          )}
        </p>
      )}

      {/* Follow-up */}
      <div className="tc-follow-up">
        <p className="tc-follow-up-timing">
          Next check-in: ~{follow_up.follow_up_hours}h · {follow_up.type.replace(/_/g, " ")}
        </p>
        {follow_up.prompts.map((p, i) => (
          <div key={i} className="tc-follow-up-prompt">{p}</div>
        ))}
      </div>
    </div>
  );
}
