import React from "react";
import type { InterviewQuestion } from "../api/clinicalInterview.service";

interface Props {
  question: InterviewQuestion | null;
  onRespond: (questionId: string, text: string) => void;
  isLoading: boolean;
  stage: string;
}

const STAGE_LABELS: Record<string, string> = {
  initial_intake: "Getting started",
  symptom_clarification: "Understanding your symptoms",
  severity_exploration: "Assessing severity",
  context_refinement: "Refining context",
  risk_assessment: "Evaluating risk",
  investigation_summary: "Summarising findings",
  monitoring_recommendations: "Recommendations",
};

export default function AdaptiveQuestionPanel({ question, onRespond, isLoading, stage }: Props) {
  const [freeText, setFreeText] = React.useState("");

  if (!question) return null;

  const handleOption = (option: string) => {
    onRespond(question.id, option);
  };

  const handleFreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeText.trim()) return;
    onRespond(question.id, freeText.trim());
    setFreeText("");
  };

  return (
    <div className="ci-question-panel">
      {/* Stage indicator */}
      <div className="ci-stage-badge">
        <span className="ci-stage-dot" />
        {STAGE_LABELS[stage] || stage}
      </div>

      {/* Question */}
      <p className="ci-question-text">{question.text}</p>

      {/* Options */}
      {question.options && question.options.length > 0 && (
        <div className="ci-options-grid">
          {question.options.map((opt) => (
            <button
              key={opt}
              className="ci-option-btn"
              onClick={() => handleOption(opt)}
              disabled={isLoading}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Free-text input (always available) */}
      <form className="ci-free-input" onSubmit={handleFreeSubmit}>
        <input
          type="text"
          className="ci-text-field"
          placeholder="Or describe in your own words…"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="ci-send-btn" disabled={isLoading || !freeText.trim()}>
          {isLoading ? (
            <span className="ci-loading-dots"><span /><span /><span /></span>
          ) : "Send"}
        </button>
      </form>
    </div>
  );
}
