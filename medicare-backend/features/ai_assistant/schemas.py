"""
schemas.py
─────────────────────────────────────────────
Pydantic schemas for the AI Assistant feature.

v2: Added state + prediction fields to chat response.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ── Request ────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User message to AI",
    )
    include_health_context: bool = True


# ── Response items ─────────────────────────────────────────────

class ChatMessageItem(BaseModel):
    id: int
    role: str  # "user" | "assistant"
    content: str
    created_at: str


class ChatPredictionSummary(BaseModel):
    """Trimmed prediction result included in chat response."""
    predicted_disease: Optional[str] = None
    confidence: Optional[float] = None
    risk_level: Optional[str] = None
    description: Optional[str] = None
    precautions: List[str] = []
    matched_symptoms: List[str] = []


class ChatStateSummary(BaseModel):
    """Conversation state exposed to frontend."""
    symptoms: List[str] = []
    country: Optional[str] = None
    profile: Dict[str, Any] = {}
    health_data: Dict[str, Any] = {}
    turn_count: int = 0


class ChatResponse(BaseModel):
    reply: str
    role: str = "assistant"
    message_id: int
    context_used: bool
    state: Optional[ChatStateSummary] = None
    prediction: Optional[ChatPredictionSummary] = None


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageItem]
    count: int
    has_more: bool


class SuggestedQuestionsResponse(BaseModel):
    questions: List[str]
    category: str


class HealthContextSummary(BaseModel):
    has_data: bool
    latest_sleep: Optional[float] = None
    latest_heart_rate: Optional[int] = None
    latest_stress: Optional[float] = None
    latest_oxygen: Optional[float] = None
    latest_steps: Optional[int] = None
    latest_bmi: Optional[float] = None
    bmi_category: Optional[str] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    last_prediction: Optional[str] = None
    prediction_confidence: Optional[float] = None
    active_alerts: int = 0
    medications: List[str] = []
    days_of_data: int = 0


class ProviderStatus(BaseModel):
    status: str  # "available" | "rate_limited" | "error_cooldown"
    available_in_seconds: Optional[int] = None


class LLMStatusResponse(BaseModel):
    gemini: ProviderStatus
    groq: ProviderStatus
    openrouter: ProviderStatus
