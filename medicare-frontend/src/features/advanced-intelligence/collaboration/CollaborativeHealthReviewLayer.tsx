/**
 * CollaborativeHealthReviewLayer — Manages multi-party health review
 * workflows with role-based access and review state management.
 */
import { useCallback } from "react";

export interface HealthReview {
  id: string;
  status: "pending" | "in_review" | "needs_revision" | "approved" | "rejected";
  reviewers: { role: string; status: "pending" | "reviewed"; comments: string | null }[];
  healthSummary: string;
  aiFindings: string[];
  createdAt: number;
  lastUpdated: number;
}

export function useCollaborativeHealthReviewLayer() {
  const createReview = useCallback((summary: string, findings: string[]): HealthReview => ({
    id: `review-${Date.now()}`, status: "pending",
    reviewers: [{ role: "ai_system", status: "reviewed", comments: "AI analysis complete — awaiting clinical review" }],
    healthSummary: summary, aiFindings: findings, createdAt: Date.now(), lastUpdated: Date.now(),
  }), []);

  const addReviewer = useCallback((review: HealthReview, role: string): HealthReview => ({
    ...review, reviewers: [...review.reviewers, { role, status: "pending", comments: null }], lastUpdated: Date.now(),
  }), []);

  const submitReview = useCallback((review: HealthReview, role: string, comments: string, approved: boolean): HealthReview => {
    const reviewers = review.reviewers.map(r => r.role === role ? { ...r, status: "reviewed" as const, comments } : r);
    const allReviewed = reviewers.every(r => r.status === "reviewed");
    return { ...review, reviewers, status: allReviewed ? (approved ? "approved" : "needs_revision") : "in_review", lastUpdated: Date.now() };
  }, []);

  return { createReview, addReviewer, submitReview };
}
