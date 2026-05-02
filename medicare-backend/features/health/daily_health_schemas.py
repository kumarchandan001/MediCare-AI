"""
daily_health_schemas.py
─────────────────────────────────────────────
Pydantic schemas for the daily health tracking system.

Validation ranges are based on medically realistic values:
  • Sleep:       0–24 hours
  • Steps:       0–200,000 (ultra-marathon territory)
  • BP systolic:  60–250 mmHg
  • BP diastolic: 40–150 mmHg
  • Heart rate:   30–220 bpm
  • Weight:       10–500 kg
  • Oxygen:       50–100 %
  • Stress:       1–10 scale
  • Temperature:  90–110 °F
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List


# ── Request Schema ──────────────────────────────────────────────

class DailyHealthUpdateRequest(BaseModel):
    """
    Input schema for POST /health/daily/update.
    All fields are optional — allows partial updates.
    Only non-None fields are written to the database.
    """
    steps: Optional[int] = Field(
        None, ge=0, le=200000,
        description="Daily step count",
    )
    sleep_hours: Optional[float] = Field(
        None, ge=0, le=24,
        description="Hours of sleep (0–24)",
    )
    bp_systolic: Optional[int] = Field(
        None, ge=60, le=250,
        description="Systolic blood pressure (mmHg)",
    )
    bp_diastolic: Optional[int] = Field(
        None, ge=40, le=150,
        description="Diastolic blood pressure (mmHg)",
    )
    heart_rate: Optional[int] = Field(
        None, ge=30, le=220,
        description="Resting heart rate (bpm)",
    )
    weight: Optional[float] = Field(
        None, ge=10, le=500,
        description="Body weight (kg)",
    )
    oxygen_level: Optional[float] = Field(
        None, ge=50, le=100,
        description="Blood oxygen saturation (%)",
    )
    stress_level: Optional[int] = Field(
        None, ge=1, le=10,
        description="Self-reported stress (1–10)",
    )
    body_temperature: Optional[float] = Field(
        None, ge=90, le=110,
        description="Body temperature (°F)",
    )
    notes: Optional[str] = Field(
        None, max_length=1000,
        description="Free-text health notes for the day",
    )

    @model_validator(mode="after")
    def validate_bp_pair(self) -> "DailyHealthUpdateRequest":
        """
        Blood pressure must be submitted as a pair.
        Systolic must always be greater than diastolic.
        """
        has_sys = self.bp_systolic is not None
        has_dia = self.bp_diastolic is not None

        if has_sys != has_dia:
            raise ValueError(
                "Both bp_systolic and bp_diastolic must be provided together"
            )
        if has_sys and has_dia:
            if self.bp_systolic <= self.bp_diastolic:  # type: ignore[operator]
                raise ValueError(
                    "bp_systolic must be greater than bp_diastolic"
                )
        return self

    @model_validator(mode="after")
    def at_least_one_field(self) -> "DailyHealthUpdateRequest":
        """Ensure the request isn't completely empty."""
        fields = [
            self.steps, self.sleep_hours, self.bp_systolic,
            self.bp_diastolic, self.heart_rate, self.weight,
            self.oxygen_level, self.stress_level,
            self.body_temperature, self.notes,
        ]
        if all(f is None for f in fields):
            raise ValueError("At least one health field must be provided")
        return self


# ── Response Schemas ────────────────────────────────────────────

class DailyHealthRecordResponse(BaseModel):
    """Single daily health record returned by the API."""
    id: int
    user_id: int
    date: str                                      # "2026-05-01"
    steps: Optional[int] = None
    sleep_hours: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    weight: Optional[float] = None
    oxygen_level: Optional[float] = None
    stress_level: Optional[int] = None
    body_temperature: Optional[float] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str
    data_freshness: str = "today"                  # "today" | "yesterday" | "stale" | "none"


class DailyHealthHistoryResponse(BaseModel):
    """List of daily records over a period."""
    records: List[DailyHealthRecordResponse]
    count: int
    period_days: int


class DailyHealthTrendsResponse(BaseModel):
    """Trend analysis computed from daily records."""
    period_days: int
    record_count: int

    # Averages (None if no data for that metric)
    avg_sleep: Optional[float] = None
    avg_steps: Optional[int] = None
    avg_heart_rate: Optional[int] = None
    avg_bp_systolic: Optional[int] = None
    avg_bp_diastolic: Optional[int] = None
    avg_oxygen: Optional[float] = None
    avg_stress: Optional[float] = None

    # Trend directions: "improving" | "declining" | "stable" | "insufficient_data"
    sleep_trend: str = "insufficient_data"
    steps_trend: str = "insufficient_data"
    heart_rate_trend: str = "insufficient_data"
