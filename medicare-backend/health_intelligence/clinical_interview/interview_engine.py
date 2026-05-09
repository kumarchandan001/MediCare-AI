from typing import Dict, Any, List
from .interview_state_manager import InterviewStateManager
from .adaptive_question_engine import AdaptiveQuestionEngine
from .clinical_context_tracker import ClinicalContextTracker
from .symptom_clarification_engine import SymptomClarificationEngine
from .uncertainty_reduction_engine import UncertaintyReductionEngine
from .conversation_memory import ConversationMemory
from .interview_flow_controller import InterviewFlowController
from .hypothesis_tracker import HypothesisTracker
from .contradiction_detector import ContradictionDetector
from .temporal_reasoning_engine import TemporalReasoningEngine
from .safety_escalation_engine import SafetyEscalationEngine

class ClinicalInterviewEngine:
    def __init__(self):
        self.state_manager = InterviewStateManager()
        self.question_engine = AdaptiveQuestionEngine()
        self.context_tracker = ClinicalContextTracker()
        self.clarification_engine = SymptomClarificationEngine()
        self.uncertainty_engine = UncertaintyReductionEngine()
        self.memory = ConversationMemory()
        self.flow_controller = InterviewFlowController()
        self.hypothesis_tracker = HypothesisTracker()
        self.contradiction_detector = ContradictionDetector()
        self.temporal_reasoning = TemporalReasoningEngine()
        self.safety_engine = SafetyEscalationEngine()

    def start_interview(self, session_id: str, user_id: str) -> Dict[str, Any]:
        state = self.state_manager.start_session(session_id, user_id)
        
        # Initial calm and supportive phrasing
        initial_question = {
            "id": "initial_intake",
            "text": "Hello. I'm here to help you understand your symptoms. What brings you in today?",
            "type": "open"
        }
        
        return self._format_response(state, initial_question)

    def process_response(self, session_id: str, user_id: str, response_data: Dict[str, Any]) -> Dict[str, Any]:
        state = self.state_manager.get_state(session_id)
        if not state:
            return {"error": "Session not found"}

        user_text = response_data.get("text", "")
        question_id = response_data.get("question_id", "unknown")

        # 1. Clarify symptoms
        new_symptoms = self.clarification_engine.extract_symptoms(user_text)
        active_symptoms = list(set(state.active_symptoms + new_symptoms))
        
        # 2. Update state
        state.answered_questions[question_id] = user_text
        state.active_symptoms = active_symptoms

        # 3. Check for emergency escalations
        escalation_result = self.safety_engine.check_escalation(active_symptoms)
        if escalation_result["is_escalated"]:
            state.severity_indicators.append(escalation_result["reason"])
            return self._format_escalation(state, escalation_result)

        # 4. Uncertainty & Stage updates
        uncertainty = self.uncertainty_engine.calculate_uncertainty(active_symptoms, state.answered_questions)
        completeness = self.uncertainty_engine.evaluate_completeness(uncertainty)
        state.remaining_ambiguity = uncertainty
        state.investigation_completeness = completeness

        stage = self.flow_controller.determine_stage(completeness, False)
        state.current_stage = stage

        # 5. Next Question
        if completeness > 0.9:
            next_question = {
                "id": "summary",
                "text": "Thank you for sharing. I believe I have enough information to provide an initial assessment.",
                "type": "summary"
            }
        else:
            next_question = self.question_engine.get_next_question(active_symptoms, state.asked_questions)
        
        state.asked_questions.append(next_question["id"])
        
        self.state_manager.update_state(session_id, {
            "active_symptoms": active_symptoms,
            "current_stage": stage,
            "investigation_completeness": completeness,
            "remaining_ambiguity": uncertainty,
            "asked_questions": state.asked_questions,
            "answered_questions": state.answered_questions
        })

        return self._format_response(state, next_question)

    def _format_response(self, state, next_question) -> Dict[str, Any]:
        # Includes Structured Clinical Reasoning Metadata
        hypotheses = self.hypothesis_tracker.track_hypothesis(state.active_symptoms)
        
        return {
            "next_question": next_question,
            "state": {
                "current_stage": state.current_stage,
                "investigation_completeness": state.investigation_completeness,
                "remaining_ambiguity": state.remaining_ambiguity,
                "active_symptoms": state.active_symptoms,
                "severity_indicators": state.severity_indicators,
                "reasoning_metadata": {
                    "active_domain": state.active_domain,
                    "severity_risk_state": "high" if state.severity_indicators else "normal",
                    "evidence_sufficiency": "sufficient" if state.investigation_completeness > 0.8 else "insufficient",
                    "reasoning_confidence": max(0.1, state.investigation_completeness),
                    "contradiction_signals": [],
                    "hypotheses_preview": hypotheses[:2] # Top 2 hypotheses
                }
            }
        }
    
    def _format_escalation(self, state, escalation_result) -> Dict[str, Any]:
        return {
            "is_escalated": True,
            "escalation_details": escalation_result,
            "state": {
                "severity_indicators": state.severity_indicators,
                "reasoning_metadata": {
                    "severity_risk_state": "critical"
                }
            }
        }
