/**
 * HealthJourneyCompanion — Provides continuous, empathetic companionship
 * throughout the user's health journey with milestone tracking.
 */
import { useCallback, useRef } from "react";

export interface JourneyMilestone {
  id: string;
  title: string;
  description: string;
  achievedAt: number;
  category: "health" | "engagement" | "knowledge" | "behavioral" | "emotional";
  celebration: string;
}

export interface JourneySummary {
  totalDays: number;
  milestones: JourneyMilestone[];
  currentPhase: "onboarding" | "learning" | "growing" | "thriving" | "mentoring";
  narrative: string;
}

export function useHealthJourneyCompanion() {
  const milestones = useRef<JourneyMilestone[]>([]);

  const addMilestone = useCallback((title: string, description: string, category: JourneyMilestone["category"]): JourneyMilestone => {
    const celebrations = { health: "Your health journey just leveled up! 🌟", engagement: "Your consistency is inspiring! 💪", knowledge: "Growing in health awareness! 📚", behavioral: "New healthy habits forming! 🌱", emotional: "Emotional growth is real growth! 💙" };
    const milestone: JourneyMilestone = { id: `ms-${Date.now()}`, title, description, achievedAt: Date.now(), category, celebration: celebrations[category] };
    milestones.current.push(milestone);
    return milestone;
  }, []);

  const getJourneySummary = useCallback((startDate: number): JourneySummary => {
    const totalDays = Math.floor((Date.now() - startDate) / 86400000);
    let phase: JourneySummary["currentPhase"] = "onboarding";
    if (totalDays > 180 && milestones.current.length > 20) phase = "mentoring";
    else if (totalDays > 90 && milestones.current.length > 10) phase = "thriving";
    else if (totalDays > 30) phase = "growing";
    else if (totalDays > 7) phase = "learning";
    const narratives = { onboarding: "Welcome to your health journey. We're just getting started.", learning: "You're building understanding of your health patterns.", growing: "Your health awareness is deepening — real progress.", thriving: "You've developed strong health intelligence. Keep going!", mentoring: "You're a health journey veteran. Your insights are valuable." };
    return { totalDays, milestones: [...milestones.current], currentPhase: phase, narrative: narratives[phase] };
  }, []);

  return { addMilestone, getJourneySummary };
}
