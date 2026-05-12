/**
 * OversightReviewCoordinator — Coordinates clinical oversight reviews
 * with structured approval workflows and accountability tracking.
 */
import { useCallback } from "react";

export interface OversightReview {
  id: string;
  type: "ai_output" | "escalation" | "care_plan" | "medication" | "investigation";
  status: "pending" | "in_review" | "approved" | "rejected" | "revision_needed";
  contentSummary: string;
  reviewer: string | null;
  reviewedAt: number | null;
  decision: string | null;
  auditTrail: { action: string; actor: string; timestamp: number }[];
}

export function useOversightReviewCoordinator() {
  const createReview = useCallback((type: OversightReview["type"], summary: string): OversightReview => ({
    id: `review-${Date.now()}`, type, status: "pending", contentSummary: summary,
    reviewer: null, reviewedAt: null, decision: null,
    auditTrail: [{ action: "Review created", actor: "system", timestamp: Date.now() }],
  }), []);

  const submitReview = useCallback((review: OversightReview, reviewer: string, approved: boolean, decision: string): OversightReview => ({
    ...review, status: approved ? "approved" : "rejected", reviewer, reviewedAt: Date.now(), decision,
    auditTrail: [...review.auditTrail, { action: approved ? "Approved" : "Rejected", actor: reviewer, timestamp: Date.now() }],
  }), []);

  return { createReview, submitReview };
}
