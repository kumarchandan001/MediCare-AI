import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.deps import get_current_user
from core.cache import cache
from shared.response import success_response, error_response
from features.auth.models import User
from features.health.models import DiseasePrediction
from features.prediction.schemas import PredictRequest
from ai.engine import predict as predict_disease, get_all_symptoms
from ai.symptom_categories import build_category_map
from ai.xai_engine import enrich_prediction

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/prediction",
    tags=["Disease Prediction"],
)


# ── GET /prediction/symptoms ──────────────────────
@router.get("/symptoms")
async def list_symptoms(
    current_user: User = Depends(get_current_user),
):
    """Get all symptoms organised by category. Cached for 24 hours."""
    ck = "symptoms:all:v3"
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    symptoms = get_all_symptoms()
    categories = build_category_map(symptoms)
    formatted = {
        "symptoms":   symptoms,
        "categories": categories,
        "total":      len(symptoms),
    }
    await cache.set(ck, formatted, expire=86400)
    return success_response(data=formatted)


# ── GET /prediction/countries ─────────────────────
@router.get("/countries")
async def get_who_countries():
    """Return list of all countries with WHO epidemiological data."""
    ck = "who:countries:v1"
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    try:
        from ai.who_engine import build_who_profiles, list_available_countries
        profiles  = build_who_profiles()
        countries = list_available_countries(profiles)
        data = {"countries": countries, "total": len(countries)}
        await cache.set(ck, data, expire=3600)
        return success_response(data=data)
    except Exception as e:
        logger.warning(f"WHO countries error: {e}")
        return success_response(data={"countries": [], "total": 0})


# ── POST /prediction/predict ──────────────────────
@router.post("/predict")
async def predict(
    body: PredictRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run LightGBM disease prediction with WHO adjustment + XAI."""
    if not body.symptoms:
        return error_response(
            "At least one symptom is required.",
            error_type="VALIDATION_ERROR",
            status_code=422,
        )

    try:
        result = predict_disease(
            symptoms=body.symptoms,
            country_code=body.country_code,
            lifestyle=body.lifestyle.model_dump() if body.lifestyle else None,
        )
        result = enrich_prediction(result, body.symptoms)

        # Persist to database
        xai = result.get("xai", {})
        pred = DiseasePrediction(
            user_id=current_user.id,
            symptoms=",".join(body.symptoms),
            predicted_disease=result.get("predicted_disease", ""),
            confidence=result.get("confidence", 0),
            xai_summary=xai.get("xai_summary", ""),
            evidence_strength=xai.get("evidence_strength", "Limited"),
            explanation_score=xai.get("explanation_score", 0),
            risk_factors_count=len(xai.get("risk_factors", [])),
            alternatives_count=len(xai.get("alternative_diagnoses", [])),
        )
        db.add(pred)
        await db.commit()

        return success_response(data=result)

    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return error_response(
            "Prediction failed. Please try again.",
            error_type="PREDICTION_ERROR",
            status_code=500,
        )


# ── GET /prediction/history ───────────────────────
@router.get("/history")
async def prediction_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's prediction history."""
    result = await db.execute(
        select(DiseasePrediction)
        .where(DiseasePrediction.user_id == current_user.id)
        .order_by(desc(DiseasePrediction.created_at))
        .limit(limit)
    )
    records = result.scalars().all()
    return success_response(
        data=[
            {
                "id":               r.id,
                "symptoms":         r.symptoms,
                "predicted_disease": r.predicted_disease,
                "confidence":       r.confidence,
                "xai_summary":      r.xai_summary,
                "evidence_strength": r.evidence_strength,
                "created_at":       str(r.created_at),
            }
            for r in records
        ]
    )
