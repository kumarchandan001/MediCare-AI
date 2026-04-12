"""
models/health_record.py
───────────────────────
Health tracking models:

  HealthMonitoring  — vital sign snapshots (HR, BP, O2, temperature …)
                      matches existing `health_monitoring` table
  DailyHealthLog    — daily aggregate metrics (sleep, water, steps, calories)
                      NEW — normalises daily wellness data out of health_monitoring
  BmiRecord         — historical BMI entries
                      matches existing `bmi_history` table
  ActivityRecord    — workout / movement sessions
                      matches existing `activity_tracking` table
  HealthGoal        — user-set health targets
                      matches existing `health_goals` table
  HealthMetric      — raw time-series metric values (generic key-value)
                      matches existing `health_data` table

All models foreign-key to `users.id`.
"""

from datetime import datetime
from models import db


class HealthMonitoring(db.Model):
    """
    Point-in-time vital-sign snapshot.
    Blood pressure stored as JSON {'systolic': int, 'diastolic': int}.
    """
    __tablename__ = 'health_monitoring'

    id                = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id           = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                  nullable=False, index=True)
    # Vitals
    heart_rate        = db.Column(db.Integer)           # bpm
    blood_pressure    = db.Column(db.Text)              # JSON {'systolic', 'diastolic'}
    oxygen_level      = db.Column(db.Integer)           # SpO2 %
    body_temperature  = db.Column(db.Float)             # °F or °C
    glucose_level     = db.Column(db.Float)             # mg/dL
    cholesterol_level = db.Column(db.Float)             # mg/dL
    stress_level      = db.Column(db.Integer)           # 1–10 scale
    sleep_hours       = db.Column(db.Float)             # hours

    notes             = db.Column(db.Text)
    source            = db.Column(db.String(20), nullable=False, default='manual')  # 'manual' or 'google_fit'
    created_at        = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('health_records',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<HealthMonitoring user={self.user_id} at={self.created_at}>'

    def to_dict(self) -> dict:
        import json
        bp = self.blood_pressure
        if bp:
            try:   bp = json.loads(bp)
            except Exception: pass
        return {
            'id': self.id, 'user_id': self.user_id,
            'heart_rate': self.heart_rate, 'blood_pressure': bp,
            'oxygen_level': self.oxygen_level, 'body_temperature': self.body_temperature,
            'glucose_level': self.glucose_level, 'cholesterol_level': self.cholesterol_level,
            'stress_level': self.stress_level, 'sleep_hours': self.sleep_hours,
            'notes': self.notes, 'source': self.source,
            'created_at': self.created_at.isoformat(),
        }


class DailyHealthLog(db.Model):
    """
    One row per (user, date) — daily aggregated wellness metrics.

    Normalises data that was previously scattered across generic health_data rows:
      sleep, water intake, steps, calories, mood

    Unique constraint on (user_id, log_date) prevents duplicate daily entries.
    """
    __tablename__ = 'daily_health_logs'

    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                               nullable=False, index=True)
    log_date       = db.Column(db.Date, nullable=False, index=True)

    # Sleep
    sleep_hours    = db.Column(db.Float)                # total sleep in hours
    sleep_quality  = db.Column(db.Integer)              # 1 (poor) – 5 (excellent)
    bedtime        = db.Column(db.Time)
    wake_time      = db.Column(db.Time)

    # Hydration
    water_ml       = db.Column(db.Integer)              # total water in ml
    water_goal_ml  = db.Column(db.Integer, default=2000)

    # Activity summary
    steps          = db.Column(db.Integer)
    steps_goal     = db.Column(db.Integer, default=10000)
    calories_in    = db.Column(db.Integer)              # kcal consumed
    calories_out   = db.Column(db.Integer)              # kcal burned

    # Mood / wellness
    mood_score     = db.Column(db.Integer)              # 1–10
    energy_level   = db.Column(db.Integer)              # 1–10
    notes          = db.Column(db.Text)
    source         = db.Column(db.String(20), nullable=False, default='manual')  # 'manual' or 'google_fit'

    created_at     = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = db.Column(db.DateTime, default=datetime.utcnow,
                               onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'log_date', 'source', name='uq_daily_log_user_date_source'),
    )

    user = db.relationship('User', backref=db.backref('daily_logs',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<DailyHealthLog user={self.user_id} date={self.log_date} src={self.source}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'log_date': self.log_date.isoformat() if self.log_date else None,
            'sleep_hours': self.sleep_hours, 'sleep_quality': self.sleep_quality,
            'water_ml': self.water_ml, 'water_goal_ml': self.water_goal_ml,
            'steps': self.steps, 'steps_goal': self.steps_goal,
            'calories_in': self.calories_in, 'calories_out': self.calories_out,
            'mood_score': self.mood_score, 'energy_level': self.energy_level,
            'notes': self.notes, 'source': self.source,
        }


class BmiRecord(db.Model):
    """BMI measurement history — one entry per weigh-in."""
    __tablename__ = 'bmi_history'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                             nullable=False, index=True)
    height       = db.Column(db.Float, nullable=False)     # cm
    weight       = db.Column(db.Float, nullable=False)     # kg
    bmi          = db.Column(db.Float, nullable=False)
    bmi_category = db.Column(db.String(20))                # Underweight/Normal/Overweight/Obese
    notes        = db.Column(db.Text)
    recorded_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('bmi_records',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<BmiRecord user={self.user_id} bmi={self.bmi} cat={self.bmi_category}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'height': self.height, 'weight': self.weight,
            'bmi': self.bmi, 'bmi_category': self.bmi_category,
            'notes': self.notes,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
        }


