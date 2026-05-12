/**
 * ClinicalCollaborationEngine — Manages clinical collaboration sessions
 * with role-based access, evidence sharing, and audit trails.
 */
import { useCallback, useRef } from "react";

export interface CollaborationSession {
  id: string;
  type: "case_review" | "care_coordination" | "second_opinion" | "multidisciplinary";
  status: "scheduled" | "active" | "paused" | "completed" | "archived";
  participants: CollaborationParticipant[];
  sharedEvidence: SharedEvidence[];
  createdAt: number;
  lastActivity: number;
  summary: string | null;
  disclaimer: string;
}

export interface CollaborationParticipant {
  role: "patient" | "ai_companion" | "physician" | "specialist" | "care_coordinator";
  joinedAt: number;
  permissions: ("view" | "comment" | "edit" | "approve")[];
  verified: boolean;
}

export interface SharedEvidence {
  type: "health_summary" | "investigation" | "wearable_data" | "lab_result" | "imaging" | "note";
  title: string;
  source: string;
  sharedAt: number;
  aiGenerated: boolean;
  confidenceScore: number | null;
}

export function useClinicalCollaborationEngine() {
  const sessions = useRef<Map<string, CollaborationSession>>(new Map());

  const createSession = useCallback((type: CollaborationSession["type"]): CollaborationSession => {
    const session: CollaborationSession = {
      id: `collab-${Date.now()}`, type, status: "scheduled",
      participants: [{ role: "ai_companion", joinedAt: Date.now(), permissions: ["view", "comment"], verified: true }],
      sharedEvidence: [], createdAt: Date.now(), lastActivity: Date.now(), summary: null,
      disclaimer: "Clinical collaboration workspace — AI contributions require clinical validation before clinical use",
    };
    sessions.current.set(session.id, session);
    return session;
  }, []);

  const addParticipant = useCallback((sessionId: string, participant: CollaborationParticipant): boolean => {
    const session = sessions.current.get(sessionId);
    if (!session) return false;
    session.participants.push(participant);
    session.lastActivity = Date.now();
    return true;
  }, []);

  const shareEvidence = useCallback((sessionId: string, evidence: SharedEvidence): boolean => {
    const session = sessions.current.get(sessionId);
    if (!session) return false;
    session.sharedEvidence.push(evidence);
    session.lastActivity = Date.now();
    return true;
  }, []);

  return { createSession, addParticipant, shareEvidence, getSessions: () => Array.from(sessions.current.values()) };
}
