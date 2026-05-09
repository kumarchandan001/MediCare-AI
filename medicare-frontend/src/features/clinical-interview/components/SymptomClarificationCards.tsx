import React from "react";

const CLARIFICATION_FIELDS = [
  { key: "onset", label: "When did it start?", placeholder: "e.g. 2 days ago" },
  { key: "duration", label: "How long does it last?", placeholder: "e.g. constant, intermittent" },
  { key: "severity", label: "Severity (1–10)", placeholder: "1 = mild, 10 = worst" },
  { key: "triggers", label: "Known triggers?", placeholder: "e.g. food, stress, exertion" },
];

interface Props {
  symptom: string;
  onSubmit: (symptom: string, details: Record<string, string>) => void;
  onSkip: () => void;
}

export default function SymptomClarificationCards({ symptom, onSubmit, onSkip }: Props) {
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(symptom, fields);
    setFields({});
  };

  return (
    <div className="ci-clarification-card">
      <h4 className="ci-clarification-title">
        Tell me more about your <span className="ci-symptom-highlight">{symptom}</span>
      </h4>
      <form className="ci-clarification-form" onSubmit={handleSubmit}>
        {CLARIFICATION_FIELDS.map((f) => (
          <label key={f.key} className="ci-clarification-field">
            <span>{f.label}</span>
            <input
              type="text"
              placeholder={f.placeholder}
              value={fields[f.key] || ""}
              onChange={(e) => handleChange(f.key, e.target.value)}
            />
          </label>
        ))}
        <div className="ci-clarification-actions">
          <button type="submit" className="ci-clarification-submit">Submit Details</button>
          <button type="button" className="ci-clarification-skip" onClick={onSkip}>Skip for now</button>
        </div>
      </form>
    </div>
  );
}
