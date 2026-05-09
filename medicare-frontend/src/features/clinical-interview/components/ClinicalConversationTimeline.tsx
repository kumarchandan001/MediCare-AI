import React from "react";

interface TimelineEntry {
  id: string;
  type: "question" | "answer" | "escalation" | "stage_change";
  text: string;
  timestamp: number;
  stage?: string;
}

interface Props {
  entries: TimelineEntry[];
}

export type { TimelineEntry };

export default function ClinicalConversationTimeline({ entries }: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="ci-timeline-empty">
        <div className="ci-timeline-empty-icon">🩺</div>
        <p>Your clinical investigation will appear here.</p>
      </div>
    );
  }

  return (
    <div className="ci-timeline">
      {entries.map((entry, i) => (
        <div
          key={entry.id || i}
          className={`ci-timeline-entry ci-timeline-${entry.type}`}
        >
          {entry.type === "stage_change" ? (
            <div className="ci-stage-divider">
              <span className="ci-stage-divider-line" />
              <span className="ci-stage-divider-label">{entry.text}</span>
              <span className="ci-stage-divider-line" />
            </div>
          ) : entry.type === "escalation" ? (
            <div className="ci-escalation-bubble">
              <span className="ci-escalation-icon">⚠️</span>
              <p>{entry.text}</p>
            </div>
          ) : (
            <div className={`ci-bubble ci-bubble-${entry.type}`}>
              <p>{entry.text}</p>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
