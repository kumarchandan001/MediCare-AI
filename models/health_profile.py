"""
models/health_profile.py
────────────────────────
HealthProfile — one-to-one extension of User for onboarding health data.

Stores the user's baseline health information collected during onboarding.
Separated from User to keep auth data clean and health data modular.
"""

from datetime import datetime
from models import db


class HealthProfile(db.Model):
    """
    Baseline health profile collected during onboarding.
    One-to-one with User (each user has exactly one profile).
    """
    __tablename__ = 'health_profiles'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False, unique=True, index=True
    )

    # ── Demographics ──────────────────────────────────────────────────────────
    age         = db.Column(db.Integer)                    # years
    gender      = db.Column(db.String(20))                 # Male/Female/Other

    # ── Body measurements ─────────────────────────────────────────────────────
    height      = db.Column(db.Float)                      # cm
    weight      = db.Column(db.Float)                      # kg

    # ── Medical info ──────────────────────────────────────────────────────────
    blood_group = db.Column(db.String(5))                  # A+, B-, AB+, O-, etc.
    conditions  = db.Column(db.Text)                       # JSON array or comma-separated
    allergies   = db.Column(db.Text)                       # JSON array or comma-separated
    lifestyle   = db.Column(db.Text)                       # sedentary/moderate/active

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow,
                            onupdate=datetime.utcnow, nullable=False)

    # ── Relationship ──────────────────────────────────────────────────────────
    user = db.relationship('User', back_populates='health_profile')

    def __repr__(self):
        return f'<HealthProfile user_id={self.user_id}>'

    def to_dict(self) -> dict:
        return {
            'id':          self.id,
            'user_id':     self.user_id,
            'age':         self.age,
            'gender':      self.gender,
            'height':      self.height,
            'weight':      self.weight,
            'blood_group': self.blood_group,
            'conditions':  self.conditions,
            'allergies':   self.allergies,
            'lifestyle':   self.lifestyle,
            'created_at':  self.created_at.isoformat() if self.created_at else None,
            'updated_at':  self.updated_at.isoformat() if self.updated_at else None,
        }
