"""
router.py
─────────────────────────────────────────────
AI Assistant API routes (v2 — intelligent chatbot).

Endpoints:
  POST   /chat                  — Send message (intelligent controller)
  GET    /chat/history          — Get conversation history
  DELETE /chat/history          — Clear history + reset state
  GET    /chat/suggested-questions — Personalized prompts
  GET    /chat/health-context   — User's health context summary
  GET    /chat/state            — Current conversation state
  DELETE /chat/state            — Reset conversation state
  GET    /chat/llm-status       — LLM provider availability
"""

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from shared.response import success_response, error_response
from features.auth.models import User
from features.ai_assistant import service
from features.ai_assistant.schemas import ChatMessageRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["AI Assistant"])


# ── POST /chat ────────────────────────────────
@router.post("")
async def send_message(
    body: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send message to the intelligent AI assistant."""
    if not body.message.strip():
        return error_response(
            "Message cannot be empty.",
            status_code=422,
        )

    result = await service.send_message(
        db=db,
        user=current_user,
        message=body.message.strip(),
        include_health_context=body.include_health_context,
    )

    return success_response(data=result)


# ── GET /chat/history ─────────────────────────
@router.get("/history")
async def get_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get conversation history."""
    msgs = await service.get_chat_history(db, current_user.id, limit=limit)

    return success_response(
        data={
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": str(m.created_at),
                }
                for m in msgs
            ],
            "count": len(msgs),
            "has_more": len(msgs) >= limit,
        }
    )


# ── DELETE /chat/history ──────────────────────
@router.delete("/history")
async def clear_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear conversation history and reset chat state."""
    count = await service.clear_history(db, current_user.id)
    return success_response(
        data={"deleted": count},
        message=f"Cleared {count} messages and reset conversation state.",
    )


# ── GET /chat/suggested-questions ─────────────
@router.get("/suggested-questions")
async def suggested_questions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get personalized suggested questions."""
    result = await service.get_suggested_qs(db, current_user)
    return success_response(data=result)


# ── GET /chat/health-context ──────────────────
@router.get("/health-context")
async def get_health_context(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the user's health context summary."""
    from features.ai_assistant.health_context import build_health_context

    ctx = await build_health_context(db, current_user)
    return success_response(data=ctx.model_dump())


# ── GET /chat/state ───────────────────────────
@router.get("/state")
async def get_chat_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current conversation state (symptoms, country, etc.)."""
    from features.ai_assistant.chat_state import load_state

    state = await load_state(db, current_user.id)
    # Expose only safe fields
    safe = {
        "symptoms":    state.get("symptoms", []),
        "country":     state.get("country"),
        "profile":     state.get("profile", {}),
        "health_data": state.get("health_data", {}),
        "turn_count":  state.get("turn_count", 0),
    }
    return success_response(data=safe)


# ── DELETE /chat/state ────────────────────────
@router.delete("/state")
async def reset_chat_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset conversation state (start over)."""
    from features.ai_assistant.chat_state import reset_state

    state = await reset_state(db, current_user.id)
    return success_response(
        data={"reset": True},
        message="Conversation state has been reset.",
    )


# ── GET /chat/llm-status ─────────────────────
@router.get("/llm-status")
async def llm_status(
    current_user: User = Depends(get_current_user),
):
    """Check which LLM providers are currently available."""
    from features.ai_assistant.multi_llm_service import check_providers_status

    status = await check_providers_status()
    return success_response(data=status)
