/**
 * GovernanceConfidenceTracker — Tracks how confident clinical governance
 * reviewers are in the AI system's outputs over time. A declining governance
 * confidence is a hard stop signal for deployment.
 */
import { useCallback, useState } from "react";

export interface GovernanceReview {
  reviewerId: string;
  timestamp: number;
  confidenceScore: number; // 0-100
  concerns: string[];
  approvedForDeployment: boolean;
}

export function useGovernanceConfidenceTracker() {
  const [reviews, setReviews] = useState<GovernanceReview[]>([]);

  const submitReview = useCallback((review: Omit<GovernanceReview, "timestamp">) => {
    const entry: GovernanceReview = { ...review, timestamp: Date.now() };
    setReviews(prev => [...prev, entry]);
    return entry;
  }, []);

  const getGovernanceStatus = useCallback(() => {
    if (reviews.length === 0) {
      return { status: "pending" as const, avgConfidence: 0, deploymentApproved: false };
    }

    const avgConfidence = reviews.reduce((a, r) => a + r.confidenceScore, 0) / reviews.length;
    const allApproved = reviews.every(r => r.approvedForDeployment);
    const hasCriticalConcerns = reviews.some(r => r.concerns.length > 2);

    let status: "approved" | "blocked" | "pending" = "pending";
    if (allApproved && avgConfidence >= 85 && !hasCriticalConcerns) {
      status = "approved";
    } else if (avgConfidence < 60 || hasCriticalConcerns) {
      status = "blocked";
    }

    return { status, avgConfidence, deploymentApproved: status === "approved" };
  }, [reviews]);

  return { reviews, submitReview, getGovernanceStatus };
}
