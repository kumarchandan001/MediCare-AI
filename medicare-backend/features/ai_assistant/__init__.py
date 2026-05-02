# features/ai_assistant/__init__.py
# Register models so SQLAlchemy auto-creates tables on startup
from features.ai_assistant.chat_state import ChatSession  # noqa: F401
