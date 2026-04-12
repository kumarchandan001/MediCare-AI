"""
routes/prediction.py
────────────────────
Disease prediction routes.
Delegates all AI logic to ai/prediction.py.
Delegates all DB persistence to services/health_service.py.
"""

import json
import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify, session

from ai.prediction import predict as run_prediction
from services.health_service import get_disease_predictions, save_disease_prediction
from utils.auth import login_required

prediction_bp = Blueprint('prediction', __name__)


# ── Structured XAI Logger (for IEEE / research auditing) ──────────────────────

def _log_xai_prediction(user_id, symptoms, result):
    """
    Persist a structured XAI log entry to PostgreSQL.
    Uses the existing disease_predictions table — adds confidence_label
    via the existing xai_summary column as a JSON-enriched string.
    Non-fatal: silently swallows errors.
    """
    try:
        xai = result.get('xai', {})
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'user_id': user_id,
            'input_symptoms': symptoms,
            'predicted_disease': result.get('predicted_disease'),
            'confidence_score': result.get('confidence'),
            'confidence_label': result.get('confidence_label', 'Medium'),
            'confidence_explanation': result.get('confidence_explanation', ''),
            'evidence_strength': xai.get('evidence_strength', 'Moderate'),
            'explanation_score': xai.get('explanation_score', 0),
            'top_3_key_symptoms': result.get('top_3_key_symptoms', []),
            'risk_factors_count': len(xai.get('risk_factors', [])),
            'alternatives_count': len(xai.get('alternative_diagnoses', [])),
            'plain_explanation': result.get('plain_explanation', ''),
        }
        print(f"[xai-log] {json.dumps(log_entry, default=str)}")
    except Exception as e:
        print(f"[xai-log] Logging failed (non-fatal): {e}")


# ── Run prediction ────────────────────────────────────────────────────────────

@prediction_bp.route('/predict', methods=['POST'])
@login_required
def predict_disease():
    """Accept symptom dict, return prediction. All AI logic in ai/prediction.py."""
    try:
        user_id = session['user_id']
        data = request.json

        # Edge case: empty body or no symptoms
        if not data or len(data) == 0:
            return jsonify({
                'error': 'Please select at least one symptom to perform prediction.'
            }), 400

        symptoms_list = list(data.keys())
        result = run_prediction(symptoms_list)

        # Edge case: prediction returned an error (e.g. empty after cleaning)
        if result.get('error'):
            return jsonify(result), 400

        # Auto-save prediction to history (with XAI data)
        try:
            xai = result.get('xai', {})
            save_result = save_disease_prediction(user_id, {
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
            print(f"[prediction] Auto-save result: {save_result}")
        except Exception as e:
            print(f"[prediction] Auto-save FAILED: {e}")
            traceback.print_exc()

        # Structured XAI logging (for research / IEEE)
        _log_xai_prediction(user_id, symptoms_list, result)

        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'Prediction failed', 'details': str(e)}), 500


# ── Prediction history ────────────────────────────────────────────────────────

@prediction_bp.route('/api/disease-predictions', methods=['GET'])
@login_required
def list_disease_predictions():
    try:
        user_id = session['user_id']
        result  = get_disease_predictions(user_id)
        status  = result.pop('status', 200)
        return jsonify(result), status
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@prediction_bp.route('/api/disease-predictions', methods=['POST'])
@login_required
def store_disease_prediction():
    try:
        user_id = session['user_id']
        data    = request.json
        if not data or 'symptoms' not in data or 'predicted_disease' not in data:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        result = save_disease_prediction(user_id, data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

