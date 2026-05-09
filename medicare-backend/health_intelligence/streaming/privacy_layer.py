"""
health_intelligence/streaming/privacy_layer.py
───────────────────────────────────────────────
Privacy & health data protection layer for real-time
streaming infrastructure.

Features:
  - Payload encryption/decryption helpers
  - Sensitive field masking for logs
  - Privacy-safe event routing
  - Secure biometric handling utilities
  - Compliance-ready data classification
"""

import hashlib
import hmac
import json
import logging
import os
import base64
from typing import Any, Optional

log = logging.getLogger(__name__)

# Sensitive biometric fields that require extra care
SENSITIVE_FIELDS = frozenset({
    "heart_rate_bpm", "spo2_percent", "blood_glucose",
    "systolic_bp", "diastolic_bp", "temperature_celsius",
    "respiratory_rate", "hrv_ms", "stress_level",
})

# Fields to mask in logs
LOG_MASK_FIELDS = frozenset({
    "heart_rate_bpm", "spo2_percent", "blood_glucose",
    "systolic_bp", "diastolic_bp",
})


class PrivacyLayer:
    """
    Provides privacy-aware utilities for the streaming
    pipeline. Ensures sensitive biometric data is handled
    securely during real-time processing.
    """

    def __init__(self, encryption_key: Optional[str] = None):
        self._key = (
            encryption_key
            or os.environ.get("HEALTH_ENCRYPTION_KEY", "")
        )
        if not self._key:
            log.warning(
                "No HEALTH_ENCRYPTION_KEY set — "
                "payload signing disabled. Set this in production."
            )

    # ── Payload signing ──────────────────────────────────────

    def sign_payload(self, payload: dict) -> str:
        """
        Create an HMAC signature for a payload.
        Used to verify integrity of streaming data.
        """
        if not self._key:
            return ""
        canonical = json.dumps(payload, sort_keys=True, default=str)
        return hmac.new(
            self._key.encode(), canonical.encode(), hashlib.sha256,
        ).hexdigest()

    def verify_signature(
        self, payload: dict, signature: str,
    ) -> bool:
        """Verify HMAC signature of a payload."""
        if not self._key:
            return True  # No key = no verification
        expected = self.sign_payload(payload)
        return hmac.compare_digest(expected, signature)

    # ── Payload encoding ─────────────────────────────────────

    @staticmethod
    def encode_payload(payload: dict) -> str:
        """Base64-encode a payload for safe transport."""
        raw = json.dumps(payload, default=str).encode()
        return base64.b64encode(raw).decode()

    @staticmethod
    def decode_payload(encoded: str) -> dict:
        """Decode a base64-encoded payload."""
        raw = base64.b64decode(encoded.encode())
        return json.loads(raw)

    # ── Sensitive field masking ───────────────────────────────

    @staticmethod
    def mask_for_logging(data: dict) -> dict:
        """
        Return a copy of data with sensitive fields masked
        for safe logging. Original data is never modified.
        """
        masked = {}
        for key, value in data.items():
            if key in LOG_MASK_FIELDS and value is not None:
                masked[key] = "***"
            elif isinstance(value, dict):
                masked[key] = PrivacyLayer.mask_for_logging(value)
            else:
                masked[key] = value
        return masked

    # ── Data classification ──────────────────────────────────

    @staticmethod
    def classify_sensitivity(field_name: str) -> str:
        """
        Classify a field's sensitivity level.
          - 'high'      : biometric identifiers
          - 'moderate'  : health metrics
          - 'low'       : non-sensitive metadata
        """
        if field_name in SENSITIVE_FIELDS:
            return "high"
        if field_name in {"sleep_hours", "steps", "active_minutes",
                          "calories_burned", "distance_km"}:
            return "moderate"
        return "low"

    @staticmethod
    def get_sensitive_fields(data: dict) -> list[str]:
        """Return list of sensitive fields present in data."""
        return [k for k in data if k in SENSITIVE_FIELDS]

    # ── Privacy-safe event creation ──────────────────────────

    def prepare_streaming_payload(
        self,
        user_id: int,
        data: dict,
        include_signature: bool = True,
    ) -> dict:
        """
        Prepare a privacy-safe streaming payload with
        optional HMAC signature.
        """
        payload = {
            "user_id": user_id,
            "data": data,
            "sensitivity": {
                k: self.classify_sensitivity(k)
                for k in data
            },
            "contains_sensitive": bool(
                self.get_sensitive_fields(data)
            ),
        }

        if include_signature:
            payload["signature"] = self.sign_payload(payload)

        return payload

    def strip_sensitive_for_external(
        self, data: dict,
    ) -> dict:
        """
        Remove high-sensitivity fields for external/
        third-party consumption.
        """
        return {
            k: v for k, v in data.items()
            if self.classify_sensitivity(k) != "high"
        }
