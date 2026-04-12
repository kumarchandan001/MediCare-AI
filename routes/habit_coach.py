"""
routes/habit_coach.py
─────────────────────
API endpoints for the AI-based habit coaching system.

Endpoints:
  GET /api/habit-coach           — get habit coaching tips for the current user
"""

import traceback
from flask import Blueprint, request, jsonify, session
from services.habit_coach import generate_habit_tips

habit_coach_bp = Blueprint('habit_coach', __name__)

from utils.auth import login_required

@habit_coach_bp.route('/api/habit-coach', methods=['GET'])
@login_required
def get_habit_tips():
    """
    Generate and return personalised habit coaching tips.
    Query params:
      days — lookback window (default: 7)
    """
    try:
        user_id = session['user_id']
        days    = request.args.get('days', 7, type=int)

        coaching_data = generate_habit_tips(user_id, days=days)

        return jsonify({
            'success': True,
            'user_id': user_id,
            'days': days,
            'focus_area': coaching_data['focus_area'],
            'profile': coaching_data['profile'],
            'streak': coaching_data['streak'],
            'tips': coaching_data['tips'],
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
