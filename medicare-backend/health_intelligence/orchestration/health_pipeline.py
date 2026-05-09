"""
health_intelligence/orchestration/health_pipeline.py
───────────────────────────────────────────────
Health Intelligence Pipeline — the central orchestrator
that connects all modules into a unified processing flow.

Pipeline stages:
  Raw Input
    ↓ Symptom Normalization
    ↓ Health Profile Construction
    ↓ Medical Safety Rules
    ↓ Feature Engineering
    ↓ Risk Assessment (LightGBM + fallback)
    ↓ Explainability
    ↓ Structured Health Intelligence Output
"""

import logging
from datetime import datetime
from typing import Optional

from health_intelligence.normalization.symptom_normalizer import (
    SymptomNormalizer,
)
from health_intelligence.schemas.health_profile import (
    HealthProfile,
    HealthProcessRequest,
    RiskAssessmentResult,
    SeverityLevel,
    SymptomEntry,
    SymptomAnalysisRequest,
    WearableSyncRequest,
    HealthSummaryResponse,
)
from health_intelligence.rules.medical_rules import MedicalRuleEngine
from health_intelligence.feature_engineering.feature_generator import (
    FeatureGenerator,
    SEVERITY_WEIGHTS,
)
from health_intelligence.explainability.explain_engine import ExplainEngine
from health_intelligence.wearable.wearable_processor import WearableProcessor
from health_intelligence.services.risk_assessment_service import (
    RiskAssessmentService,
)

log = logging.getLogger(__name__)


