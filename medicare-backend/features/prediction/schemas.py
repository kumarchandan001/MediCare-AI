from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ── Request Schemas ──────────────────────────────

class LifestyleInput(BaseModel):
    smoker:       Optional[bool] = False
    drinker:      Optional[bool] = False
    diabetic:     Optional[bool] = False
    hypertensive: Optional[bool] = False
    age_group:    Optional[str]  = "middle"   # young | middle | senior
    bmi_category: Optional[str]  = "normal"   # normal | overweight | obese


class PredictRequest(BaseModel):
    symptoms: List[str] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="List of symptom strings",
    )
    country_code: Optional[str] = Field(
        default=None,
        description="ISO3 country code e.g. IND, USA, GBR",
    )
    lifestyle: Optional[LifestyleInput] = None


# ── XAI Schemas ──────────────────────────────────

class FeatureContribution(BaseModel):
    symptom:         str
    display_name:    str
    severity_score:  int
    max_severity:    int
    contribution_pct: float
    severity_label:  str


class ConfidenceBreakdown(BaseModel):
    overall:            float
    symptom_match:      float
    pattern_strength:   float
    severity_alignment: float
    confidence_level:   str


class AlternativeDiagnosis(BaseModel):
    disease:     str
    probability: float
    reason:      str
    confidence:  Any  # float or string


class RiskFactor(BaseModel):
    symptom:  str
    display:  str
    message:  str
    level:    str  # critical | high | moderate
    icon:     str


class XAIResult(BaseModel):
    feature_contributions:     List[FeatureContribution]
    top_contributing_symptoms: List[FeatureContribution]
    confidence_breakdown:      ConfidenceBreakdown
    risk_factors:              List[RiskFactor]
    alternative_diagnoses:     List[AlternativeDiagnosis]
    evidence_strength:         str
    xai_summary:               str
    explanation_score:         float
    symptom_weights:           Dict[str, Any]
    total_symptoms:            int
    total_severity:            int


# ── WHO / Lifestyle Schemas ───────────────────────

class WHOAdjustment(BaseModel):
    original_confidence:  float
    adjusted_confidence:  float
    adjustment_factor:    float
    country_name:         str
    region:               str
    who_risk_score:       Optional[float]
    who_risk_level:       str
    relevant_indicators:  Dict[str, float]
    adjustment_reason:    str


class LifestyleAdjustment(BaseModel):
    risk_delta:       float
    risk_boosts:      List[str]
    new_risk_level:   str
    lifestyle_factors: Dict[str, Any]


# ── Response Schemas ─────────────────────────────

class PredictionResponse(BaseModel):
    predicted_disease:    str
    confidence:           float
    risk_level:           str
    description:          str
    precautions:          List[str]
    matched_symptoms:     List[str]
    unmatched_symptoms:   List[str]
    symptoms_analyzed:    int
    who_adjustment:       Optional[WHOAdjustment]
    lifestyle_adjustment: Optional[LifestyleAdjustment]
    xai:                  XAIResult


class PredictionHistoryItem(BaseModel):
    id:               int
    symptoms:         str
    predicted_disease: str
    confidence:       float
    xai_summary:      Optional[str] = None
    evidence_strength: Optional[str] = None
    created_at:       str


class SymptomListResponse(BaseModel):
    symptoms:   List[str]
    categories: Dict[str, List[str]]
    total:      int


class WHOCountry(BaseModel):
    code:       str
    name:       str
    region:     str
    risk_level: str
