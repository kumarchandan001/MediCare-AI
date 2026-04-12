"""
routes/api/v1/habits.py
───────────────────────
V1 API endpoints for habit coaching and AI chatbot.

Delegates to: services/habit_coach.py, services/chatbot.py,
              services/health_service.py
"""

import traceback
from flask import request, session

from routes.api.v1 import api_v1
from utils.api_response import success, error, server_error
from utils.api_validators import require_json
from utils.auth import login_required


def _uid():
    return session['user_id']


# ═════════════════════════════════════════════════════════════════════════════
#  Habit Tips
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/habits/tips', methods=['GET'])
@login_required
def v1_habit_tips():
    """Return personalised habit coaching tips."""
    try:
        from services.habit_coach import generate_habit_tips
        days = request.args.get('days', 7, type=int)
        result = generate_habit_tips(_uid(), days=days)
        return success(result)
    except Exception as e:
        traceback.print_exc()
        return success({
            'tips': [],
            'focus_area': None,
            'message': 'Log health data to receive personalised tips.',
        })


# ═════════════════════════════════════════════════════════════════════════════
#  AI Chatbot
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/habits/chat', methods=['GET'])
@login_required
def v1_get_chat_history():
    """Return recent chatbot interaction history."""
    try:
        from utils.db_helper import fetch_all, table_exists

        if not table_exists('chatbot_interactions'):
            return success({'interactions': [], 'count': 0})

        limit = request.args.get('limit', 50, type=int)
        rows = fetch_all('''
            SELECT id, query, response, interaction_type, created_at
            FROM chatbot_interactions
            WHERE user_id = :uid
            ORDER BY created_at DESC
            LIMIT :lim
        ''', {'uid': _uid(), 'lim': limit})

        interactions = []
        for row in rows:
            interactions.append({
                'id': row['id'],
                'query': row['query'],
                'response': row['response'],
                'interaction_type': row.get('interaction_type', 'general'),
                'created_at': str(row['created_at']) if row.get('created_at') else None,
            })

        return success({'interactions': interactions, 'count': len(interactions)})
    except Exception as e:
        traceback.print_exc()
        return server_error("Unable to load chat history", exc=e)


@api_v1.route('/habits/chat', methods=['POST'])
@login_required
def v1_post_chat():
    """Send a message to the AI health chatbot and get a response."""
    try:
        if not require_json():
            return error("Request must be JSON", code=415)

        data = request.json
        if not data or not data.get('message', '').strip():
            return error("Please provide a message")

        from services.chatbot import generate_response
        result = generate_response(_uid(), data['message'])

        response_data = {
            'response': result.get('response', ''),
            'context_used': result.get('context_used', False),
            'source': result.get('source', 'unknown'),
        }

        # Persist the interaction
        try:
            from services.health_service import record_chatbot_interaction
            record_chatbot_interaction(_uid(), {
                'query': data['message'],
                'response': result.get('response', ''),
                'interaction_type': data.get('interaction_type', 'general'),
            })
        except Exception as save_err:
            print(f"[habits/chat] Failed to persist interaction: {save_err}")

        return success(response_data)
    except Exception as e:
        traceback.print_exc()
        return server_error("Chat request failed", exc=e)
