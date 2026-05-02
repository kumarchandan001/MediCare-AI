from pydantic import BaseModel
from typing import List, Optional, Dict


class MetricStat(BaseModel):
    current: float
    previous: float
    change: float
    change_pct: float
    trend: str  # up | down | flat
    unit: str
    label: str


class ReportsOverview(BaseModel):
    period_days: int
    record_count: int
    active_days: int
    completion_pct: float

    sleep: MetricStat
    heart_rate: MetricStat
    oxygen: MetricStat
    stress: MetricStat
    steps: MetricStat
    bmi: Optional[MetricStat] = None

    overall_score: float
    score_trend: str
    best_metric: str
    worst_metric: str


class TrendPoint(BaseModel):
    date: str
    value: Optional[float] = None
    label: str


class MetricTrendSeries(BaseModel):
    metric: str
    label: str
    unit: str
    color: str
    data: List[TrendPoint]
    average: float
    min_val: float
    max_val: float


class TrendsResponse(BaseModel):
    period_days: int
    sleep: MetricTrendSeries
    heart_rate: MetricTrendSeries
    oxygen: MetricTrendSeries
    stress: MetricTrendSeries
    steps: MetricTrendSeries


class AISummaryResponse(BaseModel):
    summary: str
    highlights: List[Dict[str, str]]
    action_items: List[str]
    score: float
    grade: str
    generated_at: str


class StreakData(BaseModel):
    current_streak: int
    longest_streak: int
    total_logged: int
    this_week: int
    this_month: int


class ReportStats(BaseModel):
    streaks: StreakData
    total_vitals: int
    total_activity: int
    avg_sleep: float
    avg_hr: float
    avg_steps: float
    avg_stress: float
    bmi: Optional[float] = None
    bmi_category: Optional[str] = None
    days_logged: int
    period_days: int
