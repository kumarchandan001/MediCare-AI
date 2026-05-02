"""
ai/xai_engine.py
──────────────────────────────────────────────
XAI Engine — enriches prediction results with:
  - WHO country context
  - Lifestyle risk context
  - Severity distribution summary
  - All field compatibility for XAIPanel
"""

import logging
log = logging.getLogger(__name__)


def enrich_prediction(result: dict, symptoms: list) -> dict:
    """
    Enrich a prediction result with additional XAI data.
    Ensures all fields XAIPanel expects are present and correctly named.
    """
    if not result or not result.get("predicted_disease"):
        return result

    xai = result.get("xai", {})

    # ── Core XAI fields ──────────────────────────
    xai.setdefault("xai_summary", "")
    xai.setdefault("evidence_strength", "Limited")
    xai.setdefault("evidence_score", 50)
    xai.setdefault("explanation_score", 50)
    xai.setdefault("symptom_contributions", [])
    xai.setdefault("confidence_breakdown", {})
    xai.setdefault("alternative_diagnoses", [])
    xai.setdefault("risk_factors", [])

    # ── Ensure XAIPanel legacy fields exist ───────
    # XAIPanel's ImpactTab reads feature_contributions, not symptom_contributions
    if not xai.get("feature_contributions"):
        xai["feature_contributions"] = xai.get("symptom_contributions", [])
    if not xai.get("top_contributing_symptoms"):
        xai["top_contributing_symptoms"] = xai.get("feature_contributions", [])[:3]
    xai.setdefault("symptom_weights", {})
    xai.setdefault("total_symptoms", len(symptoms))
    xai.setdefault("total_severity", sum(
        c.get("severity_score", 0) for c in xai.get("feature_contributions", [])
    ))

    # ── Confidence breakdown completeness ─────────
    cb = xai.get("confidence_breakdown", {})
    conf = result.get("confidence", 0)
    cb.setdefault("overall",            conf)
    cb.setdefault("symptom_match",      0.0)
    cb.setdefault("pattern_strength",   round(conf * 0.95, 1))
    cb.setdefault("severity_alignment", 50.0)
    cb.setdefault("confidence_level",   xai.get("evidence_strength", "Limited"))
    xai["confidence_breakdown"] = cb

    # ── Symptom count context ─────────────────────
    xai["total_symptoms_selected"] = len(symptoms)
    xai["symptoms_matched"]   = len(result.get("matched_symptoms",   []))
    xai["symptoms_unmatched"] = len(result.get("unmatched_symptoms", []))

    # ── Severity distribution ─────────────────────
    counts = {"Critical": 0, "High": 0, "Moderate": 0, "Low": 0}
    for c in xai.get("feature_contributions", []):
        lbl = c.get("severity_label", "Low")
        if lbl in counts:
            counts[lbl] += 1
    xai["severity_summary"] = counts

    # ── WHO context for frontend ──────────────────
    who = result.get("who_adjustment")
    xai["who_context"] = {
        "country":    who.get("country_name"),
        "region":     who.get("region"),
        "risk_level": who.get("who_risk_level"),
        "risk_score": who.get("who_risk_score"),
        "key_data":   who.get("relevant_indicators", {}),
        "reason":     who.get("adjustment_reason"),
    } if who else None

    # ── Lifestyle context for frontend ────────────
    ls = result.get("lifestyle_adjustment")
    xai["lifestyle_context"] = {
        "risk_delta": ls.get("risk_delta"),
        "boosters":   ls.get("risk_boosts", []),
        "new_risk":   ls.get("new_risk_level"),
    } if ls else None

    result["xai"] = xai
    return result


def get_xai_summary(
    disease: str,
    confidence: float,
    evidence_strength: str,
    top_symptoms: list,
) -> str:
    """Build a plain-English XAI summary string."""
    certainty = (
        "high confidence"     if confidence >= 80 else
        "moderate confidence" if confidence >= 60 else
        "limited confidence"  if confidence >= 40 else
        "low confidence"
    )
    sym_str = ", ".join(top_symptoms[:3]) if top_symptoms else "the selected symptoms"
    return (
        f"Based on your symptom profile, the AI identified {disease} with "
        f"{certainty} ({confidence:.0f}%). "
        f"Primary indicators: {sym_str}. "
        f"Evidence strength is rated as {evidence_strength.lower()}."
    )
