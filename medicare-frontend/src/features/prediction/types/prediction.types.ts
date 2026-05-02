// ── Symptom / Feature types ──────────────────────

export interface FeatureContribution {
  symptom:          string;
  display_name:     string;
  severity_score:   number;
  max_severity:     number;
  contribution_pct: number;
  severity_label:   "Critical" | "High" | "Moderate" | "Low";
  // Additional engine fields (optional for backwards compat)
  importance?:    number;
  contribution?:  number;
}

export interface ConfidenceBreakdown {
  // All fields optional — engine v2 and v3 use different subsets
  overall?:             number;
  symptom_match?:       number;
  pattern_strength?:    number;
  severity_alignment?:  number;
  confidence_level?:    string;
  // v3 corrected engine fields:
  display_confidence?:  number;
  raw_rf_probability?:  number;
  correction_applied?:  boolean;
  // Legacy aliases:
  raw_confidence?:      number;
  model_certainty?:     number;
  symptom_match_pct?:   number;
  evidence_weight?:     number;
}

export interface AlternativeDiagnosis {
  disease:      string;
  probability:  number;   // XAIPanel uses this for bar width
  reason:       string;
  confidence:   number | string;
  description?: string;
  precautions?: string[];
}

export interface RiskFactor {
  symptom:  string;
  display:  string;
  message:  string;
  level:    "critical" | "high" | "moderate";
  icon:     string;
  factor?:  string;
  score?:   number;
}

// ── XAI Result ───────────────────────────────────

export interface XAIResult {
  // XAIPanel-required fields:
  feature_contributions:     FeatureContribution[];
  top_contributing_symptoms: FeatureContribution[];
  confidence_breakdown:      ConfidenceBreakdown;
  risk_factors:              RiskFactor[];
  alternative_diagnoses:     AlternativeDiagnosis[];
  evidence_strength:         string;
  xai_summary:               string;
  explanation_score:         number;
  symptom_weights:           Record<string, unknown>;
  total_symptoms:            number;
  total_severity:            number;
  // Additional enriched fields:
  evidence_score?:            number;
  symptom_contributions?:     FeatureContribution[];
  total_symptoms_selected?:   number;
  symptoms_matched?:          number;
  symptoms_unmatched?:        number;
  severity_summary?:          Record<string, number>;
  who_context?:               WHOContext | null;
  lifestyle_context?:         LifestyleContext | null;
}

// ── WHO Types ────────────────────────────────────

export interface WHOCountry {
  code:       string;
  name:       string;
  region:     string;
  risk_level: "Low" | "Moderate" | "High" | "Very High";
}

export interface WHOAdjustment {
  original_confidence:  number;
  adjusted_confidence:  number;
  adjustment_factor:    number;
  country_name:         string;
  region:               string;
  who_risk_score:       number | null;
  who_risk_level:       string;
  relevant_indicators:  Record<string, number>;
  adjustment_reason:    string;
}

export interface WHOContext {
  country:    string | null;
  region:     string | null;
  risk_level: string | null;
  risk_score: number | null;
  key_data:   Record<string, number>;
  reason:     string | null;
}

// ── Lifestyle Types ──────────────────────────────

export interface LifestyleInput {
  smoker?:       boolean;
  drinker?:      boolean;
  diabetic?:     boolean;
  hypertensive?: boolean;
  age_group?:    "young" | "middle" | "senior";
  bmi_category?: "normal" | "overweight" | "obese";
}

export interface LifestyleAdjustment {
  risk_delta:       number;
  risk_boosts:      string[];
  new_risk_level:   string;
  lifestyle_factors: Record<string, unknown>;
}

export interface LifestyleContext {
  risk_delta: number;
  boosters:   string[];
  new_risk:   string;
}

// ── Prediction Result ────────────────────────────

export interface PredictionResult {
  predicted_disease:    string;
  confidence:           number;
  raw_confidence?:      number;   // raw RF/LGB top-class probability
  risk_level:           string;
  description:          string;
  precautions:          string[];
  matched_symptoms:     string[];
  unmatched_symptoms:   string[];
  symptoms_analyzed:    number;
  who_adjustment:       WHOAdjustment | null;
  lifestyle_adjustment: LifestyleAdjustment | null;
  xai:                  XAIResult;
  model_info?: {
    algorithm:        string;
    accuracy:         number;
    trained_at:       string;
    confidence_mode?: string;
  };
  // Legacy:
  top_symptoms?: string[];
}

// ── Symptoms / Data Types ────────────────────────

export interface SymptomCategory {
  [category: string]: string[];
}

export interface SymptomsData {
  symptoms:   string[];
  categories: SymptomCategory;
  total:      number;
}

export interface PredictionHistoryItem {
  id:                number;
  symptoms:          string;
  predicted_disease: string;
  confidence:        number;
  xai_summary?:      string;
  evidence_strength?: string;
  created_at:        string;
}

export interface CountriesData {
  countries: WHOCountry[];
  total:     number;
}
