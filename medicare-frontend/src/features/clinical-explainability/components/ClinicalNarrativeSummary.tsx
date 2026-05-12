import React from "react";
import type { ClinicalStoryData } from "../explainability.service";

interface Props {
  story: ClinicalStoryData | null;
}

export default function ClinicalNarrativeSummary({ story }: Props) {
  if (!story) return null;

  return (
    <div className="ex-panel">
      <h3 className="ex-title">Clinical Narrative</h3>

      <div className="ex-narrative">{story.narrative}</div>

      {story.longitudinal && story.longitudinal.sessions_analyzed >= 2 && (
        <>
          <div className="ex-narrative ex-narrative-longitudinal">
            {story.longitudinal.narrative}
          </div>
          <p className="ex-dim" style={{ marginTop: "6px" }}>
            Sessions analyzed: {story.longitudinal.sessions_analyzed} &middot; Continuity: {Math.round(story.longitudinal.continuity_score * 100)}%
          </p>
        </>
      )}

      <div className="ex-safety">
        <p>
          This narrative reflects probabilistic clinical reasoning &mdash; <strong>not a diagnosis</strong>.
          Always consult a healthcare professional for medical decisions.
        </p>
      </div>
    </div>
  );
}
