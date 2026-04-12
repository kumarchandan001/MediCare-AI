"""
models/chat_history.py
──────────────────────
Conversational AI and risk prediction log models:

  ChatSession    — a conversation thread (groups messages)
  ChatMessage    — individual user / assistant message
                   matches existing `chatbot_interactions` table (extended)
  RiskPrediction — AI risk-score / disease-prediction log
                   matches existing `disease_predictions` table (extended)

Relationships:
  User ──< ChatSession ──< ChatMessage
  User ──< RiskPrediction

Design decisions:
  - ChatSession groups messages so multi-turn conversations can be tracked.
  - ChatMessage retains `interaction_type` for backwards compat with existing routes.
  - RiskPrediction adds `risk_level` + `reviewed_by_doctor` flag for clinical audit.
"""

from datetime import datetime
from models import db


class ChatSession(db.Model):
    """
    A conversation session — groups related ChatMessages together.
    One user can have many sessions (e.g. one per day, or one per topic).
    """
    __tablename__ = 'chat_sessions'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                            nullable=False, index=True)
    title       = db.Column(db.String(200))    # optional short label
    topic       = db.Column(db.String(60))     # "general" | "medication" | "symptoms" | …
    started_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    ended_at    = db.Column(db.DateTime)
    is_active   = db.Column(db.Boolean, default=True, nullable=False)

    user     = db.relationship('User', backref=db.backref('chat_sessions',
                                                           lazy='dynamic',
                                                           cascade='all, delete-orphan'))
    messages = db.relationship('ChatMessage', back_populates='session',
                               lazy='dynamic', cascade='all, delete-orphan',
                               order_by='ChatMessage.sent_at')

    def __repr__(self):
        return f'<ChatSession id={self.id} user={self.user_id} topic={self.topic}>'

    def to_dict(self, include_messages: bool = False) -> dict:
        data = {
            'id': self.id, 'user_id': self.user_id,
            'title': self.title, 'topic': self.topic,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'is_active': self.is_active,
        }
        if include_messages:
            data['messages'] = [m.to_dict() for m in self.messages]
        return data


class ChatMessage(db.Model):
    """
    A single message turn in a chat session.

    `role`             — "user" | "assistant" | "system"
    `interaction_type` — "health_advice" | "medication_help" | "general" | …
                         (kept for backwards compat with chatbot_interactions)
    `session_id`       — nullable so legacy rows without a session still load.
    """
    __tablename__ = 'chatbot_interactions'

    id               = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id          = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                 nullable=False, index=True)
    session_id       = db.Column(db.Integer, db.ForeignKey('chat_sessions.id', ondelete='SET NULL'),
                                 nullable=True, index=True)

    role             = db.Column(db.String(20), default='user', nullable=False)  # user/assistant/system
    query            = db.Column(db.Text, nullable=False)    # user's input (kept for compat)
    response         = db.Column(db.Text, nullable=False)    # assistant's reply
    interaction_type = db.Column(db.String(60), default='general')

    # Quality / feedback
    helpful_rating   = db.Column(db.Integer)    # 1–5, user-submitted rating
    flagged          = db.Column(db.Boolean, default=False)  # marked for review

    sent_at          = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user    = db.relationship('User', backref=db.backref('chat_messages',
                                                          lazy='dynamic',
                                                          cascade='all, delete-orphan'))
    session = db.relationship('ChatSession', back_populates='messages')

    def __repr__(self):
        return f'<ChatMessage role={self.role} session={self.session_id}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id, 'session_id': self.session_id,
            'role': self.role, 'query': self.query, 'response': self.response,
            'interaction_type': self.interaction_type,
            'helpful_rating': self.helpful_rating, 'flagged': self.flagged,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
        }


class RiskPrediction(db.Model):
    """
    AI-generated disease / risk prediction log.

    Extends the existing `disease_predictions` table with:
      - `risk_level`          — categorical severity ("low" | "moderate" | "high")
      - `model_version`       — version of the ML model used
      - `reviewed_by_doctor`  — clinical audit flag
      - `doctor_notes`        — clinician feedback

    `symptoms` stored as JSON array for flexibility.
    """
    __tablename__ = 'disease_predictions'

    id                 = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id            = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                   nullable=False, index=True)

    # Prediction inputs
    symptoms           = db.Column(db.Text, nullable=False)    # JSON array of symptom strings

    # Prediction outputs
    predicted_disease  = db.Column(db.String(200))
    confidence_score   = db.Column(db.Float)                   # 0.0 – 1.0
    risk_level         = db.Column(db.String(20))              # low / moderate / high
    recommendations    = db.Column(db.Text)                    # free-text or JSON

    # Metadata
    model_version      = db.Column(db.String(40))              # e.g. "rf-v2.1"
    saved_to_records   = db.Column(db.Boolean, default=False)

    # Clinical review
    reviewed_by_doctor = db.Column(db.Boolean, default=False)
    doctor_notes       = db.Column(db.Text)
    reviewed_at        = db.Column(db.DateTime)

    predicted_at       = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = db.relationship('User', backref=db.backref('risk_predictions',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<RiskPrediction disease={self.predicted_disease} conf={self.confidence_score}>'

    def to_dict(self) -> dict:
        import json
        syms = self.symptoms
        if syms:
            try:   syms = json.loads(syms)
            except Exception: pass
        return {
            'id': self.id, 'user_id': self.user_id,
            'symptoms': syms,
            'predicted_disease': self.predicted_disease,
            'confidence_score': self.confidence_score,
            'risk_level': self.risk_level,
            'recommendations': self.recommendations,
            'model_version': self.model_version,
            'saved_to_records': self.saved_to_records,
            'reviewed_by_doctor': self.reviewed_by_doctor,
            'doctor_notes': self.doctor_notes,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'predicted_at': self.predicted_at.isoformat() if self.predicted_at else None,
        }
