"""
routes/api/v1/alerts.py
───────────────────────
V1 API endpoints for the smart alert system.

Delegates to: services/alert_service.py, utils/db_helper.py
"""

import json
import traceback
from datetime import datetime
from flask import request, session

from routes.api.v1 import api_v1
from utils.api_response import success, error, validation_error, server_error
from utils.auth import login_required


def _uid():
    return session['user_id']


# ═════════════════════════════════════════════════════════════════════════════
#  Generate Alerts (live — does NOT persist)
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/alerts', methods=['GET'])
@login_required
def v1_get_alerts():
    """Generate and return alerts based on current health data."""
    try:
        from services.alert_service import generate_alerts
        days = request.args.get('days', 7, type=int)
        alerts = generate_alerts(_uid(), days=days)

        # Group by severity
        summary = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for a in alerts:
            sev = a.get('severity', 'low')
            if sev in summary:
                summary[sev] += 1

        return success({
            'user_id': _uid(),
            'days': days,
            'count': len(alerts),
            'summary': summary,
            'alerts': alerts,
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to generate alerts", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Critical Alerts Filter
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/alerts/critical', methods=['GET'])
@login_required
def v1_critical_alerts():
    """Return only high/critical severity alerts."""
    try:
        from services.alert_service import generate_alerts
        days = request.args.get('days', 7, type=int)
        alerts = generate_alerts(_uid(), days=days)

        critical = [a for a in alerts if a.get('severity') in ('high', 'critical')]
        return success({
            'count': len(critical),
            'alerts': critical,
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to load critical alerts", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Alert History (persisted in DB)
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/alerts/history', methods=['GET'])
@login_required
def v1_alert_history():
    """Fetch stored alerts from the alerts table."""
    try:
        from utils.db_helper import fetch_all, table_exists

        if not table_exists('alerts'):
            return success({'alerts': [], 'count': 0})

        status_filter = request.args.get('status')
        limit = request.args.get('limit', 50, type=int)

        params = {'uid': _uid(), 'lim': limit}
        if status_filter:
            params['status'] = status_filter
            rows = fetch_all('''
                SELECT * FROM alerts
                WHERE user_id = :uid AND status = :status
                ORDER BY triggered_at DESC
                LIMIT :lim
            ''', params)
        else:
            rows = fetch_all('''
                SELECT * FROM alerts
                WHERE user_id = :uid
                ORDER BY triggered_at DESC
                LIMIT :lim
            ''', params)

        alerts = []
        for row in rows:
            ctx = row.get('context_data')
            if ctx:
                try:
                    ctx = json.loads(ctx)
                except Exception:
                    pass
            alerts.append({
                'id': row['id'],
                'alert_type': row['alert_type'],
                'severity': row['severity'],
                'title': row['title'],
                'message': row['message'],
                'context_data': ctx,
                'status': row['status'],
                'triggered_at': str(row['triggered_at']) if row.get('triggered_at') else None,
                'acknowledged_at': str(row['acknowledged_at']) if row.get('acknowledged_at') else None,
                'resolved_at': str(row['resolved_at']) if row.get('resolved_at') else None,
            })

        return success({'count': len(alerts), 'alerts': alerts})
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to load alert history", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Generate + Persist
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/alerts/generate', methods=['POST'])
@login_required
def v1_generate_alerts():
    """Trigger alert generation and persistence."""
    try:
        from services.alert_service import generate_alerts, persist_alerts

        body = request.get_json(silent=True) or {}
        days = body.get('days', 7)

        alerts = generate_alerts(_uid(), days=days)
        saved = persist_alerts(_uid(), alerts)

        return success({
            'generated': len(alerts),
            'persisted': saved,
            'alerts': alerts,
        })
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to generate alerts", exc=e)


# ═════════════════════════════════════════════════════════════════════════════
#  Update / Delete Alert
# ═════════════════════════════════════════════════════════════════════════════

@api_v1.route('/alerts/<int:alert_id>', methods=['PATCH'])
@login_required
def v1_update_alert(alert_id):
    """Update the status of a persisted alert."""
    try:
        from utils.db_helper import execute_sql

        data = request.get_json(silent=True) or {}
        new_status = data.get('status')

        valid_statuses = {'active', 'acknowledged', 'dismissed', 'resolved'}
        if new_status not in valid_statuses:
            return validation_error(
                f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}"
            )

        now = datetime.utcnow()

        if new_status == 'acknowledged':
            result = execute_sql(
                'UPDATE alerts SET status = :status, acknowledged_at = :now WHERE id = :aid AND user_id = :uid',
                {'status': new_status, 'now': now, 'aid': alert_id, 'uid': _uid()},
                commit=True
            )
        elif new_status == 'resolved':
            result = execute_sql(
                'UPDATE alerts SET status = :status, resolved_at = :now WHERE id = :aid AND user_id = :uid',
                {'status': new_status, 'now': now, 'aid': alert_id, 'uid': _uid()},
                commit=True
            )
        else:
            result = execute_sql(
                'UPDATE alerts SET status = :status WHERE id = :aid AND user_id = :uid',
                {'status': new_status, 'aid': alert_id, 'uid': _uid()},
                commit=True
            )

        if result.rowcount == 0:
            return error("Alert not found", code=404, error_type="NOT_FOUND")

        return success({'alert_id': alert_id, 'new_status': new_status})
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to update alert", exc=e)


@api_v1.route('/alerts/<int:alert_id>', methods=['DELETE'])
@login_required
def v1_delete_alert(alert_id):
    """Delete a persisted alert."""
    try:
        from utils.db_helper import execute_sql

        result = execute_sql(
            'DELETE FROM alerts WHERE id = :aid AND user_id = :uid',
            {'aid': alert_id, 'uid': _uid()},
            commit=True
        )
        if result.rowcount == 0:
            return error("Alert not found", code=404, error_type="NOT_FOUND")

        return success({'deleted': alert_id})
    except Exception as e:
        traceback.print_exc()
        return server_error("Failed to delete alert", exc=e)
