"""
routes/api/v1/prediction.py
───────────────────────────
V1 API endpoints for disease prediction and prediction history.

Delegates to: ai/prediction.py, services/health_service.py
"""

import json
import traceback
from datetime import datetime
from flask import request, session

from routes.api.v1 import api_v1
from utils.api_response import success, error, validation_error, server_error
from utils.api_validators import require_json
from utils.auth import login_required


def _uid():
    return session['user_id']


def _log_xai_prediction(user_id, symptoms, result):
    """Structured XAI log entry (non-fatal)."""
    try:
        xai = result.get('xai', {})
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'user_id': user_id,
            'input_symptoms': symptoms,
            'predicted_disease': result.get('predicted_disease'),
            'confidence_score': result.get('confidence'),
            'confidence_label': result.get('confidence_label', 'Medium'),
            'evidence_strength': xai.get('evidence_strength', 'Moderate'),
        }
        print(f"[xai-log] {json.dumps(log_entry, default=str)}")
    except Exception as e:
        print(f"[xai-log] Logging failed (non-fatal): {e}")


# ═════════════════════════════════════════════════════════════════════════════
#  Disease Prediction
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/predict', methods=['POST'])
@login_required
def v1_predict():
    """Accept symptom list, return AI prediction with XAI explanation."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or len(data) == 0:
            return validation_error("Please select at least one symptom to perform prediction.")

        from ai.prediction import predict as run_prediction
        symptoms_list = list(data.keys())
        result = run_prediction(symptoms_list)

        # Edge case: prediction returned an error
        if result.get('error'):
            return error(result['error'], code=400)

        # ── Personalization Engine Injection ──
        try:
            from services.personalization_service import get_personalization_insights
            insights = get_personalization_insights(_uid())
            if insights:
                top_insight = insights[0]
                # Inject a dynamic string combining their highest priority alert
                msg = (f"Profile match: Because {top_insight['insight'].lower().rstrip('.')} "
                       f"Your personalized risk factor is {top_insight['risk_level'].upper()}. "
                       f"{top_insight['recommendation']}")
                if 'xai' not in result:
                    result['xai'] = {}
                result['xai']['personalization_insight'] = msg
        except Exception as e:
            print(f"[personalization] Injection failed for prediction: {e}")

        # Auto-save to history
        try:
            from services.health_service import save_disease_prediction
            xai = result.get('xai', {})
            save_disease_prediction(_uid(), {
                'symptoms': symptoms_list,
                'predicted_disease': result.get('predicted_disease'),
                'confidence_score': result.get('confidence'),
                'recommendations': '; '.join(result.get('precautions', [])),
                'saved_to_records': True,
                'xai_summary': xai.get('xai_summary', ''),
                'evidence_strength': xai.get('evidence_strength', 'Moderate'),
                'explanation_score': xai.get('explanation_score', 0),
                'risk_factors_count': len(xai.get('risk_factors', [])),
                'alternatives_count': len(xai.get('alternative_diagnoses', [])),
            })
        except Exception as e:
            print(f"[prediction] Auto-save FAILED: {e}")
            traceback.print_exc()

        # XAI logging
        _log_xai_prediction(_uid(), symptoms_list, result)

        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Prediction failed", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Prediction History
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/predict/history', methods=['GET'])
@login_required
def v1_predict_history():
    """Return saved disease predictions for the current user."""
    try:
        from services.health_service import get_disease_predictions
        result = get_disease_predictions(_uid())
        result.pop('status', None)
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load prediction history", exc=e)
