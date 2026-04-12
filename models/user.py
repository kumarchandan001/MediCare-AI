"""
models/user.py
──────────────
User domain models:
  User            — authentication + profile (matches existing `users` table)
  EmergencyContact — emergency contact list  (matches `emergency_contacts`)

Relationships:
  User ──< EmergencyContact      (one-to-many)
  User ──< HealthMonitoring      (back-ref declared in health_record.py)
  User ──< DailyHealthLog        (back-ref declared in health_record.py)
  User ──< BmiRecord             (back-ref declared in health_record.py)
  User ──< MedicationReminder    (back-ref declared in medication.py)
  User ──< Alert                 (back-ref declared in alert.py)
  User ──< ChatMessage           (back-ref declared in chat_history.py)
  User ──< RiskPrediction        (back-ref declared in chat_history.py)
"""

from datetime import datetime
from models import db


class User(db.Model):
    """
    Core user account — authentication credentials + personal health profile.
    Deliberately keeps JSON columns (`medical_conditions`, `allergies`) for
    lightweight storage; structured data lives in dedicated child tables.
    """
    __tablename__ = 'users'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username        = db.Column(db.String(80),  unique=True, nullable=False, index=True)
    email           = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone           = db.Column(db.String(20))
    password_hash   = db.Column(db.String(256), nullable=False)

    # ── Personal profile ──────────────────────────────────────────────────────
    first_name      = db.Column(db.String(60))
    last_name       = db.Column(db.String(60))
    date_of_birth   = db.Column(db.Date)
    gender          = db.Column(db.String(20))

    # Baseline measurements (latest snapshot — history in BmiRecord)
    height          = db.Column(db.Float)   # cm
    weight          = db.Column(db.Float)   # kg
    blood_type      = db.Column(db.String(5))

    # Legacy quick-access emergency contact (full list in EmergencyContact)
    emergency_contact = db.Column(db.String(120))
    emergency_phone   = db.Column(db.String(30))

    # JSON arrays stored as text for flexibility
    medical_conditions = db.Column(db.Text)  # '["diabetes","hypertension"]'
    allergies          = db.Column(db.Text)  # '["penicillin"]'

    # ── Onboarding status ────────────────────────────────────────────────────
    profile_completed  = db.Column(db.Boolean, default=False, nullable=False)
    is_admin           = db.Column(db.Boolean, default=False, nullable=False)
    language           = db.Column(db.String(10), default='en', nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at  = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login  = db.Column(db.DateTime)

    # ── OTP / Security ────────────────────────────────────────────────────────
    email_verified     = db.Column(db.Boolean, default=False, nullable=False)
    account_locked     = db.Column(db.Boolean, default=False, nullable=False)
    locked_until       = db.Column(db.DateTime)
    last_login_ip      = db.Column(db.String(50))
    failed_login_count = db.Column(db.Integer, default=0, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────────
    emergency_contacts = db.relationship(
        'EmergencyContact', back_populates='user',
        cascade='all, delete-orphan', lazy='dynamic'
    )
    health_profile = db.relationship(
        'HealthProfile', back_populates='user',
        uselist=False, cascade='all, delete-orphan'
    )

    @property
    def name(self):
        """Full name from first + last, fallback to username."""
        parts = [self.first_name or '', self.last_name or '']
        full = ' '.join(p for p in parts if p).strip()
        return full or self.username

    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self, include_contacts: bool = False) -> dict:
        """Serialise to a plain dict (no password_hash)."""
        import json
        data = {
            'id':                 self.id,
            'username':           self.username,
            'email':              self.email,
            'first_name':         self.first_name,
            'last_name':          self.last_name,
            'date_of_birth':      self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender':             self.gender,
            'height':             self.height,
            'weight':             self.weight,
            'blood_type':         self.blood_type,
            'medical_conditions': json.loads(self.medical_conditions) if self.medical_conditions else [],
            'allergies':          json.loads(self.allergies) if self.allergies else [],
            'language':           self.language,
            'created_at':         self.created_at.isoformat() if self.created_at else None,
            'last_login':         self.last_login.isoformat() if self.last_login else None,
        }
        if include_contacts:
            data['emergency_contacts'] = [c.to_dict() for c in self.emergency_contacts]
        return data


class EmergencyContact(db.Model):
    """
    Emergency contacts for a user.
    At most one per user should have  is_primary = True.
    """
    __tablename__ = 'emergency_contacts'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                             nullable=False, index=True)
    name         = db.Column(db.String(120), nullable=False)
    relationship = db.Column(db.String(60))
    phone        = db.Column(db.String(30),  nullable=False)
    email        = db.Column(db.String(120))
    address      = db.Column(db.Text)
    is_primary   = db.Column(db.Boolean, default=False, nullable=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', back_populates='emergency_contacts')

    def __repr__(self):
        return f'<EmergencyContact {self.name} for user_id={self.user_id}>'

    def to_dict(self) -> dict:
        return {
            'id':           self.id,
            'name':         self.name,
            'relationship': self.relationship,
            'phone':        self.phone,
            'email':        self.email,
            'address':      self.address,
            'is_primary':   self.is_primary,
        }


class GoogleFitToken(db.Model):
    """
    Stores Google OAuth 2.0 tokens for the Google Fit integration.
    One row per user — tokens are upserted on each OAuth callback.

    Security: access_token and refresh_token are encrypted at rest
    using Fernet symmetric encryption derived from SECRET_KEY.
    """
    __tablename__ = 'google_fit_tokens'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                              nullable=False, unique=True, index=True)
    access_token  = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text)
    expires_at    = db.Column(db.DateTime, nullable=False)
    scopes        = db.Column(db.Text)           # space-separated scopes granted
    google_email  = db.Column(db.String(200))    # email of connected Google account
    last_sync     = db.Column(db.DateTime)        # last successful data sync
    sync_count    = db.Column(db.Integer, default=0)  # total syncs performed
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow,
                              onupdate=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref(
        'google_fit_token', uselist=False, cascade='all, delete-orphan'
    ))

    # ── Encryption helpers ────────────────────────────────────────────────
    @staticmethod
    def _get_fernet():
        """Lazy-init a Fernet cipher from SECRET_KEY (first 32 bytes, base64-encoded)."""
        import os, base64, hashlib
        try:
            from cryptography.fernet import Fernet
            secret = os.getenv('SECRET_KEY', '')
            # Derive a stable 32-byte key via SHA-256
            key_bytes = hashlib.sha256(secret.encode()).digest()
            return Fernet(base64.urlsafe_b64encode(key_bytes))
        except ImportError:
            return None  # cryptography not installed → store plaintext

    @staticmethod
    def encrypt_token(plain: str) -> str:
        """Encrypt a token string. Falls back to plaintext if cryptography is unavailable."""
        f = GoogleFitToken._get_fernet()
        if f and plain:
            return f.encrypt(plain.encode()).decode()
        return plain or ''

    @staticmethod
    def decrypt_token(cipher: str) -> str:
        """Decrypt a token string. Falls back to returning as-is."""
        f = GoogleFitToken._get_fernet()
        if f and cipher:
            try:
                return f.decrypt(cipher.encode()).decode()
            except Exception:
                return cipher  # already plaintext (legacy data)
        return cipher or ''

    # ── Convenience properties ────────────────────────────────────────────
    @property
    def is_expired(self):
        """True if the access token has expired or will expire within 60 s."""
        from datetime import timedelta
        return datetime.utcnow() >= (self.expires_at - timedelta(seconds=60))

    @property
    def is_connected(self):
        """True if a valid refresh_token exists (account is linked)."""
        return bool(self.refresh_token)

    def __repr__(self):
        return f'<GoogleFitToken user_id={self.user_id} expires={self.expires_at}>'

    def to_dict(self) -> dict:
        return {
            'user_id':      self.user_id,
            'connected':    self.is_connected,
            'expired':      self.is_expired,
            'last_sync':    self.last_sync.isoformat() if self.last_sync else None,
            'google_email': self.google_email,
            'sync_count':   self.sync_count or 0,
            'scopes':       self.scopes,
        }