class HealthIntelligencePipeline:
    """
    Orchestrates the full health intelligence flow:
      normalize → validate → rules → features → assess → explain
    """

    def __init__(self):
        self.normalizer = SymptomNormalizer()
        self.rule_engine = MedicalRuleEngine()
        self.feature_generator = FeatureGenerator()
        self.explain_engine = ExplainEngine()
        self.wearable_processor = WearableProcessor()
        self.risk_service = RiskAssessmentService()

        # In-memory storage for session-level tracking
        # (will be replaced by database persistence in Step 2)
        self._session_profiles: dict[str, HealthProfile] = {}
        self._session_results: dict[str, RiskAssessmentResult] = {}

    # ── Full pipeline ────────────────────────────────────────

    async def process(
        self,
        request: HealthProcessRequest,
    ) -> dict:
        """
        Execute the full health intelligence pipeline.

        Returns a comprehensive dict with:
          - risk assessment result
          - explanations
          - rule alerts
          - matched / unmatched symptoms
          - wearable insights
        """
        log.info(
            "Pipeline: processing %d symptom(s) for user=%s",
            len(request.symptoms), request.user_id or "anonymous",
        )

        # ── Stage 1: Symptom Normalization ───────────────────
        matched, unmatched = self.normalizer.normalize_symptoms(
            request.symptoms
        )
        log.info(
            "Normalization: %d matched, %d unmatched",
            len(matched), len(unmatched),
        )

        if not matched:
            return self._empty_result(
                "None of the provided symptoms could be recognized. "
                "Please try describing your symptoms differently.",
                unmatched=unmatched,
            )

        # ── Stage 2: Build Health Profile ────────────────────
        symptom_entries = [
            SymptomEntry(
                name=s,
                severity=SEVERITY_WEIGHTS.get(s, 3),
                source="user_input",
            )
            for s in matched
        ]

        profile = HealthProfile(
            user_id=request.user_id,
            age=request.age,
            gender=request.gender,
            symptoms=symptom_entries,
            vitals=request.vitals,
            lifestyle=request.lifestyle,
            medical_history=request.medical_history,
            country_code=request.country_code,
        )

        # Add wearable data if provided
        if request.wearable:
            profile.wearable_logs.append(request.wearable)

        # ── Stage 3: Medical Safety Rules ────────────────────
        rule_alerts = self.rule_engine.evaluate(profile)
        rule_severity = self.rule_engine.get_max_severity(rule_alerts)
        log.info(
            "Rules: %d alert(s), max severity=%s",
            len(rule_alerts), rule_severity.value,
        )

        # ── Stage 4: Feature Engineering ─────────────────────
        features = self.feature_generator.generate_all_features(
            profile, matched,
        )

        # ── Stage 5: Risk Assessment ────────────────────────
        result = self.risk_service.assess_risk(
            symptom_vector=features["symptom_vector"],
            matched_symptoms=matched,
            rule_alerts=rule_alerts,
            rule_severity=rule_severity,
            profile=profile,
        )

        # Update result with unmatched
        result.unmatched_symptoms = unmatched

        # ── Stage 6: Explainability ─────────────────────────
        explanations = self.explain_engine.generate_explanations(
            matched_symptoms=matched,
            rule_alerts=rule_alerts,
            profile=profile,
            primary_risk=result.primary_risk,
            confidence=result.confidence,
            wearable_features=features.get("wearable_features"),
        )
        result.explanations = explanations

        summary = self.explain_engine.generate_summary(
            primary_risk=result.primary_risk,
            confidence=result.confidence,
            severity=result.severity,
            matched_symptoms=matched,
            rule_alerts=rule_alerts,
        )
        result.xai_summary = summary

        # ── Store session data ──────────────────────────────
        user_key = request.user_id or "anonymous"
        self._session_profiles[user_key] = profile
        self._session_results[user_key] = result

        # ── Build response ──────────────────────────────────
        return self._build_response(result, features, profile)

    # ── Symptom-only analysis ────────────────────────────────

    async def analyze_symptoms(
        self,
        request: SymptomAnalysisRequest,
    ) -> dict:
        """
        Lightweight symptom analysis without full pipeline.
        Normalizes symptoms and returns categorized results.
        """
        matched, unmatched = self.normalizer.normalize_symptoms(
            request.symptoms
        )

        severity_details = []
        if request.include_severity:
            for symptom in matched:
                weight = SEVERITY_WEIGHTS.get(symptom, 3)
                severity_details.append({
                    "symptom": symptom,
                    "display_name": symptom.replace("_", " ").title(),
                    "severity_weight": weight,
                    "severity_label": (
                        "Critical" if weight >= 7 else
                        "High" if weight >= 5 else
                        "Moderate" if weight >= 3 else
                        "Low"
                    ),
                })

        return {
            "matched_symptoms": matched,
            "unmatched_symptoms": unmatched,
            "total_matched": len(matched),
            "total_unmatched": len(unmatched),
            "severity_details": severity_details,
            "analyzed_at": datetime.utcnow().isoformat(),
        }

    # ── Wearable sync ───────────────────────────────────────

    async def sync_wearable(
        self,
        request: WearableSyncRequest,
    ) -> dict:
        """
        Ingest wearable data, detect anomalies, and store
        for longitudinal tracking.
        """
        user_key = request.user_id or "anonymous"
        profile = self._session_profiles.get(user_key)

        if not profile:
            profile = HealthProfile(user_id=request.user_id)
            self._session_profiles[user_key] = profile

        # Add new logs to profile
        all_anomalies: list[str] = []
        for wl in request.logs:
            profile.wearable_logs.append(wl)
            anomalies = self.wearable_processor.detect_anomalies(wl)
            all_anomalies.extend(anomalies)

        profile.last_updated_at = datetime.utcnow()

        # Summarize trends
        trends = self.wearable_processor.summarize_trends(
            profile.wearable_logs,
        )

        return {
            "status": "synced",
            "entries_received": len(request.logs),
            "total_entries_stored": len(profile.wearable_logs),
            "anomalies_detected": all_anomalies,
            "trends": trends,
            "synced_at": datetime.utcnow().isoformat(),
        }

    # ── Health summary ──────────────────────────────────────

    async def get_summary(
        self,
        user_id: Optional[str] = None,
    ) -> HealthSummaryResponse:
        """
        Return a summary of the user's health intelligence
        session data.
        """
        user_key = user_id or "anonymous"
        profile = self._session_profiles.get(user_key)
        result = self._session_results.get(user_key)

        if not profile:
            return HealthSummaryResponse(user_id=user_id)

        trends = self.wearable_processor.summarize_trends(
            profile.wearable_logs,
        )

        return HealthSummaryResponse(
            user_id=user_id,
            total_symptoms_tracked=len(profile.symptoms),
            total_wearable_entries=len(profile.wearable_logs),
            latest_risk_level=result.severity if result else None,
            latest_confidence=result.confidence if result else None,
            wearable_trends=trends,
            last_assessment=(
                result.assessment_timestamp if result else None
            ),
        )

    # ── Response builders ────────────────────────────────────

    def _build_response(
        self,
        result: RiskAssessmentResult,
        features: dict,
        profile: HealthProfile,
    ) -> dict:
        """Build the complete pipeline response dict."""
        return {
            "risk_assessment": {
                "primary_risk": result.primary_risk,
                "confidence": result.confidence,
                "uncertainty": result.uncertainty.value,
                "severity": result.severity.value,
                "risk_score": result.risk_score,
                "contributing_factors": result.contributing_factors,
                "description": result.description,
                "precautions": result.precautions,
            },
            "symptoms": {
                "matched": result.matched_symptoms,
                "unmatched": result.unmatched_symptoms,
                "total_analyzed": len(result.matched_symptoms),
            },
            "explainability": {
                "summary": result.xai_summary,
                "explanations": result.explanations,
            },
            "safety_rules": {
                "alerts": result.rule_alerts,
                "max_severity": result.severity.value,
                "total_alerts": len(result.rule_alerts),
            },
            "feature_scores": {
                "symptom_severity_score": features.get(
                    "symptom_severity_score", 0
                ),
                "vitals_risk_score": features.get(
                    "vitals_risk_score", 0
                ),
            },
            "wearable_insights": features.get("wearable_features", {}),
            "model_info": {
                "model_used": result.model_used,
                "assessment_timestamp": (
                    result.assessment_timestamp.isoformat()
                ),
            },
        }

    @staticmethod
    def _empty_result(
        message: str,
        unmatched: Optional[list[str]] = None,
    ) -> dict:
        """Return an empty result when no symptoms could be processed."""
        return {
            "risk_assessment": {
                "primary_risk": "Insufficient data",
                "confidence": 0.0,
                "uncertainty": "very_high",
                "severity": "low",
                "risk_score": 0.0,
                "contributing_factors": [],
                "description": "",
                "precautions": [],
            },
            "symptoms": {
                "matched": [],
                "unmatched": unmatched or [],
                "total_analyzed": 0,
            },
            "explainability": {
                "summary": message,
                "explanations": [message],
            },
            "safety_rules": {
                "alerts": [],
                "max_severity": "low",
                "total_alerts": 0,
            },
            "feature_scores": {
                "symptom_severity_score": 0,
                "vitals_risk_score": 0,
            },
            "wearable_insights": {},
            "model_info": {
                "model_used": "none",
                "assessment_timestamp": datetime.utcnow().isoformat(),
            },
        }
