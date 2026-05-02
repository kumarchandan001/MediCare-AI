"""
tasks/google_fit_sync.py
──────────────────────────────────────────
Celery background task for automatic Google Fit sync every 6 hours.

Only runs for users with:
  google_fit_connected = True
  google_fit_auto_sync = True

Add to Celery Beat schedule in celery_config.py:
  from celery.schedules import crontab
  app.conf.beat_schedule = {
      "google-fit-auto-sync": {
          "task": "tasks.google_fit_auto_sync",
          "schedule": crontab(minute=0, hour="*/6"),
      },
  }
"""

import logging
import asyncio
from celery import shared_task
from sqlalchemy import select

log = logging.getLogger(__name__)


@shared_task(
    name="tasks.google_fit_auto_sync",
    bind=True,
    max_retries=2,
    default_retry_delay=300,
)
def google_fit_auto_sync_task(self):
    """Auto-sync Google Fit for all eligible users. Run every 6 hours via Celery Beat."""

    async def run():
        from core.database import AsyncSessionLocal
        from features.auth.models import User
        from features.google_fit.sync_engine import run_sync

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(
                    User.google_fit_connected == True,
                    User.google_fit_auto_sync == True,
                    User.is_active == True,
                )
            )
            users = result.scalars().all()
            log.info(f"Auto-sync: found {len(users)} eligible users")

            for user in users:
                try:
                    await run_sync(db=db, user_id=user.id, days_back=1, sync_type="auto")
                    log.info(f"Auto-sync complete: user {user.id}")
                except Exception as e:
                    log.warning(f"Auto-sync failed for user {user.id}: {e}")
                    continue

    try:
        asyncio.run(run())
    except Exception as exc:
        log.error(f"Auto-sync task error: {exc}")
        raise self.retry(exc=exc)
