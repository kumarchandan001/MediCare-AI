/**
 * NutritionSleepInteraction — Analyzes the specific interplay between
 * nutrition/meal timing and sleep quality. Identifies if late meals
 * or specific dietary patterns are correlating with sleep disruption.
 */
import { useCallback } from "react";
import type { DomainSignal } from "../UnifiedHealthEngine";

export interface NutritionSleepInsight {
  id: string;
  confidence: number;
  patternDetected: "late_meals" | "caffeine_timing" | "heavy_dinner" | "balanced" | "insufficient_data";
  description: string;
  actionableAdvice: string;
}

export function useNutritionSleepInteraction() {
  const analyze = useCallback((
    nutritionSignal?: DomainSignal,
    sleepSignal?: DomainSignal,
    recentMeals?: { time: number; type: "heavy" | "light" | "caffeine"; description: string }[]
  ): NutritionSleepInsight => {
    if (!nutritionSignal || !sleepSignal || !recentMeals || recentMeals.length === 0) {
      return {
        id: `ns-insufficient-${Date.now()}`,
        confidence: 0,
        patternDetected: "insufficient_data",
        description: "Not enough meal timing data to correlate with sleep quality.",
        actionableAdvice: "Log your meal times, especially in the evening, to see how they affect your sleep.",
      };
    }

    const sleepScore = sleepSignal.score;
    const now = new Date();
    
    // Look for late meals or late caffeine in recent logs
    const lateMeals = recentMeals.filter(meal => {
      const mealHour = new Date(meal.time).getHours();
      return mealHour >= 20; // After 8 PM
    });

    const lateCaffeine = recentMeals.filter(meal => {
      const mealHour = new Date(meal.time).getHours();
      return meal.type === "caffeine" && mealHour >= 14; // After 2 PM
    });

    if (sleepScore < 60 && lateCaffeine.length > 0) {
      return {
        id: `ns-caffeine-${Date.now()}`,
        confidence: 85,
        patternDetected: "caffeine_timing",
        description: "Afternoon or evening caffeine intake strongly correlates with your recent sleep difficulties.",
        actionableAdvice: "Try setting a firm caffeine cut-off time around 2 PM to see if sleep onset improves.",
      };
    }

    if (sleepScore < 60 && lateMeals.length > 0) {
      const heavyLate = lateMeals.some(m => m.type === "heavy");
      if (heavyLate) {
        return {
          id: `ns-heavy-dinner-${Date.now()}`,
          confidence: 80,
          patternDetected: "heavy_dinner",
          description: "Eating heavy meals late in the evening appears to be disrupting your restorative sleep.",
          actionableAdvice: "Aim to finish large meals at least 3 hours before your planned bedtime to allow for digestion.",
        };
      }
      return {
        id: `ns-late-meals-${Date.now()}`,
        confidence: 70,
        patternDetected: "late_meals",
        description: "Late eating patterns might be keeping your metabolism active when your body should be winding down.",
        actionableAdvice: "If you need a late snack, opt for something small and easy to digest.",
      };
    }

    if (sleepScore > 75) {
      return {
        id: `ns-balanced-${Date.now()}`,
        confidence: 90,
        patternDetected: "balanced",
        description: "Your current nutrition timing is supporting excellent sleep quality.",
        actionableAdvice: "Keep up your current eating schedule—it's working well for your rest.",
      };
    }

    return {
      id: `ns-neutral-${Date.now()}`,
      confidence: 40,
      patternDetected: "insufficient_data",
      description: "No strong negative correlation found between recent meal timing and sleep.",
      actionableAdvice: "Consistency in meal times can help regulate your circadian rhythm.",
    };
  }, []);

  return { analyze };
}
