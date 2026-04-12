"""
models/medication.py
────────────────────
Medication management models:

  MedicationReminder  — scheduled medication with dosage + recurrence schedule
                        matches existing `medication_reminders` table
  MedicationHistory   — log of taken / skipped / delayed doses
                        matches existing `medication_history` table
  MedicalRecord       — uploaded lab reports, prescriptions, imaging, etc.
                        matches existing `medical_records` table

Relationships:
  User ──< MedicationReminder ──< MedicationHistory
  User ──< MedicalRecord
"""

from datetime import datetime
from models import db


class MedicationReminder(db.Model):
    """
    A recurring medication reminder.

    `days_of_week`  — JSON array e.g. '["Mon","Wed","Fri"]'
    `frequency`    — "daily" | "twice_daily" | "weekly" | "as_needed"
    """
    __tablename__ = 'medication_reminders'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    medication_name = db.Column(db.String(120), nullable=False)
    dosage          = db.Column(db.String(60))         # "50mg", "2 tablets" …
    reminder_time   = db.Column(db.String(10), nullable=False)  # "08:00"
    frequency       = db.Column(db.String(30), default='daily')
    days_of_week    = db.Column(db.Text)               # JSON array
    start_date      = db.Column(db.Date)
    end_date        = db.Column(db.Date)
    notes           = db.Column(db.Text)
    is_active       = db.Column(db.Boolean, default=True, nullable=False)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user    = db.relationship('User', backref=db.backref('medication_reminders',
                                                          lazy='dynamic',
                                                          cascade='all, delete-orphan'))
    history = db.relationship('MedicationHistory', back_populates='reminder',
                              lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<MedicationReminder {self.medication_name} user={self.user_id}>'

    def to_dict(self) -> dict:
        import json
        return {
            'id': self.id, 'user_id': self.user_id,
            'medication_name': self.medication_name, 'dosage': self.dosage,
            'reminder_time': self.reminder_time, 'frequency': self.frequency,
            'days_of_week': json.loads(self.days_of_week) if self.days_of_week else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'notes': self.notes, 'is_active': self.is_active,
        }


class MedicationHistory(db.Model):
    """
    A dose event — whether the medication was taken, skipped, or delayed.

    `status` values: "taken" | "skipped" | "delayed"
    """
    __tablename__ = 'medication_history'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    reminder_id     = db.Column(db.Integer, db.ForeignKey('medication_reminders.id',
                                                           ondelete='SET NULL'),
                                nullable=True, index=True)
    medication_name = db.Column(db.String(120), nullable=False)
    dosage          = db.Column(db.String(60))
    taken_at        = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    status          = db.Column(db.String(20), nullable=False)  # taken/skipped/delayed
    notes           = db.Column(db.Text)

    user     = db.relationship('User', backref=db.backref('medication_history',
                                                           lazy='dynamic',
                                                           cascade='all, delete-orphan'))
    reminder = db.relationship('MedicationReminder', back_populates='history')

    def __repr__(self):
        return f'<MedicationHistory {self.medication_name} status={self.status}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'reminder_id': self.reminder_id,
            'medication_name': self.medication_name, 'dosage': self.dosage,
            'taken_at': self.taken_at.isoformat() if self.taken_at else None,
            'status': self.status, 'notes': self.notes,
        }


class MedicalRecord(db.Model):
    """
    An uploaded medical document — lab report, prescription, imaging, etc.

    `record_type` values: "lab_report" | "prescription" | "imaging" |
                          "vaccination" | "discharge_summary" | "other"
    `file_path`   — relative path inside the uploads/ directory.
    """
    __tablename__ = 'medical_records'

    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                            nullable=False, index=True)
    record_name = db.Column(db.String(200), nullable=False)
    record_type = db.Column(db.String(40),  nullable=False)
    file_path   = db.Column(db.String(500))
    file_type   = db.Column(db.String(20))   # "pdf", "jpg", "png" …
    file_size   = db.Column(db.Integer)      # bytes
    record_date = db.Column(db.Date)
    provider    = db.Column(db.String(200))  # doctor / hospital
    notes       = db.Column(db.Text)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('medical_records',
                                                       lazy='dynamic',
                                                       cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<MedicalRecord {self.record_name} type={self.record_type}>'

    def to_dict(self) -> dict:
        return {
            'id': self.id, 'user_id': self.user_id,
            'record_name': self.record_name, 'record_type': self.record_type,
            'file_path': self.file_path, 'file_type': self.file_type,
            'file_size': self.file_size,
            'record_date': self.record_date.isoformat() if self.record_date else None,
            'provider': self.provider, 'notes': self.notes,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
        }
