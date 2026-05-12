/**
 * InvestigationStabilityScorer — Measures how stable a clinical investigation
 * remains as new data streams in. High stability means the AI formed a strong
 * initial hypothesis that stood the test of evidence. Low stability means
 * "thrashing" (jumping between unrelated diagnoses).
 */
export interface StabilityScore {
  score: number; // 0 (thrashing) to 100 (highly stable)
  status: "stable" | "refining" | "thrashing";
}

export function useInvestigationStabilityScorer() {
  const calculateStability = (hypothesisHistory: string[]): StabilityScore => {
    if (hypothesisHistory.length <= 1) {
      return { score: 100, status: "stable" };
    }

    let shifts = 0;
    for (let i = 1; i < hypothesisHistory.length; i++) {
      if (hypothesisHistory[i] !== hypothesisHistory[i - 1]) {
        shifts++;
      }
    }

    // simplistic calculation
    const shiftRatio = shifts / hypothesisHistory.length;
    const score = Math.max(0, 100 - (shiftRatio * 100 * 2)); // Penalty multiplier

    let status: StabilityScore["status"] = "stable";
    if (score < 40) status = "thrashing";
    else if (score < 80) status = "refining";

    return { score, status };
  };

  return { calculateStability };
}
