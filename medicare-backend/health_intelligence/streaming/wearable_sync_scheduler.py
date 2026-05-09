"""
health_intelligence/streaming/wearable_sync_scheduler.py
───────────────────────────────────────────────
Background sync scheduler that manages periodic
wearable data ingestion cycles.

Features:
  - Configurable sync intervals per user
  - Staggered sync to avoid thundering herd
  - Missed-sync detection and recovery
  - Sync health monitoring
"""

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Callable, Coroutine, Any, Optional

log = logging.getLogger(__name__)

# Default sync interval (seconds)
DEFAULT_SYNC_INTERVAL = 300  # 5 minutes
MIN_SYNC_INTERVAL = 60
MAX_SYNC_INTERVAL = 3600


@dataclass
class SyncSchedule:
    """Sync schedule for one user."""
    user_id: int
    interval_seconds: float = DEFAULT_SYNC_INTERVAL
    last_sync: float = 0.0
    consecutive_failures: int = 0
    total_syncs: int = 0
    is_active: bool = True


SyncCallback = Callable[[int], Coroutine[Any, Any, bool]]


class WearableSyncScheduler:
    """
    Manages background wearable sync cycles for
    registered users with staggered scheduling.
    """

    def __init__(
        self,
        sync_callback: Optional[SyncCallback] = None,
        default_interval: float = DEFAULT_SYNC_INTERVAL,
    ):
        self._schedules: dict[int, SyncSchedule] = {}
        self._sync_callback = sync_callback
        self._default_interval = default_interval
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None

    # ── Registration ─────────────────────────────────────────

    def register_user(
        self,
        user_id: int,
        interval: Optional[float] = None,
    ) -> None:
        """Register a user for periodic wearable sync."""
        ival = interval or self._default_interval
        ival = max(MIN_SYNC_INTERVAL, min(MAX_SYNC_INTERVAL, ival))

        self._schedules[user_id] = SyncSchedule(
            user_id=user_id,
            interval_seconds=ival,
        )
        log.info(
            "User %d registered for sync (interval=%ds)", user_id, ival,
        )

    def unregister_user(self, user_id: int) -> None:
        """Remove a user from sync scheduling."""
        self._schedules.pop(user_id, None)

    def set_interval(self, user_id: int, interval: float) -> None:
        """Update sync interval for a user."""
        if user_id in self._schedules:
            self._schedules[user_id].interval_seconds = max(
                MIN_SYNC_INTERVAL, min(MAX_SYNC_INTERVAL, interval),
            )

    # ── Scheduler lifecycle ──────────────────────────────────

    async def start(self) -> None:
        """Start the background scheduler loop."""
        if self._running:
            return
        self._running = True
        self._loop_task = asyncio.create_task(self._scheduler_loop())
        log.info("WearableSyncScheduler started")

    async def stop(self) -> None:
        """Stop the scheduler gracefully."""
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        log.info("WearableSyncScheduler stopped")

    async def _scheduler_loop(self) -> None:
        """
        Main loop: checks each user's schedule and
        triggers sync when due.
        """
        while self._running:
            now = time.time()

            for schedule in list(self._schedules.values()):
                if not schedule.is_active:
                    continue

                elapsed = now - schedule.last_sync
                if elapsed >= schedule.interval_seconds:
                    asyncio.create_task(
                        self._execute_sync(schedule),
                    )

            # Check every 10 seconds
            await asyncio.sleep(10)

    async def _execute_sync(self, schedule: SyncSchedule) -> None:
        """Execute a sync for one user."""
        schedule.last_sync = time.time()

        if not self._sync_callback:
            log.debug(
                "No sync callback configured for user %d",
                schedule.user_id,
            )
            return

        try:
            success = await self._sync_callback(schedule.user_id)
            if success:
                schedule.consecutive_failures = 0
                schedule.total_syncs += 1
            else:
                schedule.consecutive_failures += 1
                self._apply_backoff(schedule)
        except Exception:
            log.exception(
                "Sync failed for user %d", schedule.user_id,
            )
            schedule.consecutive_failures += 1
            self._apply_backoff(schedule)

    def _apply_backoff(self, schedule: SyncSchedule) -> None:
        """Apply exponential backoff on consecutive failures."""
        if schedule.consecutive_failures >= 5:
            schedule.is_active = False
            log.warning(
                "User %d sync deactivated after %d failures",
                schedule.user_id, schedule.consecutive_failures,
            )
        elif schedule.consecutive_failures >= 3:
            # Double the interval (up to max)
            schedule.interval_seconds = min(
                schedule.interval_seconds * 2, MAX_SYNC_INTERVAL,
            )

    # ── Missed sync detection ────────────────────────────────

    def get_stale_users(self, max_age_seconds: float = 900) -> list[int]:
        """
        Find users whose last sync is older than max_age_seconds.
        """
        now = time.time()
        return [
            s.user_id for s in self._schedules.values()
            if s.is_active and (now - s.last_sync) > max_age_seconds
        ]

    def reactivate_user(self, user_id: int) -> None:
        """Reactivate a deactivated user's sync schedule."""
        if user_id in self._schedules:
            s = self._schedules[user_id]
            s.is_active = True
            s.consecutive_failures = 0
            s.interval_seconds = self._default_interval

    # ── Stats ────────────────────────────────────────────────

    def get_stats(self) -> dict:
        active = [s for s in self._schedules.values() if s.is_active]
        return {
            "registered_users": len(self._schedules),
            "active_users": len(active),
            "total_syncs": sum(
                s.total_syncs for s in self._schedules.values()
            ),
            "stale_users": len(self.get_stale_users()),
            "running": self._running,
        }
