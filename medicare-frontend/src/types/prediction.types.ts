/**
 * Prediction Types — Disease prediction & AI analysis models
 */

export interface PredictionRequest {
  symptoms: string[];
  duration_days?: number;
  severity?: "mild" | "moderate" | "severe";
  additional_info?: string;
}

export interface PredictionResult {
  id: string;
  predicted_conditions: PredictedCondition[];
  risk_assessment: string;
  confidence: number;
  recommended_actions: string[];
  disclaimer: string;
  timestamp: string;
}

export interface PredictedCondition {
  name: string;
  probability: number;
  severity: "low" | "medium" | "high";
  description: string;
  specialist: string;
}

export interface PredictionHistory {
  predictions: PredictionResult[];
  total: number;
}
