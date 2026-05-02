"""
service.py
─────────────────────────────────────────────
AI Assistant service layer (v2 — intelligent chatbot).

Changes from v1:
  • send_message now runs through chat_controller.process_message()
  • Prediction is triggered automatically when enough symptoms are collected
  • Conversation state is persisted and returned with every response
  • Multi-LLM fallback (Gemini → Groq → OpenRouter) via multi_llm_service

Preserved from v1:
  • Chat history DB (ChatMessage table)
  • get_chat_history / clear_history
  • get_suggested_qs (personalized)
"""

import logging
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete, func

from features.health.models import ChatMessage, DiseasePrediction
from features.auth.models import User
from features.ai_assistant.health_context import (
    build_health_context,
    format_context_for_prompt,
)
from features.ai_assistant.gemini_service import (
    build_system_prompt,
    get_suggested_questions,
)
from features.ai_assistant.chat_controller import process_message
from core.cache import cache, cache_key

logger = logging.getLogger(__name__)

CONTEXT_CACHE_TTL = 5 * 60  # 5 minutes
MAX_HISTORY = 50


async def get_chat_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 20,
) -> List[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(desc(ChatMessage.created_at))
        .limit(limit)
    )
    msgs = result.scalars().all()
    return list(reversed(msgs))


async def save_message(
    db: AsyncSession,
    user_id: int,
    role: str,
    content: str,
) -> ChatMessage:
    msg = ChatMessage(
        user_id=user_id,
        role=role,
        content=content,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def clear_history(
    db: AsyncSession,
    user_id: int,
) -> int:
    result = await db.execute(
        select(func.count()).where(ChatMessage.user_id == user_id)
    )
    count = result.scalar() or 0
    await db.execute(
        delete(ChatMessage).where(ChatMessage.user_id == user_id)
    )
    await db.commit()

    # Also reset chat state when history is cleared
    from features.ai_assistant.chat_state import reset_state
    await reset_state(db, user_id)

    return count


async def send_message(
    db: AsyncSession,
    user: User,
    message: str,
    include_health_context: bool = True,
) -> dict:
    """
    Process user message through the intelligent chat controller.

    Pipeline:
      1. Get conversation history for LLM context
      2. Save user message to DB
      3. Run chat_controller.process_message() → NLP, state, tools, LLM
      4. Save AI reply to DB
      5. Return reply + state + optional prediction
    """
    # Get history for context
    history_msgs = await get_chat_history(db, user.id, limit=10)
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_msgs
    ]

    # Save user message
    user_msg = await save_message(db, user.id, "user", message)

    # ── Run the intelligent controller ──────────────────────────
    try:
        result = await process_message(
            db=db,
            user_id=user.id,
            username=user.username or "User",
            message=message,
            history=history,
        )
    except Exception as e:
        logger.error(f"Chat controller error: {e}", exc_info=True)
        # Fallback: use old Gemini-only flow
        result = await _fallback_flow(db, user, message, history, include_health_context)

    reply = result.get("reply", "I'm sorry, I couldn't process that. Please try again.")

    # Save AI reply
    ai_msg = await save_message(db, user.id, "assistant", reply)

    return {
        "reply":         reply,
        "role":          "assistant",
        "message_id":    ai_msg.id,
        "context_used":  True,
        "state":         result.get("state"),
        "prediction":    result.get("prediction"),
    }


async def _fallback_flow(
    db: AsyncSession,
    user: User,
    message: str,
    history: list[dict],
    include_health_context: bool,
) -> dict:
    """Legacy Gemini-only fallback if the new controller crashes."""
    from features.ai_assistant.gemini_service import get_ai_response

    context_text = ""
    if include_health_context:
        ck = cache_key("chat_context", user.id)
        cached = await cache.get(ck)
        if cached:
            context_text = cached
        else:
            ctx = await build_health_context(db, user)
            context_text = format_context_for_prompt(ctx, user)
            await cache.set(ck, context_text, expire=CONTEXT_CACHE_TTL)

    system_prompt = build_system_prompt(context_text)
    reply = await get_ai_response(
        message=message,
        history=history,
        system_prompt=system_prompt,
    )
    return {"reply": reply, "state": None, "prediction": None}


async def get_suggested_qs(
    db: AsyncSession,
    user: User,
) -> dict:
    """Get personalized suggested questions."""
    ck = cache_key("chat_context", user.id)
    context_text = await cache.get(ck) or ""

    if not context_text:
        ctx = await build_health_context(db, user)
        context_text = format_context_for_prompt(ctx, user)

    last_pred = None
    try:
        result = await db.execute(
            select(DiseasePrediction.predicted_disease)
            .where(DiseasePrediction.user_id == user.id)
            .order_by(desc(DiseasePrediction.created_at))
            .limit(1)
        )
        row = result.scalar_one_or_none()
        if row:
            last_pred = row
    except Exception:
        pass

    questions = get_suggested_questions(context_text, last_pred)

    return {
        "questions": questions,
        "category": "personalized",
    }
