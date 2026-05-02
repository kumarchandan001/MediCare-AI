"""
gemini_service.py
──────────────────
Google Gemini AI integration.
Builds context-aware system prompt and handles conversation.
"""

import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Lazy-loaded Gemini config
_gemini_configured = False
_genai = None


def _ensure_configured():
    global _gemini_configured, _genai
    if _gemini_configured:
        return
    try:
        from core.config import settings

        api_key = settings.GEMINI_API_KEY
        if api_key:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            _genai = genai
            _gemini_configured = True
        else:
            logger.warning("GEMINI_API_KEY not set. Using fallback responses.")
    except ImportError:
        logger.warning(
            "google-generativeai not installed. Using fallback responses."
        )


SYSTEM_PROMPT_TEMPLATE = """
You are Karuna, MediCare AI's personal health assistant.
You are warm, empathetic, and knowledgeable about health topics.

CORE RULES:
1. Always personalize responses using the user's actual health data provided below
2. Be conversational and supportive
3. Give specific, actionable health advice
4. Always recommend consulting a doctor for serious concerns
5. Never diagnose — only provide information
6. Keep responses concise (2-4 paragraphs max)
7. Use the user's name when appropriate
8. If asked about something outside health, gently redirect to health topics
9. Format responses with clear paragraphs (no markdown headers or bullet lists unless specifically requested)
10. Respond in the same language the user writes in (English, Tamil, or Hindi)

DISCLAIMER TO ALWAYS KEEP IN MIND:
You are an AI assistant, not a doctor.
Always recommend professional medical consultation for diagnosis and treatment.

{health_context}

CONVERSATION GUIDELINES:
- Reference the user's actual metrics when relevant
- Notice concerning patterns and gently flag them
- Celebrate improvements in metrics
- Suggest practical, actionable steps
- Keep tone warm and encouraging
"""


def build_system_prompt(health_context_text: str) -> str:
    return SYSTEM_PROMPT_TEMPLATE.format(health_context=health_context_text)


def _fallback_response(message: str) -> str:
    """Rule-based fallback when Gemini unavailable."""
    msg = message.lower()

    if any(w in msg for w in ["sleep", "tired", "fatigue", "rest"]):
        return (
            "Sleep is one of the most important pillars of health. "
            "Adults need 7-9 hours of quality sleep per night. "
            "Try maintaining a consistent sleep schedule, avoiding screens "
            "30 minutes before bed, and keeping your bedroom cool and dark. "
            "If sleep problems persist, please consult a doctor."
        )

    if any(w in msg for w in ["stress", "anxiety", "worry", "tension"]):
        return (
            "Managing stress is crucial for overall health. Try the 4-7-8 "
            "breathing technique: inhale for 4 seconds, hold for 7, exhale "
            "for 8. Regular exercise, adequate sleep, and mindfulness "
            "meditation can also significantly reduce stress levels. If "
            "stress is overwhelming, please speak with a mental health "
            "professional."
        )

    if any(
        w in msg
        for w in ["heart", "chest", "bp", "blood pressure", "cardiac"]
    ):
        return (
            "Heart health is vital. Normal resting heart rate is 60-100 bpm, "
            "and healthy blood pressure is below 120/80 mmHg. Regular "
            "exercise, a balanced diet low in sodium, not smoking, and "
            "managing stress all contribute to good heart health. Please "
            "consult a cardiologist for any chest pain or palpitations."
        )

    if any(w in msg for w in ["diet", "food", "nutrition", "eat", "weight"]):
        return (
            "Good nutrition is the foundation of health. Aim for a balanced "
            "diet with plenty of vegetables, fruits, whole grains, and lean "
            "proteins. Stay hydrated with 8-10 glasses of water daily. Limit "
            "processed foods, excess sugar, and saturated fats. For "
            "personalized diet advice, consult a registered nutritionist."
        )

    if any(
        w in msg
        for w in ["exercise", "workout", "fitness", "steps", "walk"]
    ):
        return (
            "Regular physical activity is essential for health. Aim for at "
            "least 150 minutes of moderate exercise per week, or 10,000 "
            "steps daily. Even a 20-minute walk after meals can significantly "
            "improve metabolic health. Start gradually and increase intensity "
            "over time."
        )

    return (
        "I'm Karuna, your MediCare AI health assistant. I can help you "
        "understand your health metrics, answer questions about wellness, "
        "interpret your prediction results, and guide you toward healthier "
        "habits. What health topic would you like to explore today? "
        "Remember, for medical diagnosis and treatment, always consult a "
        "qualified healthcare professional."
    )


async def get_ai_response(
    message: str,
    history: List[Dict[str, str]],
    system_prompt: str,
) -> str:
    """Get response from Gemini with conversation history and context."""
    _ensure_configured()

    if not _gemini_configured or not _genai:
        return _fallback_response(message)

    try:
        model = _genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
        )

        # Build conversation history for Gemini
        chat_history = []
        for msg in history[-10:]:
            role = "user" if msg["role"] == "user" else "model"
            chat_history.append(
                {"role": role, "parts": [msg["content"]]}
            )

        chat = model.start_chat(history=chat_history)
        response = chat.send_message(message)
        return response.text

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _fallback_response(message)


def get_suggested_questions(
    health_context: str,
    last_prediction: Optional[str] = None,
) -> List[str]:
    """Generate contextual suggested questions based on user's health data."""
    questions = [
        "How can I improve my sleep quality?",
        "What does my heart rate tell me about my health?",
        "How much water should I drink daily?",
        "What are the best exercises for my condition?",
        "How can I reduce stress naturally?",
    ]

    # Add prediction-specific question
    if last_prediction:
        questions.insert(
            0,
            f"What should I know about {last_prediction}?",
        )

    # Add context-specific questions
    if "LOW" in health_context.upper() or "sleep" in health_context.lower():
        questions.insert(1, "How can I fix my sleep schedule?")

    if "HIGH STRESS" in health_context.upper():
        questions.insert(1, "What are the best stress relief techniques?")

    if "ABNORMAL" in health_context.upper():
        questions.insert(1, "Why might my heart rate be abnormal?")

    return questions[:6]
