"""
health_intelligence/realtime/session_manager.py
───────────────────────────────────────────────
Live session lifecycle manager — tracks continuous
workout, sleep, recovery, and stress sessions.

Features:
  - Session creation and state transitions
  - Session quality scoring at completion
  - Session summary generation
  - Concurrent session prevention
  - Database persistence
"""

import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from health_intelligence.models import LiveSessionLog

log = logging.getLogger(__name__)

VALID_TYPES = {"workout", "sleep", "recovery", "stress", "unknown"}
VALID_STATUSES = {"active", "paused", "completed", "abandoned"}


class SessionManager:
    """
    Manages continuous live session lifecycles with
    state transitions and quality scoring.
    """

    def __init__(self):
        # In-memory cache: user_id → active session id
        self._active_sessions: dict[int, int] = {}

    async def start_session(
        self,
        db: AsyncSession,
        user_id: int,
        session_type: str,
        metadata: Optional[dict] = None,
    ) -> dict:
        """Start a new live session."""
        if session_type not in VALID_TYPES:
            return {"error": f"Invalid session type: {session_type}"}

        # Check for existing active session
        existing = await self._get_active_session(db, user_id)
        if existing:
            return {
                "error": "Active session already exists",
                "active_session_id": existing.id,
                "active_session_type": existing.session_type,
            }

        session = LiveSessionLog(
            user_id=user_id,
            session_type=session_type,
            status="active",
            state_transitions=[{
                "from": None,
                "to": "active",
                "at": datetime.utcnow().isoformat(),
            }],
            metadata_json=metadata,
        )
        db.add(session)
        await db.flush()

        self._active_sessions[user_id] = session.id

        return {
            "session_id": session.id,
            "session_type": session_type,
            "status": "active",
            "started_at": session.started_at.isoformat() if session.started_at else None,
        }

    async def end_session(
        self,
        db: AsyncSession,
        user_id: int,
        session_metrics: Optional[dict] = None,
    ) -> dict:
        """End the active session with a summary."""
        session = await self._get_active_session(db, user_id)
        if not session:
            return {"error": "No active session found"}

        now = datetime.utcnow()
        session.status = "completed"
        session.ended_at = now

        # Compute duration
        started = session.started_at or now
        duration_minutes = (now - started).total_seconds() / 60

        # Quality scoring
        quality = self._compute_quality(
            session.session_type, duration_minutes, session_metrics,
        )
        session.quality_score = quality

        # Build summary
        summary = {
            "session_type": session.session_type,
            "duration_minutes": round(duration_minutes, 1),
            "quality_score": round(quality, 1),
            "metrics": session_metrics or {},
            "completed_at": now.isoformat(),
        }
        session.summary = summary

        # Add transition
        transitions = session.state_transitions or []
        transitions.append({
            "from": "active",
            "to": "completed",
            "at": now.isoformat(),
        })
        session.state_transitions = transitions

        self._active_sessions.pop(user_id, None)

        return {
            "session_id": session.id,
            "status": "completed",
            "summary": summary,
        }

    async def transition_state(
        self,
        db: AsyncSession,
        user_id: int,
        new_status: str,
    ) -> dict:
        """Transition the active session to a new state."""
        if new_status not in VALID_STATUSES:
            return {"error": f"Invalid status: {new_status}"}

        session = await self._get_active_session(db, user_id)
        if not session:
            return {"error": "No active session found"}

        old_status = session.status
        session.status = new_status

        transitions = session.state_transitions or []
        transitions.append({
            "from": old_status,
            "to": new_status,
            "at": datetime.utcnow().isoformat(),
        })
        session.state_transitions = transitions

        if new_status in ("completed", "abandoned"):
            session.ended_at = datetime.utcnow()
            self._active_sessions.pop(user_id, None)

        return {
            "session_id": session.id,
            "previous_status": old_status,
            "new_status": new_status,
        }

    async def get_active_session(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[dict]:
        """Get the current active session info."""
        session = await self._get_active_session(db, user_id)
        if not session:
            return None

        started = session.started_at or datetime.utcnow()
        duration = (datetime.utcnow() - started).total_seconds() / 60

        return {
            "session_id": session.id,
            "session_type": session.session_type,
            "status": session.status,
            "duration_minutes": round(duration, 1),
            "state_transitions": session.state_transitions,
            "started_at": started.isoformat(),
        }

    async def get_session_history(
        self,
        db: AsyncSession,
        user_id: int,
        session_type: Optional[str] = None,
        limit: int = 20,
    ) -> list[dict]:
        """Get recent completed sessions."""
        query = (
            select(LiveSessionLog)
            .where(
                and_(
                    LiveSessionLog.user_id == user_id,
                    LiveSessionLog.status == "completed",
                )
            )
            .order_by(LiveSessionLog.ended_at.desc())
            .limit(limit)
        )
        if session_type:
            query = query.where(LiveSessionLog.session_type == session_type)

        result = await db.execute(query)
        sessions = result.scalars().all()

        return [
            {
                "session_id": s.id,
                "session_type": s.session_type,
                "quality_score": s.quality_score,
                "summary": s.summary,
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            }
            for s in sessions
        ]

    # ── Internal ─────────────────────────────────────────────

    async def _get_active_session(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> Optional[LiveSessionLog]:
        """Find the active session for a user."""
        result = await db.execute(
            select(LiveSessionLog).where(
                and_(
                    LiveSessionLog.user_id == user_id,
                    LiveSessionLog.status.in_(["active", "paused"]),
                )
            ).order_by(LiveSessionLog.started_at.desc()).limit(1)
        )
        return result.scalars().first()

    @staticmethod
    def _compute_quality(
        session_type: str,
        duration_minutes: float,
        metrics: Optional[dict],
    ) -> float:
        """
        Compute a 0–100 session quality score based on
        type, duration, and metrics.
        """
        metrics = metrics or {}

        if session_type == "workout":
            # Good workout: 20–90 min, moderate+ HR
            duration_score = min(duration_minutes / 45, 1.0) * 50
            hr = metrics.get("avg_heart_rate", 100)
            intensity = min((hr - 70) / 60, 1.0) * 30
            return min(duration_score + intensity + 20, 100)

        elif session_type == "sleep":
            # Good sleep: 7–9 hours
            hours = duration_minutes / 60
            if 7 <= hours <= 9:
                return 85 + min((hours - 7) / 2 * 10, 10)
            elif hours >= 6:
                return 60 + (hours - 6) * 25
            else:
                return max(20, hours / 6 * 60)

        elif session_type == "recovery":
            # Good recovery: low stress, normal HR
            stress = metrics.get("avg_stress", 30)
            score = max(30, 100 - stress)
            return min(score, 95)

        elif session_type == "stress":
            # Stress session: shorter is better
            if duration_minutes < 30:
                return 70
            elif duration_minutes < 60:
                return 50
            else:
                return max(20, 70 - duration_minutes * 0.5)

        return 50  # default
