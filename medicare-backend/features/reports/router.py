import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.deps import get_current_user
from core.cache import cache, cache_key
from shared.response import success_response
from features.auth.models import User
from features.reports import service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])

CACHE_OVERVIEW = 10 * 60   # 10 min
CACHE_TRENDS   = 15 * 60   # 15 min
CACHE_SUMMARY  = 30 * 60   # 30 min
CACHE_STATS    = 15 * 60   # 15 min


@router.get("/overview")
async def get_overview(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated metric overview with comparisons."""
    ck = cache_key("report_overview", current_user.id, str(days))
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_overview(db, current_user.id, days)
    d = data.model_dump()
    await cache.set(ck, d, expire=CACHE_OVERVIEW)
    return success_response(data=d)


@router.get("/trends")
async def get_trends(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Daily trend data for all metrics."""
    ck = cache_key("report_trends", current_user.id, str(days))
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_trends(db, current_user.id, days)
    d = data.model_dump()
    await cache.set(ck, d, expire=CACHE_TRENDS)
    return success_response(data=d)


@router.get("/ai-summary")
async def get_ai_summary(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI-generated health summary report."""
    ck = cache_key("report_ai_summary", current_user.id, str(days))
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_ai_summary(db, current_user.id, days)
    d = data.model_dump()
    await cache.set(ck, d, expire=CACHE_SUMMARY)
    return success_response(data=d)


@router.get("/stats")
async def get_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Streak and cumulative stats."""
    ck = cache_key("report_stats", current_user.id, str(days))
    cached = await cache.get(ck)
    if cached:
        return success_response(data=cached)

    data = await service.get_stats(db, current_user.id, days)
    d = data.model_dump()
    await cache.set(ck, d, expire=CACHE_STATS)
    return success_response(data=d)
