"""
MediCare AI — Production-grade caching layer.

Strategy:
  1. Try Redis first (fast, shared across workers).
  2. If Redis is unavailable, fall back to a local in-memory LRU cache
     so the app never runs entirely uncached.
  3. After a Redis failure, back off for N seconds before retrying
     to avoid connection-storm latency on every request.
  4. All public methods are safe to call even if both layers fail —
     they silently return None / False / 0.
"""

import json
import time
import logging
import asyncio
from collections import OrderedDict
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════
#  IN-MEMORY LRU CACHE  (fallback when Redis is down)
# ═══════════════════════════════════════════════════════

class MemoryCache:
    """Thread-safe (asyncio-safe) in-memory LRU cache with TTL."""

    def __init__(self, max_size: int = 512):
        self._store: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max = max_size
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            if key not in self._store:
                return None
            value, expires = self._store[key]
            if time.time() > expires:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    async def set(self, key: str, value: Any, expire: int = 300) -> None:
        async with self._lock:
            self._store[key] = (value, time.time() + expire)
            self._store.move_to_end(key)
            while len(self._store) > self._max:
                self._store.popitem(last=False)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self) -> int:
        async with self._lock:
            count = len(self._store)
            self._store.clear()
            return count

    async def keys_matching(self, pattern: str) -> list[str]:
        """Simple glob-style matching (supports trailing *)."""
        import fnmatch
        async with self._lock:
            now = time.time()
            return [
                k for k, (_, exp) in self._store.items()
                if now <= exp and fnmatch.fnmatch(k, pattern)
            ]


# ═══════════════════════════════════════════════════════
#  REDIS CLIENT  (lazy-init, never crashes on import)
# ═══════════════════════════════════════════════════════

_redis_client = None
_redis_init_attempted = False


def _get_redis():
    """Lazy-create the Redis client so import never fails."""
    global _redis_client, _redis_init_attempted
    if _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True
    try:
        import redis.asyncio as aioredis
        from core.config import settings

        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=False,
        )
        logger.info("Redis client created for %s", settings.REDIS_URL)
    except Exception as e:
        logger.warning("Redis client init failed: %s — running memory-only", e)
        _redis_client = None
    return _redis_client


# ═══════════════════════════════════════════════════════
#  CACHE SERVICE  (Redis + Memory hybrid)
# ═══════════════════════════════════════════════════════

class CacheService:
    """
    Production cache with automatic fallback.

    • get/set/delete always try Redis first.
    • On Redis failure, the value is served from / written to in-memory.
    • Redis is retried after `_backoff_seconds` to self-heal.
    """

    def __init__(self, backoff_seconds: int = 30, memory_max: int = 512):
        self._memory = MemoryCache(max_size=memory_max)
        self._redis_ok = True
        self._last_fail: float = 0
        self._backoff = backoff_seconds
        self._logged_fallback = False

    # ── internal helpers ──────────────────────

    def _redis(self):
        """Get Redis client (lazy)."""
        return _get_redis()

    def _is_redis_ready(self) -> bool:
        if self._redis() is None:
            return False
        if not self._redis_ok:
            if time.time() - self._last_fail > self._backoff:
                self._redis_ok = True
                self._logged_fallback = False
                logger.info("Redis backoff expired — retrying connection")
            else:
                return False
        return True

    def _mark_redis_down(self, err: Exception):
        self._redis_ok = False
        self._last_fail = time.time()
        if not self._logged_fallback:
            logger.warning(
                "Redis unavailable (%s) — using in-memory cache for %ds",
                str(err)[:80], self._backoff,
            )
            self._logged_fallback = True

    # ── public API ────────────────────────────

    async def get(self, key: str) -> Optional[Any]:
        """Get a cached value. Tries Redis, falls back to memory."""
        if self._is_redis_ready():
            try:
                raw = await self._redis().get(key)
                if raw is not None:
                    return json.loads(raw)
                return None
            except Exception as e:
                self._mark_redis_down(e)

        # Fallback to memory
        return await self._memory.get(key)

    async def set(self, key: str, value: Any, expire: int = 300) -> bool:
        """Cache a value. Writes to Redis AND memory for resilience."""
        serialized = json.dumps(value, default=str)
        parsed = json.loads(serialized)  # normalize for memory store

        # Always write to memory as backup
        await self._memory.set(key, parsed, expire)

        if self._is_redis_ready():
            try:
                await self._redis().setex(key, expire, serialized)
                return True
            except Exception as e:
                self._mark_redis_down(e)

        return False

    async def delete(self, key: str) -> bool:
        """Delete from both Redis and memory."""
        await self._memory.delete(key)

        if self._is_redis_ready():
            try:
                await self._redis().delete(key)
                return True
            except Exception as e:
                self._mark_redis_down(e)

        return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern."""
        count = 0

        # Memory cleanup
        mem_keys = await self._memory.keys_matching(pattern)
        for k in mem_keys:
            await self._memory.delete(k)
            count += len(mem_keys)

        if self._is_redis_ready():
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis().scan(
                        cursor=cursor, match=pattern, count=100,
                    )
                    if keys:
                        await self._redis().delete(*keys)
                        count += len(keys)
                    if cursor == 0:
                        break
            except Exception as e:
                self._mark_redis_down(e)

        return count

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        if self._is_redis_ready():
            try:
                return bool(await self._redis().exists(key))
            except Exception as e:
                self._mark_redis_down(e)

        return (await self._memory.get(key)) is not None

    async def flush_all(self) -> int:
        """Flush ALL cache data (Redis + memory). For admin use only."""
        count = 0

        mem_count = await self._memory.clear()
        count += mem_count

        if self._is_redis_ready():
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis().scan(
                        cursor=cursor, match="*", count=200,
                    )
                    if keys:
                        await self._redis().delete(*keys)
                        count += len(keys)
                    if cursor == 0:
                        break
            except Exception as e:
                self._mark_redis_down(e)

        logger.info("Cache flushed: %d keys cleared", count)
        return count

    async def health_check(self) -> dict:
        """Return cache health status for admin dashboard."""
        result = {
            "memory_cache": "ok",
            "memory_entries": len(self._memory._store),
            "memory_max": self._memory._max,
        }

        if self._redis() is None:
            result["redis"] = "not_configured"
            result["redis_latency_ms"] = 0
            result["backend"] = "memory_only"
            return result

        if not self._redis_ok:
            result["redis"] = "unavailable"
            result["redis_latency_ms"] = 0
            result["redis_backoff_remaining"] = max(
                0, round(self._backoff - (time.time() - self._last_fail), 1)
            )
            result["backend"] = "memory_fallback"
            return result

        try:
            t0 = time.time()
            await self._redis().ping()
            latency = round((time.time() - t0) * 1000, 2)
            result["redis"] = "ok"
            result["redis_latency_ms"] = latency
            result["backend"] = "redis"
        except Exception as e:
            self._mark_redis_down(e)
            result["redis"] = "unavailable"
            result["redis_latency_ms"] = 0
            result["backend"] = "memory_fallback"

        return result


# ═══════════════════════════════════════════════════════
#  KEY BUILDERS
# ═══════════════════════════════════════════════════════

def cache_key(namespace: str, user_id: int, *args: str) -> str:
    """Build a namespaced cache key.  e.g. cache_key('health', 42, 'summary')"""
    parts = [namespace, str(user_id)]
    parts.extend(args)
    return ":".join(parts)


# ═══════════════════════════════════════════════════════
#  SINGLETON
# ═══════════════════════════════════════════════════════

cache = CacheService(backoff_seconds=30, memory_max=512)
