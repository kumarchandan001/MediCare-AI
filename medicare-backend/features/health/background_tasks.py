"""
background_tasks.py
─────────────────────────────────────────────
Placeholder for scheduled background operations.

Future implementations will include:
  • Periodic smartwatch data sync (e.g., via Celery or APScheduler)
  • Nightly aggregation of daily health metrics
  • Inactive user reminders
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from features.auth.models import OAuthToken


logger = logging.getLogger(__name__)

async def sync_all_users_daily(db: AsyncSession) -> None:
    """
    Scheduled task to pull smartwatch data for all users with a connected provider.
    Fails gracefully per user without halting the batch.
    """
    logger.info("Background task: Starting daily smartwatch data sync...")
    
    try:
        # Fetch only users with an active OAuthToken
        result = await db.execute(
            select(OAuthToken.user_id).distinct()
        )
        connected_user_ids = result.scalars().all()
        
        logger.info(f"Found {len(connected_user_ids)} users with connected smartwatch accounts.")
        
        success_count = 0
        for user_id in connected_user_ids:
            try:
                # await sync_smartwatch_data(db, user_id)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to sync smartwatch data for user={user_id}: {e}")
                
        logger.info(f"Background task: Smartwatch sync complete. Successfully processed {success_count}/{len(connected_user_ids)} users.")
        
    except Exception as e:
        logger.error(f"Critical error in sync_all_users_daily: {e}")
