"""
health_intelligence/wearable/wearable_processor.py
───────────────────────────────────────────────
Wearable data processor — normalizes third-party
wearable payloads (Google Fit, Health Connect,
smartwatch logs) into the standardized WearableLog
schema for time-series health tracking.

Responsibilities:
  1. Ingest raw wearable payloads from various sources
  2. Validate and clamp values to physiological ranges
  3. Normalize into timestamped WearableLog entries
  4. Detect anomalies in the incoming data
  5. Summarize wearable trends for reporting
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.schemas.health_profile import WearableLog
from health_intelligence.utils.validators import (
    validate_vital,
    validate_wearable_metric,
    clamp_vital,
)

log = logging.getLogger(__name__)


class WearableProcessor:
    """
    Processes and normalizes wearable device data from
    multiple sources into the unified WearableLog schema.
    """

    # ── Source-specific field mappings ────────────────────────
    # Maps provider-specific field names to our canonical schema.

    GOOGLE_FIT_FIELDS: dict[str, str] = {
        "heart_rate": "heart_rate_bpm",
        "heartRate": "heart_rate_bpm",
        "spo2": "spo2_percent",
        "oxygenSaturation": "spo2_percent",
        "steps": "steps",
        "stepCount": "steps",
        "calories": "calories_burned",
        "caloriesBurned": "calories_burned",
        "sleep_duration_hours": "sleep_hours",
        "sleepDuration": "sleep_hours",
        "active_minutes": "active_minutes",
        "activeMinutes": "active_minutes",
        "distance": "distance_km",
        "distanceKm": "distance_km",
    }

    HEALTH_CONNECT_FIELDS: dict[str, str] = {
        "heartRateBpm": "heart_rate_bpm",
        "oxygenSaturationPercent": "spo2_percent",
        "totalSteps": "steps",
        "totalCalories": "calories_burned",
        "sleepDurationHours": "sleep_hours",
        "exerciseMinutes": "active_minutes",
        "totalDistanceKm": "distance_km",
        "stressScore": "stress_level",
    }

    def normalize_payload(
        self,
        raw_data: dict,
        source: str = "unknown",
        recorded_at: Optional[datetime] = None,
    ) -> WearableLog:
        """
        Normalize a raw wearable payload into a WearableLog.

        Args:
            raw_data: Dict of field → value from the wearable source.
            source: Data source identifier (google_fit, health_connect, etc.)
            recorded_at: When the data was recorded. Defaults to now.

        Returns:
            A validated WearableLog instance.
        """
        # Select the right field mapping
        field_map = self._get_field_map(source)

        # Map raw fields to canonical names
        mapped: dict[str, float] = {}
        for raw_key, raw_value in raw_data.items():
            canonical_key = field_map.get(raw_key)
            if canonical_key and raw_value is not None:
                try:
                    mapped[canonical_key] = float(raw_value)
                except (ValueError, TypeError):
                    log.warning(
                        "Skipping non-numeric wearable field: %s=%s",
                        raw_key, raw_value,
                    )

        # Validate and clamp vitals
        hr = mapped.get("heart_rate_bpm")
        if hr is not None:
            valid, msg = validate_vital("heart_rate_bpm", hr)
            if not valid:
                log.warning("Wearable HR validation: %s — clamping", msg)
                hr = clamp_vital("heart_rate_bpm", hr)

        spo2 = mapped.get("spo2_percent")
        if spo2 is not None:
            valid, msg = validate_vital("spo2_percent", spo2)
            if not valid:
                log.warning("Wearable SpO2 validation: %s — clamping", msg)
                spo2 = clamp_vital("spo2_percent", spo2)

        # Validate wearable-specific metrics
        steps = mapped.get("steps")
        if steps is not None:
            valid, _ = validate_wearable_metric("steps", steps)
            if not valid:
                steps = None

        return WearableLog(
            heart_rate_bpm=hr,
            spo2_percent=spo2,
            steps=int(steps) if steps is not None else None,
            calories_burned=mapped.get("calories_burned"),
            sleep_hours=mapped.get("sleep_hours"),
            active_minutes=(
                int(mapped["active_minutes"])
                if mapped.get("active_minutes") is not None
                else None
            ),
            distance_km=mapped.get("distance_km"),
            stress_level=mapped.get("stress_level"),
            source=source,
            recorded_at=recorded_at or datetime.utcnow(),
        )

    def normalize_batch(
        self,
        payloads: list[dict],
        source: str = "unknown",
    ) -> list[WearableLog]:
        """Normalize multiple raw wearable payloads."""
        logs: list[WearableLog] = []
        for payload in payloads:
            try:
                recorded_at = None
                # Try to extract timestamp from payload
                for ts_key in ["timestamp", "recordedAt", "recorded_at", "date"]:
                    if ts_key in payload:
                        try:
                            recorded_at = datetime.fromisoformat(
                                str(payload[ts_key]).replace("Z", "+00:00")
                            )
                        except (ValueError, TypeError):
                            pass
                        break

                wl = self.normalize_payload(
                    payload, source=source, recorded_at=recorded_at,
                )
                logs.append(wl)
            except Exception as e:
                log.error("Failed to normalize wearable payload: %s", e)

        return logs

    def detect_anomalies(self, log_entry: WearableLog) -> list[str]:
        """
        Detect anomalies in a single wearable log entry.
        Returns a list of human-readable anomaly descriptions.
        """
        anomalies: list[str] = []

        if log_entry.heart_rate_bpm is not None:
            if log_entry.heart_rate_bpm > 120:
                anomalies.append(
                    f"Elevated resting HR: {log_entry.heart_rate_bpm} bpm"
                )
            elif log_entry.heart_rate_bpm < 45:
                anomalies.append(
                    f"Low resting HR: {log_entry.heart_rate_bpm} bpm"
                )

        if log_entry.spo2_percent is not None and log_entry.spo2_percent < 93:
            anomalies.append(
                f"Low SpO2: {log_entry.spo2_percent}%"
            )

        if log_entry.sleep_hours is not None and log_entry.sleep_hours < 4:
            anomalies.append(
                f"Critically low sleep: {log_entry.sleep_hours:.1f} hrs"
            )

        if log_entry.stress_level is not None and log_entry.stress_level > 80:
            anomalies.append(
                f"Very high stress: {log_entry.stress_level}/100"
            )

        return anomalies

    def summarize_trends(
        self,
        logs: list[WearableLog],
        last_n: int = 7,
    ) -> dict:
        """
        Compute summary statistics over the last N wearable logs.
        Used for the GET /health/summary endpoint.
        """
        recent = sorted(
            logs, key=lambda w: w.recorded_at, reverse=True,
        )[:last_n]

        if not recent:
            return {}

        def _avg(field: str) -> Optional[float]:
            vals = [
                getattr(entry, field)
                for entry in recent
                if getattr(entry, field, None) is not None
            ]
            return round(sum(vals) / len(vals), 1) if vals else None

        return {
            "entries_analyzed": len(recent),
            "avg_heart_rate": _avg("heart_rate_bpm"),
            "avg_spo2": _avg("spo2_percent"),
            "avg_sleep_hours": _avg("sleep_hours"),
            "avg_steps": _avg("steps"),
            "avg_stress": _avg("stress_level"),
            "period_start": recent[-1].recorded_at.isoformat(),
            "period_end": recent[0].recorded_at.isoformat(),
        }

    # ── Private helpers ──────────────────────────────────────

    def _get_field_map(self, source: str) -> dict[str, str]:
        """Return the appropriate field mapping for the source."""
        source_lower = source.lower()
        if "google" in source_lower or "fit" in source_lower:
            return self.GOOGLE_FIT_FIELDS
        elif "health_connect" in source_lower or "connect" in source_lower:
            return self.HEALTH_CONNECT_FIELDS
        else:
            # Generic fallback — try both maps merged
            combined = {**self.GOOGLE_FIT_FIELDS, **self.HEALTH_CONNECT_FIELDS}
            # Also accept our canonical names directly
            for field in [
                "heart_rate_bpm", "spo2_percent", "steps",
                "calories_burned", "sleep_hours", "active_minutes",
                "distance_km", "stress_level",
            ]:
                combined[field] = field
            return combined
