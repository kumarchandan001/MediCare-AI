"""
routes/alerts.py
────────────────
API endpoints for the smart alert generation system.

Endpoints:
  GET    /api/alerts                — generate + return alerts for the current user
  GET    /api/alerts/history        — fetch persisted alerts from DB
  PATCH  /api/alerts/<alert_id>     — update alert status (acknowledge / dismiss / resolve)
  DELETE /api/alerts/<alert_id>     — delete a specific alert
  POST   /api/alerts/generate       — explicitly trigger alert generation & persistence
"""

import json
import traceback
from datetime import datetime

from flask import Blueprint, request, jsonify, session

from services.alert_service import generate_alerts, persist_alerts
from utils.db_helper import fetch_all, execute_sql, table_exists
from utils.auth import login_required

alerts_bp = Blueprint('alerts', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/alerts — Generate alerts live (does NOT persist)
# ─────────────────────────────────────────────────────────────────────────────

@alerts_bp.route('/api/alerts', methods=['GET'])
@login_required
def get_alerts():
    """
    Generate and return alerts based on the user's current health data.
    Query params:
      days  — lookback window (default: 7)
    """
    try:
        user_id = session['user_id']
        days    = request.args.get('days', 7, type=int)
        alerts  = generate_alerts(user_id, days=days)

        # Group by severity for summary
        summary = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for a in alerts:
            sev = a.get('severity', 'low')
            if sev in summary:
                summary[sev] += 1

        return jsonify({
            'success':  True,
            'user_id':  user_id,
            'days':     days,
            'count':    len(alerts),
            'summary':  summary,
            'alerts':   alerts,
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/alerts/generate — Trigger generation AND persistence
# ─────────────────────────────────────────────────────────────────────────────

@alerts_bp.route('/api/alerts/generate', methods=['POST'])
@login_required
def trigger_alerts():
    """
    Generate alerts and persist them to the alerts table.
    Body (optional JSON):
      { "days": 7 }
    """
    try:
        user_id = session['user_id']
        body    = request.get_json(silent=True) or {}
        days    = body.get('days', 7)

        alerts  = generate_alerts(user_id, days=days)
        saved   = persist_alerts(user_id, alerts)

        return jsonify({
            'success':   True,
            'generated': len(alerts),
            'persisted': saved,
            'alerts':    alerts,
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/alerts/history — Fetch persisted alerts from DB
# ─────────────────────────────────────────────────────────────────────────────

@alerts_bp.route('/api/alerts/history', methods=['GET'])
@login_required
def get_alert_history():
    """
    Fetch stored alerts from the alerts table.
    Query params:
      status  — filter by status (default: all)
      limit   — max alerts returned (default: 50)
    """
    try:
        user_id = session['user_id']
        status  = request.args.get('status')
        limit   = request.args.get('limit', 50, type=int)

        if not table_exists('alerts'):
            return jsonify({'success': True, 'alerts': [], 'count': 0})

        if status:
            rows = fetch_all('''
                SELECT * FROM alerts
                WHERE user_id = :uid AND status = :status
                ORDER BY triggered_at DESC
                LIMIT :lim
            ''', {'uid': user_id, 'status': status, 'lim': limit})
        else:
            rows = fetch_all('''
                SELECT * FROM alerts
                WHERE user_id = :uid
                ORDER BY triggered_at DESC
                LIMIT :lim
            ''', {'uid': user_id, 'lim': limit})

        alerts = []
        for row in rows:
            ctx = row['context_data']
            if ctx:
                try:    ctx = json.loads(ctx)
                except: pass
            alerts.append({
                'id':              row['id'],
                'alert_type':      row['alert_type'],
                'severity':        row['severity'],
                'title':           row['title'],
                'message':         row['message'],
                'context_data':    ctx,
                'status':          row['status'],
                'triggered_at':    str(row['triggered_at']) if row.get('triggered_at') else None,
                'acknowledged_at': str(row['acknowledged_at']) if row.get('acknowledged_at') else None,
                'resolved_at':     str(row['resolved_at']) if row.get('resolved_at') else None,
            })

        return jsonify({'success': True, 'count': len(alerts), 'alerts': alerts})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/alerts/<alert_id> — Update status
# ─────────────────────────────────────────────────────────────────────────────

@alerts_bp.route('/api/alerts/<int:alert_id>', methods=['PATCH'])
@login_required
def update_alert_status(alert_id):
    """
    Update the status of a persisted alert.
    Body JSON:
      { "status": "acknowledged" | "dismissed" | "resolved" }
    """
    try:
        user_id    = session['user_id']
        data       = request.get_json(silent=True) or {}
        new_status = data.get('status')

        valid_statuses = {'active', 'acknowledged', 'dismissed', 'resolved'}
        if new_status not in valid_statuses:
            return jsonify({
                'success': False,
                'error':   f'Invalid status. Must be one of: {", ".join(sorted(valid_statuses))}'
            }), 400

        now = datetime.utcnow()

        # Build update dynamically based on status transition
        if new_status == 'acknowledged':
            result = execute_sql('''
                UPDATE alerts
                SET status = :status, acknowledged_at = :now
                WHERE id = :aid AND user_id = :uid
            ''', {'status': new_status, 'now': now, 'aid': alert_id, 'uid': user_id},
            commit=True)
        elif new_status == 'resolved':
            result = execute_sql('''
                UPDATE alerts
                SET status = :status, resolved_at = :now
                WHERE id = :aid AND user_id = :uid
            ''', {'status': new_status, 'now': now, 'aid': alert_id, 'uid': user_id},
            commit=True)
        else:
            result = execute_sql('''
                UPDATE alerts SET status = :status
                WHERE id = :aid AND user_id = :uid
            ''', {'status': new_status, 'aid': alert_id, 'uid': user_id},
            commit=True)

        if result.rowcount == 0:
            return jsonify({'success': False, 'error': 'Alert not found'}), 404

        return jsonify({'success': True, 'alert_id': alert_id, 'new_status': new_status})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /api/alerts/<alert_id> — Remove a persisted alert
# ─────────────────────────────────────────────────────────────────────────────

@alerts_bp.route('/api/alerts/<int:alert_id>', methods=['DELETE'])
@login_required
def delete_alert(alert_id):
    try:
        user_id = session['user_id']
        result  = execute_sql(
            'DELETE FROM alerts WHERE id = :aid AND user_id = :uid',
            {'aid': alert_id, 'uid': user_id},
            commit=True
        )
        if result.rowcount == 0:
            return jsonify({'success': False, 'error': 'Alert not found'}), 404

        return jsonify({'success': True, 'deleted': alert_id})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
