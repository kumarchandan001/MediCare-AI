/**
 * PersonalizedCompanionEvolution — Tracks and manages the AI companion's
 * evolution over time, adapting personality, communication style, and
 * support strategies to each user's preferences and history.
 */
import { useCallback, useRef } from "react";

export interface CompanionPersonality {
  warmth: number;         // 0-100
  directness: number;     // 0-100
  encouragement: number;  // 0-100
  technicalDetail: number; // 0-100
  humorLevel: number;     // 0-100
  emotionalSensitivity: number; // 0-100
}

export interface CompanionEvolution {
  userId: string;
  interactionCount: number;
  relationshipStage: "new" | "developing" | "established" | "trusted" | "deep";
  personality: CompanionPersonality;
  learnedPreferences: LearnedPreference[];
  communicationStyle: "formal" | "warm" | "casual" | "clinical";
  evolutionHistory: { timestamp: number; change: string }[];
}

export interface LearnedPreference {
  category: string;
  preference: string;
  confidence: number;
  learnedFrom: "explicit" | "behavioral" | "feedback";
  lastConfirmed: number;
}

export function usePersonalizedCompanionEvolution() {
  const evolution = useRef<CompanionEvolution>({
    userId: "", interactionCount: 0, relationshipStage: "new",
    personality: { warmth: 70, directness: 50, encouragement: 75, technicalDetail: 40, humorLevel: 30, emotionalSensitivity: 70 },
    learnedPreferences: [], communicationStyle: "warm", evolutionHistory: [],
  });

  const recordInteraction = useCallback((feedback?: { helpful: boolean; tooVerbose: boolean; tooTechnical: boolean; emotionallySafe: boolean }) => {
    const e = evolution.current;
    e.interactionCount++;
    if (e.interactionCount > 100) e.relationshipStage = "deep";
    else if (e.interactionCount > 50) e.relationshipStage = "trusted";
    else if (e.interactionCount > 20) e.relationshipStage = "established";
    else if (e.interactionCount > 5) e.relationshipStage = "developing";
    if (feedback) {
      if (feedback.tooVerbose) e.personality.directness = Math.min(100, e.personality.directness + 5);
      if (feedback.tooTechnical) e.personality.technicalDetail = Math.max(0, e.personality.technicalDetail - 5);
      if (!feedback.emotionallySafe) e.personality.emotionalSensitivity = Math.min(100, e.personality.emotionalSensitivity + 10);
      if (feedback.helpful) e.personality.encouragement = Math.min(100, e.personality.encouragement + 2);
      e.evolutionHistory.push({ timestamp: Date.now(), change: `Adapted based on interaction #${e.interactionCount}` });
    }
  }, []);

  const learnPreference = useCallback((category: string, preference: string, source: LearnedPreference["learnedFrom"]) => {
    const existing = evolution.current.learnedPreferences.findIndex(p => p.category === category);
    const pref: LearnedPreference = { category, preference, confidence: 60, learnedFrom: source, lastConfirmed: Date.now() };
    if (existing >= 0) { evolution.current.learnedPreferences[existing] = { ...pref, confidence: Math.min(95, evolution.current.learnedPreferences[existing].confidence + 10) }; }
    else { evolution.current.learnedPreferences.push(pref); }
  }, []);

  const getEvolution = useCallback(() => ({ ...evolution.current }), []);

  return { recordInteraction, learnPreference, getEvolution };
}
