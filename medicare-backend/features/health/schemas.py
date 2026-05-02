from pydantic import BaseModel, Field
from typing import Optional, List, Dict


# ── Dashboard Response Schemas ───────────

class MetricTrend(BaseModel):
    direction: str   # "up" | "down" | "flat"
    value: float
    label: str


class HealthSummaryResponse(BaseModel):
    # Core metrics
    sleep: float
    heart_rate: int
    stress: float
    oxygen: float
    steps: int
    calories: int
    water: float
    bmi: float
    bmi_category: str

    # Trends
    sleep_trend: MetricTrend
    steps_trend: MetricTrend
    water_trend: MetricTrend

    # Progress (0-100 for track fill)
    sleep_progress: float
    steps_progress: float
    water_progress: float
    bmi_progress: float

    # Chart data (last 7 days)
    sleep_history: List[float]
    steps_history: List[int]
    hr_history: List[int]
    stress_history: List[float]
    chart_labels: List[str]

    # Meta
    record_count: int
    days: int


class RiskScoreResponse(BaseModel):
    score: float   # 0-100
    level: str     # low/moderate/high/critical
    color: str     # semantic color name
    reasons: List[str]
    factors: Dict[str, str]


class InsightItem(BaseModel):
    type: str      # good/warning/danger/info
    message: str
    icon: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    count: int


class AlertItem(BaseModel):
    id: int
    title: str
    message: Optional[str] = None
    severity: str
    category: Optional[str] = None
    is_read: bool
    time_ago: str


class AlertsResponse(BaseModel):
    alerts: List[AlertItem]
    count: int
    critical_count: int
    unread_count: int


class HabitTip(BaseModel):
    title: str
    tip: str
    reason: str
    priority: str   # high/medium/low
    category: str
    icon: str


class HabitsResponse(BaseModel):
    tips: List[HabitTip]
    focus_area: str
    count: int


# ── Write Schemas ────────────────────────

class SaveVitalsRequest(BaseModel):
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    heart_rate: Optional[int] = Field(None, ge=30, le=220)
    oxygen_level: Optional[float] = Field(None, ge=70, le=100)
    body_temperature: Optional[float] = Field(None, ge=90, le=110)
    stress_level: Optional[int] = Field(None, ge=1, le=10)
    blood_pressure: Optional[str] = None
    notes: Optional[str] = None


class SaveActivityRequest(BaseModel):
    steps: int = Field(0, ge=0)
    calories_burned: int = Field(0, ge=0)
    duration_minutes: int = Field(0, ge=0)
    activity_type: str = "Other"


class BMIRequest(BaseModel):
    height: float = Field(..., ge=50, le=300)
    weight: float = Field(..., ge=10, le=500)
