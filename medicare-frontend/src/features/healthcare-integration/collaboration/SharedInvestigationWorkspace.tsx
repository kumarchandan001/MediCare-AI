/**
 * SharedInvestigationWorkspace — Provides a structured workspace for
 * sharing AI investigations with clinical collaborators.
 */
import { useCallback } from "react";

export interface InvestigationWorkspace {
  id: string;
  title: string;
  status: "preparing" | "shared" | "under_review" | "reviewed" | "closed";
  findings: WorkspaceFinding[];
  reviewComments: { author: string; comment: string; timestamp: number }[];
  createdAt: number;
  disclaimer: string;
}

export interface WorkspaceFinding {
  domain: string;
  finding: string;
  evidence: string[];
  confidence: number;
  clinicalRelevance: "high" | "moderate" | "low";
  requiresValidation: boolean;
}

export function useSharedInvestigationWorkspace() {
  const createWorkspace = useCallback((title: string, findings: WorkspaceFinding[]): InvestigationWorkspace => ({
    id: `ws-${Date.now()}`, title, status: "preparing",
    findings: findings.map(f => ({ ...f, requiresValidation: true })),
    reviewComments: [], createdAt: Date.now(),
    disclaimer: "AI-generated investigation workspace. All findings require independent clinical validation.",
  }), []);

  const addReviewComment = useCallback((workspace: InvestigationWorkspace, author: string, comment: string): InvestigationWorkspace => ({
    ...workspace, reviewComments: [...workspace.reviewComments, { author, comment, timestamp: Date.now() }], status: "under_review",
  }), []);

  return { createWorkspace, addReviewComment };
}
