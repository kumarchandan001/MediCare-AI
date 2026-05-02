from sqlalchemy import (
    Column, Integer, String, Float,
    Boolean, DateTime, ForeignKey, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from core.database import Base


class HealthMonitoring(Base):
    __tablename__ = "health_monitoring"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    heart_rate = Column(Integer, nullable=True)
    blood_pressure = Column(String(20), nullable=True)
    oxygen_level = Column(Float, nullable=True)
    body_temperature = Column(Float, nullable=True)
    sleep_hours = Column(Float, nullable=True)
    stress_level = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    data_source = Column(String(30), nullable=True, default="manual")  # "manual" | "google_fit"
    glucose_level = Column(Float, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user = relationship("User", backref="health_records")


class ActivityTracking(Base):
    __tablename__ = "activity_tracking"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    steps = Column(Integer, default=0)
    calories_burned = Column(Integer, default=0)
    duration_minutes = Column(Integer, default=0)
    activity_type = Column(String(50), default="Other")
    distance = Column(Float, nullable=True)
    heart_rate_avg = Column(Integer, nullable=True)
    activity_date = Column(DateTime(timezone=True), nullable=True)
    data_source = Column(String(30), nullable=True, default="manual")  # "manual" | "google_fit"
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class BMIHistory(Base):
    __tablename__ = "bmi_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    height = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    bmi = Column(Float, nullable=False)
    bmi_category = Column(String(30), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class MedicationReminder(Base):
    __tablename__ = "medication_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medicine_name = Column(String(100), nullable=False)
    dosage = Column(String(50), nullable=True)
    reminder_time = Column(String(10), nullable=True)
    frequency = Column(String(20), default="Daily")
    instructions = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    severity = Column(String(20), default="low")
    category = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class DiseasePrediction(Base):
    __tablename__ = "disease_predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    symptoms = Column(Text, nullable=False)
    predicted_disease = Column(String(200), nullable=False)
    confidence = Column(Float, default=0)
    xai_summary = Column(Text, nullable=True)
    evidence_strength = Column(String(20), nullable=True)
    explanation_score = Column(Float, default=0)
    risk_factors_count = Column(Integer, default=0)
    alternatives_count = Column(Integer, default=0)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
