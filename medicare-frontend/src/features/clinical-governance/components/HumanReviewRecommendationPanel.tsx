import React from "react";
import type { HumanReviewData } from "../governance.service";

interface Props {
  review: HumanReviewData | null;
}

export default function HumanReviewRecommendationPanel({ review }: Props) {
  if (!review || !review.should_recommend_review) return null;

  const urgColor = review.urgency === "high" ? "var(--gov-red)" : "var(--gov-amber)";

  return (
    <div className="gov-review">
      <h3 className="gov-title">
        Professional Review Recommended
        <span className="gov-badge" style={{ background: `${urgColor}15`, color: urgColor }}>
          {review.urgency} urgency
        </span>
      </h3>

      <p className="gov-review-action">{review.recommendation}</p>

      <div className="gov-review-triggers">
        {review.triggers.slice(0, 4).map((t, i) => (
          <div key={i} className="gov-review-trigger">
            <strong style={{ textTransform: "capitalize" }}>{t.type.replace(/_/g, " ")}</strong>: {t.reason}
          </div>
        ))}
      </div>
    </div>
  );
}
