"""
health_intelligence/schemas/health_profile.py
───────────────────────────────────────────────
Unified Health Profile schemas for the Health
Intelligence Core.

All schemas are timestamp-ready for future time-series
health tracking, longitudinal analysis, and trend
intelligence.

Terminology:
  - health risk assessment (not diagnosis)
  - preventive monitoring (not treatment)
  - risk profiling (not clinical decision)
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


# ── Enums ────────────────────────────────────────────────────

class SeverityLevel(str, Enum):
    """Risk severity tiers used across the intelligence pipeline."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    EMERGENCY = "emergency"


class UncertaintyLevel(str, Enum):
    """Calibrated uncertainty for confidence reporting."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


# ── Timestamped sub-models ───────────────────────────────────

class SymptomEntry(BaseModel):
    """A single reported symptom with severity and timestamp."""
    name: str = Field(..., description="Canonical symptom name (snake_case)")
    severity: int = Field(
        default=3,
        ge=1, le=7,
        description="Severity weight (1=mild, 7=critical)",
    )
    reported_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When the symptom was reported",
    )
    source: str = Field(
        default="user_input",
        description="Origin: user_input | nlp_extraction | wearable_derived",
    )


class VitalSigns(BaseModel):
    """Vital signs snapshot with physiological validation."""
    heart_rate_bpm: Optional[float] = Field(None, ge=30, le=220)
    spo2_percent: Optional[float] = Field(None, ge=50, le=100)
    systolic_bp: Optional[float] = Field(None, ge=60, le=260)
    diastolic_bp: Optional[float] = Field(None, ge=30, le=160)
    temperature_celsius: Optional[float] = Field(None, ge=33.0, le=43.0)
    respiratory_rate: Optional[float] = Field(None, ge=6, le=60)
    blood_glucose_mgdl: Optional[float] = Field(None, ge=20, le=600)
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class WearableLog(BaseModel):
    """
    A single wearable data snapshot, timestamped for trend logging.
    Supports Google Fit, Health Connect, and generic smartwatch data.
    """
    heart_rate_bpm: Optional[float] = Field(None, ge=30, le=220)
    spo2_percent: Optional[float] = Field(None, ge=50, le=100)
    steps: Optional[int] = Field(None, ge=0, le=100_000)
    calories_burned: Optional[float] = Field(None, ge=0, le=15_000)
    sleep_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    active_minutes: Optional[int] = Field(None, ge=0, le=1440)
    distance_km: Optional[float] = Field(None, ge=0.0, le=200.0)
    stress_level: Optional[float] = Field(
        None, ge=0, le=100,
        description="Stress index 0–100 (if available from device)",
    )
    source: str = Field(
        default="unknown",
        description="Data source: google_fit | health_connect | smartwatch | manual",
    )
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class Lifestyle(BaseModel):
    """Lifestyle and behavioral risk factors."""
    smoker: bool = False
    drinker: bool = False
    diabetic: bool = False
    hypertensive: bool = False
    exercise_frequency: Optional[str] = Field(
        None,
        description="none | light | moderate | heavy",
    )
    diet_quality: Optional[str] = Field(
        None,
        description="poor | average | good | excellent",
    )
    sleep_quality: Optional[str] = Field(
        None,
        description="poor | fair | good | excellent",
    )
    stress_level: Optional[str] = Field(
        None,
        description="low | moderate | high | severe",
    )


class MedicalHistory(BaseModel):
    """Known medical conditions and history markers."""
    known_conditions: list[str] = Field(
        default_factory=list,
        description="E.g., ['diabetes', 'asthma', 'hypertension']",
    )
    allergies: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    family_history: list[str] = Field(
        default_factory=list,
        description="Hereditary risk factors",
    )
    previous_surgeries: list[str] = Field(default_factory=list)


# ── Main Health Profile ──────────────────────────────────────

class HealthProfile(BaseModel):
    """
    Unified Health Profile — the single source of truth for
    health risk assessment within the intelligence pipeline.

    Designed for:
      - Longitudinal tracking (all sub-models are timestamped)
      - Wearable integration (WearableLog list)
      - Symptom progression (SymptomEntry history)
      - Preventive monitoring (lifestyle + medical history)
    """
    # Identity
    user_id: Optional[str] = Field(None, description="User identifier")
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[Gender] = None

    # Symptoms (time-series ready — list of entries)
    symptoms: list[SymptomEntry] = Field(
        default_factory=list,
        description="Current and historical symptom entries",
    )

    # Vitals
    vitals: Optional[VitalSigns] = None

    # Wearable history (time-series ready — list of logs)
    wearable_logs: list[WearableLog] = Field(
        default_factory=list,
        description="Historical wearable data snapshots",
    )

    # Context
    lifestyle: Optional[Lifestyle] = None
    medical_history: Optional[MedicalHistory] = None
    country_code: Optional[str] = Field(
        None,
        max_length=3,
        description="ISO 3166-1 alpha-2/3 country code for WHO adjustments",
    )

    # Metadata
    profile_created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("country_code")
    @classmethod
    def uppercase_country(cls, v: Optional[str]) -> Optional[str]:
        return v.upper().strip() if v else v

    def get_current_symptom_names(self) -> list[str]:
        """Return deduplicated list of current symptom canonical names."""
        return list({s.name for s in self.symptoms})

    def get_latest_wearable(self) -> Optional[WearableLog]:
        """Return the most recent wearable log entry, if any."""
        if not self.wearable_logs:
            return None
        return max(self.wearable_logs, key=lambda w: w.recorded_at)

    def get_wearable_trend(self, field: str, last_n: int = 7) -> list[float]:
        """
        Extract the last N values of a specific wearable field
        for trend analysis.
        """
        values: list[float] = []
        sorted_logs = sorted(
            self.wearable_logs,
            key=lambda w: w.recorded_at,
            reverse=True,
        )
        for log_entry in sorted_logs[:last_n]:
            val = getattr(log_entry, field, None)
            if val is not None:
                values.append(float(val))
        return list(reversed(values))  # chronological order


# ── API Request / Response models ────────────────────────────

class HealthProcessRequest(BaseModel):
    """Incoming request for the full health intelligence pipeline."""
    symptoms: list[str] = Field(
        ...,
        min_length=1,
        description="Raw symptom strings (will be normalized)",
    )
    vitals: Optional[VitalSigns] = None
    wearable: Optional[WearableLog] = None
    lifestyle: Optional[Lifestyle] = None
    medical_history: Optional[MedicalHistory] = None
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[Gender] = None
    country_code: Optional[str] = None
    user_id: Optional[str] = None


class SymptomAnalysisRequest(BaseModel):
    """Lightweight symptom-only analysis request."""
    symptoms: list[str] = Field(
        ...,
        min_length=1,
        description="Raw symptom strings",
    )
    include_severity: bool = True


class WearableSyncRequest(BaseModel):
    """Incoming wearable data for time-series logging."""
    user_id: Optional[str] = None
    logs: list[WearableLog] = Field(
        ...,
        min_length=1,
        description="One or more wearable data snapshots",
    )


class RiskAssessmentResult(BaseModel):
    """Structured output from the risk assessment pipeline."""
    # Risk profiling
    primary_risk: str = Field(..., description="E.g., 'infection risk', 'cardiac risk'")
    confidence: float = Field(..., ge=0, le=100, description="Calibrated confidence %")
    uncertainty: UncertaintyLevel = Field(..., description="Calibrated uncertainty")
    severity: SeverityLevel = Field(default=SeverityLevel.LOW)
    risk_score: float = Field(default=0.0, ge=0, le=100)

    # Contributing factors
    contributing_factors: list[str] = Field(
        default_factory=list,
        description="Human-readable factors that influenced the risk",
    )
    matched_symptoms: list[str] = Field(default_factory=list)
    unmatched_symptoms: list[str] = Field(default_factory=list)

    # Explainability
    explanations: list[str] = Field(
        default_factory=list,
        description="Human-readable reasoning statements",
    )
    xai_summary: str = Field(default="", description="Plain-English summary")

    # Safety rules
    rule_alerts: list[dict] = Field(
        default_factory=list,
        description="Triggered medical safety rules",
    )

    # Model metadata
    model_used: str = Field(default="none")
    assessment_timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Preventive recommendations
    precautions: list[str] = Field(default_factory=list)
    description: str = Field(default="")


class HealthSummaryResponse(BaseModel):
    """Summary overview for the GET /health/summary endpoint."""
    user_id: Optional[str] = None
    total_symptoms_tracked: int = 0
    total_wearable_entries: int = 0
    latest_risk_level: Optional[SeverityLevel] = None
    latest_confidence: Optional[float] = None
    wearable_trends: dict = Field(default_factory=dict)
    last_assessment: Optional[datetime] = None
