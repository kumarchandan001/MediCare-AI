from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class InterviewState(BaseModel):
    session_id: str
    user_id: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    current_stage: str = "initial_intake"
    asked_questions: List[str] = Field(default_factory=list)
    answered_questions: Dict[str, Any] = Field(default_factory=dict)
    skipped_questions: List[str] = Field(default_factory=list)
    active_symptoms: List[str] = Field(default_factory=list)
    severity_indicators: List[str] = Field(default_factory=list)
    investigation_completeness: float = 0.0
    remaining_ambiguity: float = 1.0
    active_domain: str = "general"

class InterviewStateManager:
    def __init__(self):
        # In a real app, this would be stored in a database (e.g., Redis or Postgres)
        self.active_sessions: Dict[str, InterviewState] = {}

    def start_session(self, session_id: str, user_id: str) -> InterviewState:
        state = InterviewState(session_id=session_id, user_id=user_id)
        self.active_sessions[session_id] = state
        return state

    def get_state(self, session_id: str) -> Optional[InterviewState]:
        return self.active_sessions.get(session_id)

    def update_state(self, session_id: str, update_data: Dict[str, Any]) -> Optional[InterviewState]:
        state = self.get_state(session_id)
        if not state:
            return None
        
        for key, value in update_data.items():
            if hasattr(state, key):
                setattr(state, key, value)
        
        self.active_sessions[session_id] = state
        return state
