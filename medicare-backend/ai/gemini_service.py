"""
Gemini AI integration for chat and health insights.
"""
import google.generativeai as genai
from core.config import settings


class GeminiService:
    """Handles interaction with Gemini API for medical Q&A."""

    SYSTEM_PROMPT = """You are MediCare AI, a helpful and empathetic medical assistant.
You provide general health information and guidance. You must always:
- Be clear that you're an AI and not a doctor
- Recommend consulting a healthcare professional for serious concerns
- Provide evidence-based information
- Be empathetic and supportive"""

    def __init__(self):
        self.model = None
        self.is_configured = False

    def configure(self):
        """Configure Gemini with API key."""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel("gemini-1.5-flash")
            self.is_configured = True

    async def chat(self, message: str, context: str = "") -> str:
        """Send a message to Gemini and get a response."""
        if not self.is_configured:
            return "AI service is not configured. Please check the API key."

        try:
            prompt = f"{self.SYSTEM_PROMPT}\n\n"
            if context:
                prompt += f"Context: {context}\n\n"
            prompt += f"User: {message}\nAssistant:"

            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"I'm sorry, I encountered an error: {str(e)}"


# Singleton
gemini_service = GeminiService()
