"""
models/alert.py
───────────────
Alerting and notification models:

  Alert          — system-generated or rule-triggered health alert
  AlertRule      — user-configurable thresholds that trigger alerts

Relationships:
  User ──< AlertRule ──< Alert   (one alert rule → many alerts fired)
  User ──< Alert                 (alerts may also be generated without a rule)

Alert types:
  "vital_threshold"   — e.g. HR > 120 bpm
  "medication_missed" — a dose was skipped
  "goal_reminder"     — daily goal not met by threshold time
  "risk_flag"         — elevated risk score from AI prediction
  "system"            — internal system notification

Severity levels: "low" | "medium" | "high" | "critical"
Status:          "active" | "acknowledged" | "dismissed" | "resolved"
"""

from datetime import datetime
from models import db


class AlertRule(db.Model):
    """
    A configurable threshold rule that the system evaluates on new health data.

    Example:
        metric        = "heart_rate"
        operator      = ">"
        threshold     = 120.0
        severity      = "high"
        is_active     = True
    """
    __tablename__ = 'alert_rules'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                              nullable=False, index=True)
    name          = db.Column(db.String(120), nullable=False)
    description   = db.Column(db.Text)

    # Rule definition
    metric        = db.Column(db.String(60),  nullable=False)  # "heart_rate", "bmi", …
    operator      = db.Column(db.String(5),   nullable=False)  # ">", "<", ">=", "<=", "=="
    threshold     = db.Column(db.Float,       nullable=False)

    severity      = db.Column(db.String(20), default='medium', nullable=False)
    is_active     = db.Column(db.Boolean,    default=True, nullable=False)
    created_at    = db.Column(db.DateTime,   default=datetime.utcnow, nullable=False)

    user   = db.relationship('User', backref=db.backref('alert_rules',
                                                         lazy='dynamic',
                                                         cascade='all, delete-orphan'))
    alerts = db.relationship('Alert', back_populates='rule',
                             lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<AlertRule {self.name} {self.metric}{self.operator}{self.threshold}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'name': self.name, 'description': self.description,
            'metric': self.metric, 'operator': self.operator,
            'threshold': self.threshold, 'severity': self.severity,
            'is_active': self.is_active,
        }


class Alert(db.Model):
    """
    A fired alert notification.

    `rule_id` is nullable — alerts can be system-generated without a rule.
    `context_data` — JSON snapshot of the health reading that triggered this alert.
    """
    __tablename__ = 'alerts'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                             nullable=False, index=True)
    rule_id      = db.Column(db.Integer, db.ForeignKey('alert_rules.id', ondelete='SET NULL'),
                             nullable=True, index=True)

    alert_type   = db.Column(db.String(40),  nullable=False)   # vital_threshold / medication_missed …
    severity     = db.Column(db.String(20),  nullable=False)   # low / medium / high / critical
    title        = db.Column(db.String(200), nullable=False)
    message      = db.Column(db.Text,        nullable=False)
    context_data = db.Column(db.Text)                          # JSON snapshot
    status       = db.Column(db.String(20),  default='active', nullable=False)  # active/acknowledged/…

    triggered_at     = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    acknowledged_at  = db.Column(db.DateTime)
    resolved_at      = db.Column(db.DateTime)

    user = db.relationship('User', backref=db.backref('alerts',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))
    rule = db.relationship('AlertRule', back_populates='alerts')

    def __repr__(self):
        return f'<Alert [{self.severity}] {self.title} status={self.status}>'

    def to_dict(self) -> dict:
        import json
        ctx = self.context_data
        if ctx:
            try:   ctx = json.loads(ctx)
            except Exception: pass
        return {
            'id': self.id, 'user_id': self.user_id, 'rule_id': self.rule_id,
            'alert_type': self.alert_type, 'severity': self.severity,
            'title': self.title, 'message': self.message,
            'context_data': ctx, 'status': self.status,
            'triggered_at': self.triggered_at.isoformat() if self.triggered_at else None,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }
