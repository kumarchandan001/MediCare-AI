"""
health_intelligence/streaming/realtime_event_dispatcher.py
───────────────────────────────────────────────
Async pub/sub event dispatcher for internal real-time
health intelligence routing.

Features:
  - Topic-based subscription
  - Async event queues with backpressure
  - Batched event delivery
  - Throttled dispatch to prevent overload
  - Event priority ordering
"""

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum
from typing import Any, Callable, Coroutine, Optional

log = logging.getLogger(__name__)


class EventPriority(IntEnum):
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3


@dataclass
class HealthEvent:
    """A single dispatchable health intelligence event."""
    topic: str
    payload: dict[str, Any]
    user_id: int
    priority: EventPriority = EventPriority.NORMAL
    timestamp: float = field(default_factory=time.time)
    event_id: str = ""

    def __post_init__(self):
        if not self.event_id:
            self.event_id = f"{self.topic}:{self.user_id}:{self.timestamp}"


# Type alias for async subscriber callbacks
Subscriber = Callable[[HealthEvent], Coroutine[Any, Any, None]]


class RealtimeEventDispatcher:
    """
    Central async pub/sub dispatcher for the real-time
    health intelligence pipeline.

    Supports:
      - topic-based subscriptions
      - async event queues with max-size backpressure
      - batched delivery (configurable batch window)
      - throttled dispatch per topic
      - priority ordering within batches
    """

    def __init__(
        self,
        max_queue_size: int = 1000,
        batch_window_ms: int = 200,
        throttle_per_topic_ms: int = 100,
    ):
        self._subscribers: dict[str, list[Subscriber]] = defaultdict(list)
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue(
            maxsize=max_queue_size,
        )
        self._batch_window = batch_window_ms / 1000.0
        self._throttle_interval = throttle_per_topic_ms / 1000.0
        self._last_dispatch: dict[str, float] = {}
        self._running = False
        self._dispatch_task: Optional[asyncio.Task] = None

    # ── Subscription ─────────────────────────────────────────

    def subscribe(self, topic: str, callback: Subscriber) -> None:
        """Register a subscriber for a topic."""
        self._subscribers[topic].append(callback)
        log.debug("Subscriber registered for topic: %s", topic)

    def unsubscribe(self, topic: str, callback: Subscriber) -> None:
        """Remove a subscriber from a topic."""
        if topic in self._subscribers:
            self._subscribers[topic] = [
                s for s in self._subscribers[topic] if s is not callback
            ]

    # ── Publishing ───────────────────────────────────────────

    async def publish(self, event: HealthEvent) -> bool:
        """
        Publish an event to the dispatch queue.
        Returns False if the queue is full (backpressure).
        """
        try:
            self._queue.put_nowait(
                (event.priority, event.timestamp, event)
            )
            return True
        except asyncio.QueueFull:
            log.warning(
                "Event queue full — dropping event %s for user %d",
                event.topic, event.user_id,
            )
            return False

    async def publish_immediate(self, event: HealthEvent) -> None:
        """Dispatch an event immediately, bypassing the queue."""
        await self._dispatch_event(event)

    # ── Dispatch loop ────────────────────────────────────────

    async def start(self) -> None:
        """Start the background dispatch loop."""
        if self._running:
            return
        self._running = True
        self._dispatch_task = asyncio.create_task(self._dispatch_loop())
        log.info("RealtimeEventDispatcher started")

    async def stop(self) -> None:
        """Stop the dispatch loop gracefully."""
        self._running = False
        if self._dispatch_task:
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass
        log.info("RealtimeEventDispatcher stopped")

    async def _dispatch_loop(self) -> None:
        """
        Main dispatch loop: drains the queue in batches,
        respecting throttle and priority.
        """
        while self._running:
            batch: list[HealthEvent] = []

            # Collect events for one batch window
            try:
                _, _, event = await asyncio.wait_for(
                    self._queue.get(), timeout=self._batch_window,
                )
                batch.append(event)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                if not self._running:
                    break
                continue

            # Drain remaining available events
            while not self._queue.empty() and len(batch) < 50:
                try:
                    _, _, event = self._queue.get_nowait()
                    batch.append(event)
                except asyncio.QueueEmpty:
                    break

            # Dispatch batch
            for event in batch:
                if self._should_throttle(event.topic):
                    continue
                await self._dispatch_event(event)
                self._last_dispatch[event.topic] = time.time()

    def _should_throttle(self, topic: str) -> bool:
        """Check if a topic should be throttled."""
        last = self._last_dispatch.get(topic, 0)
        return (time.time() - last) < self._throttle_interval

    async def _dispatch_event(self, event: HealthEvent) -> None:
        """Fan out event to all subscribers for its topic."""
        subscribers = self._subscribers.get(event.topic, [])
        wildcard_subs = self._subscribers.get("*", [])
        all_subs = subscribers + wildcard_subs

        for callback in all_subs:
            try:
                await callback(event)
            except Exception:
                log.exception(
                    "Subscriber error for topic %s", event.topic,
                )

    # ── Utilities ────────────────────────────────────────────

    @property
    def pending_count(self) -> int:
        return self._queue.qsize()

    @property
    def topic_count(self) -> int:
        return len(self._subscribers)

    def get_stats(self) -> dict:
        return {
            "running": self._running,
            "pending_events": self.pending_count,
            "registered_topics": self.topic_count,
            "subscriber_counts": {
                topic: len(subs)
                for topic, subs in self._subscribers.items()
            },
        }
