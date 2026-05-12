/**
 * RecoveryConsistencyMetrics — Evaluates whether the predicted recovery
 * timeline matches the actual physical recovery tracked via wearables and
 * subjective check-ins.
 */

export interface ConsistencyMetrics {
  predictionAccuracy: number; // Percentage
  averageDeviationDays: number;
  bias: "optimistic" | "pessimistic" | "neutral";
}

export function useRecoveryConsistencyMetrics() {
  const evaluate = (
    predictions: { predictedDays: number, actualDays: number }[]
  ): ConsistencyMetrics => {
    if (predictions.length === 0) {
      return { predictionAccuracy: 100, averageDeviationDays: 0, bias: "neutral" };
    }

    let totalDeviation = 0;
    let biasSum = 0; // positive = optimistic (predicted less days than actual)

    predictions.forEach(p => {
      const diff = p.actualDays - p.predictedDays;
      totalDeviation += Math.abs(diff);
      biasSum += diff;
    });

    const avgDev = totalDeviation / predictions.length;
    // Accuracy drops by 10% for every day of deviation
    const accuracy = Math.max(0, 100 - (avgDev * 10));

    let bias: "optimistic" | "pessimistic" | "neutral" = "neutral";
    const avgBias = biasSum / predictions.length;
    
    if (avgBias > 1) bias = "optimistic"; // Actual took longer than predicted
    else if (avgBias < -1) bias = "pessimistic"; // Actual was faster than predicted

    return {
      predictionAccuracy: accuracy,
      averageDeviationDays: avgDev,
      bias
    };
  };

  return { evaluate };
}