class ActivityRecord(db.Model):
    """A single physical-activity session."""
    __tablename__ = 'activity_tracking'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    activity_type   = db.Column(db.String(60), nullable=False)  # walking, running, cycling …
    duration        = db.Column(db.Integer)    # minutes
    steps           = db.Column(db.Integer)
    distance        = db.Column(db.Float)      # km
    calories_burned = db.Column(db.Integer)    # kcal
    heart_rate_avg  = db.Column(db.Integer)    # bpm
    heart_rate_max  = db.Column(db.Integer)    # bpm
    activity_date   = db.Column(db.Date,       index=True)
    start_time      = db.Column(db.Time)
    end_time        = db.Column(db.Time)
    notes           = db.Column(db.Text)
    source          = db.Column(db.String(20), nullable=False, default='manual')  # 'manual' or 'google_fit'
    created_at      = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('activities',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<ActivityRecord user={self.user_id} type={self.activity_type} src={self.source}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'activity_type': self.activity_type, 'duration': self.duration,
            'steps': self.steps, 'distance': self.distance,
            'calories_burned': self.calories_burned,
            'heart_rate_avg': self.heart_rate_avg, 'heart_rate_max': self.heart_rate_max,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'start_time': str(self.start_time) if self.start_time else None,
            'end_time': str(self.end_time) if self.end_time else None,
            'notes': self.notes, 'source': self.source,
        }


class HealthGoal(db.Model):
    """A user-defined health target (steps, water, exercise minutes …)."""
    __tablename__ = 'health_goals'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                              nullable=False, index=True)
    goal_type     = db.Column(db.String(60), nullable=False)  # steps, water_intake, …
    target_value  = db.Column(db.Float, nullable=False)
    current_value = db.Column(db.Float, default=0.0)
    start_date    = db.Column(db.Date)
    end_date      = db.Column(db.Date)
    frequency     = db.Column(db.String(20), default='daily')  # daily/weekly/monthly
    is_active     = db.Column(db.Boolean, default=True, nullable=False)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('health_goals',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<HealthGoal user={self.user_id} type={self.goal_type}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'goal_type': self.goal_type,
            'target_value': self.target_value, 'current_value': self.current_value,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'frequency': self.frequency, 'is_active': self.is_active,
        }


class HealthMetric(db.Model):
    """
    Generic time-series metric store for arbitrary key→value pairs
    (heart_rate, steps, weight, bmi …).
    Kept as a compaction table alongside the specific tables.
    """
    __tablename__ = 'health_data'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                           nullable=False, index=True)
    metric     = db.Column(db.String(60), nullable=False, index=True)
    value      = db.Column(db.Float, nullable=False)
    timestamp  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('health_metrics',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<HealthMetric user={self.user_id} {self.metric}={self.value}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'metric': self.metric, 'value': self.value,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }
