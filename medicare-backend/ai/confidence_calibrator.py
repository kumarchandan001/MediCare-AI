"""
ai/confidence_calibrator.py
─────────────────────────────────────────────
Converts raw RF/LightGBM probability output into
meaningful, user-facing confidence scores.

Problem:
  A model trained on 41 disease classes spreads probability
  across all classes. For partial-symptom input (user picks
  3 of 10 disease symptoms), the top class may get only
  17-47% raw probability — looks low but the model IS
  actually less certain. Showing "17%" to a user is alarming
  and misleading.

Solution — Relative Dominance Normalization:
  Instead of showing raw probability, show HOW DOMINANT the
  top prediction is relative to its nearest competitors.

  Formula:
    relative_dominance = top_prob / sum(top_5_probs)
    display_confidence = 50 + relative_dominance * 48

  Result mapping:
    RF gives 100% to one class  → display 98%   (perfect match)
    RF gives 65% (clear winner) → display ~84%  (strong)
    RF gives 30% (top of 5)     → display ~67%  (moderate)
    RF gives 17% (very ambig.)  → display ~58%  (low — honest)

  The range is always 50–98%, which is honest:
    - Ambiguous inputs get lower scores
    - Clear symptom matches get high scores

Additional boosts:
  +4–6% for ≥5 symptoms selected (more signal)
  +2–4% if top prediction is 3-5× stronger than #2
"""

import numpy as np


def correct_confidence(
    probabilities: np.ndarray,
    n_symptoms_selected: int = 3,
    top_k: int = 5,
) -> tuple[float, float]:
    """
    Convert raw model probability array to a meaningful
    display confidence score.

    Args:
        probabilities:       Full probability array from
                             model.predict_proba()[0]
        n_symptoms_selected: How many symptoms user selected
        top_k:               Top-k classes used for
                             dominance normalization

    Returns:
        (display_confidence, raw_top_probability_pct)
        Both as percentages (0–100), rounded to 1 decimal.
    """
    if len(probabilities) == 0:
        return 50.0, 0.0

    # Sort descending and take top-k
    top_indices = np.argsort(probabilities)[::-1][:top_k]
    top_probs   = probabilities[top_indices]
    top_prob    = float(top_probs[0])

    # Relative dominance: how much of the top-k mass
    # belongs to the #1 prediction
    top_sum = float(top_probs.sum())
    relative_dominance = (
        top_prob / top_sum if top_sum > 0
        else 1.0 / top_k
    )

    # Base display confidence
    base = 50.0 + relative_dominance * 48.0

    # ── Symptom count boost ───────────────────────
    # More symptoms = more signal = higher confidence
    if n_symptoms_selected >= 7:
        sym_boost = 6.0
    elif n_symptoms_selected >= 5:
        sym_boost = 4.0
    elif n_symptoms_selected >= 3:
        sym_boost = 2.0
    else:
        sym_boost = 0.0

    # ── Uniqueness boost ──────────────────────────
    # If top prediction is >> next best, boost further
    if len(top_probs) >= 2 and top_probs[1] > 0:
        ratio = top_probs[0] / top_probs[1]
        if ratio >= 5.0:
            uniqueness_boost = 4.0
        elif ratio >= 3.0:
            uniqueness_boost = 2.0
        else:
            uniqueness_boost = 0.0
    elif top_prob >= 0.99:
        uniqueness_boost = 4.0
    else:
        uniqueness_boost = 0.0

    display_conf = round(
        min(98.0, max(50.0, base + sym_boost + uniqueness_boost)),
        1,
    )
    raw_top_pct = round(top_prob * 100, 1)
    return display_conf, raw_top_pct


def get_confidence_label(display_confidence: float) -> tuple[str, str]:
    """
    Return (evidence_strength, evidence_label) based on
    display confidence.

    Used by the engine to populate xai.evidence_strength.
    """
    if display_confidence >= 88:
        return "Strong",   "High confidence"
    elif display_confidence >= 75:
        return "Moderate", "Moderate confidence"
    elif display_confidence >= 62:
        return "Limited",  "Some confidence"
    else:
        return "Weak",     "Low confidence"


def get_evidence_score(display_confidence: float) -> int:
    """Map display confidence to 0–100 evidence score."""
    if display_confidence >= 88:
        return 90
    elif display_confidence >= 75:
        return 72
    elif display_confidence >= 62:
        return 55
    else:
        return 35
