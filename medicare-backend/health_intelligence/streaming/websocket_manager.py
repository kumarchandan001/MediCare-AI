"""
health_intelligence/streaming/websocket_manager.py
───────────────────────────────────────────────
Production-grade WebSocket connection manager for live
health intelligence streaming to frontends.

Features:
  - Connection pool per user
  - Low-latency batched updates
  - Throttled metric pushes
  - Scalable concurrent streams
  - Graceful connection lifecycle
  - Connection throttling & abuse prevention
  - Stale connection pruning (ping/pong)
  - Metrics tracking for observability
"""

import asyncio
import json
import logging
import time
from collections import defaultdict
from typing import Any, Optional

from fastapi import WebSocket, WebSocketDisconnect

log = logging.getLogger(__name__)

# Config
MAX_CONNECTIONS_PER_USER = 3
MAX_CONNECTIONS_PER_IP = 10
BATCH_INTERVAL_MS = 500
THROTTLE_MS = 200
PING_INTERVAL_S = 25
STALE_TIMEOUT_S = 60
RECONNECT_WINDOW_S = 10
MAX_RECONNECTS_PER_WINDOW = 5


class WebSocketConnectionManager:
    """
    Production-grade WebSocket connection manager for real-time
    health intelligence streaming.

    Features:
      - Per-user connection tracking
      - Batched message delivery
      - Throttled updates to prevent flooding
      - Connection health monitoring (ping/pong)
      - Connection throttling per IP
      - Reconnect abuse prevention
      - Observability metrics
    """

    def __init__(self):
        # user_id → list of active websocket connections
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)
        self._message_buffers: dict[int, list[dict]] = defaultdict(list)
        self._last_send: dict[int, float] = {}
        self._flush_task: Optional[asyncio.Task] = None
        self._ping_task: Optional[asyncio.Task] = None
        self._running = False

        # Production hardening state
        self._last_pong: dict[int, float] = {}  # ws_id → timestamp
        self._ip_connections: dict[str, int] = defaultdict(int)
        self._reconnect_tracker: dict[str, list[float]] = defaultdict(list)

        # Metrics counters
        self._metrics = {
            "total_connections": 0,
            "total_disconnections": 0,
            "total_messages_sent": 0,
            "total_messages_dropped": 0,
            "total_throttled": 0,
            "total_abuse_blocked": 0,
            "total_stale_pruned": 0,
        }

    # ── Connection lifecycle ─────────────────────────────────

    async def connect(
        self, websocket: WebSocket, user_id: int,
        client_ip: str = "unknown",
    ) -> bool:
        """
        Accept and register a WebSocket connection.
        Returns False if the user has too many connections
        or the IP is throttled.
        """
        # IP-level throttling
        if self._ip_connections[client_ip] >= MAX_CONNECTIONS_PER_IP:
            log.warning(
                "IP connection limit reached: ip=%s", client_ip,
            )
            await websocket.close(code=4003, reason="Too many connections from IP")
            self._metrics["total_abuse_blocked"] += 1
            return False

        # Reconnect abuse prevention
        now = time.time()
        key = f"{client_ip}:{user_id}"
        self._reconnect_tracker[key] = [
            ts for ts in self._reconnect_tracker[key]
            if ts > now - RECONNECT_WINDOW_S
        ]
        if len(self._reconnect_tracker[key]) >= MAX_RECONNECTS_PER_WINDOW:
            log.warning(
                "Reconnect abuse detected: user=%d ip=%s", user_id, client_ip,
            )
            await websocket.close(code=4008, reason="Too many reconnects")
            self._metrics["total_abuse_blocked"] += 1
            return False
        self._reconnect_tracker[key].append(now)

        # Per-user limit
        if len(self._connections[user_id]) >= MAX_CONNECTIONS_PER_USER:
            log.warning(
                "Max connections reached for user %d", user_id,
            )
            await websocket.close(code=4003, reason="Too many connections")
            return False

        await websocket.accept()
        self._connections[user_id].append(websocket)
        self._ip_connections[client_ip] += 1
        self._last_pong[id(websocket)] = now
        self._metrics["total_connections"] += 1

        log.info(
            "WebSocket connected: user=%d, total=%d, ip=%s",
            user_id, len(self._connections[user_id]), client_ip,
        )
        return True

    def disconnect(
        self, websocket: WebSocket, user_id: int,
        client_ip: str = "unknown",
    ) -> None:
        """Remove a disconnected WebSocket."""
        if user_id in self._connections:
            self._connections[user_id] = [
                ws for ws in self._connections[user_id]
                if ws is not websocket
            ]
            if not self._connections[user_id]:
                del self._connections[user_id]
                self._message_buffers.pop(user_id, None)
                self._last_send.pop(user_id, None)

        self._last_pong.pop(id(websocket), None)
        if self._ip_connections.get(client_ip, 0) > 0:
            self._ip_connections[client_ip] -= 1
        self._metrics["total_disconnections"] += 1

        log.info("WebSocket disconnected: user=%d", user_id)

    # ── Sending ──────────────────────────────────────────────

    async def send_to_user(
        self,
        user_id: int,
        message: dict[str, Any],
        immediate: bool = False,
    ) -> None:
        """
        Send a message to all of a user's WebSocket connections.

        If immediate=False, messages are buffered and flushed
        in batches for efficiency.
        """
        if user_id not in self._connections:
            return

        if immediate:
            await self._deliver(user_id, message)
        else:
            self._message_buffers[user_id].append(message)

    async def broadcast(
        self,
        message: dict[str, Any],
        user_ids: Optional[list[int]] = None,
    ) -> None:
        """Broadcast a message to multiple (or all) users."""
        targets = user_ids or list(self._connections.keys())
        for uid in targets:
            await self.send_to_user(uid, message, immediate=True)

    async def _deliver(self, user_id: int, message: dict) -> None:
        """Send to all connections for a user, removing dead ones."""
        dead: list[WebSocket] = []
        payload = json.dumps(message, default=str)

        for ws in self._connections.get(user_id, []):
            try:
                await ws.send_text(payload)
                self._metrics["total_messages_sent"] += 1
            except (WebSocketDisconnect, RuntimeError, Exception):
                dead.append(ws)
                self._metrics["total_messages_dropped"] += 1

        for ws in dead:
            self.disconnect(ws, user_id)

    # ── Batch flush loop ─────────────────────────────────────

    async def start_flush_loop(self) -> None:
        """Start the background batch flush and ping loops."""
        if self._running:
            return
        self._running = True
        self._flush_task = asyncio.create_task(self._flush_loop())
        self._ping_task = asyncio.create_task(self._ping_loop())
        log.info("WebSocket flush + ping loops started")

    async def stop_flush_loop(self) -> None:
        """Stop background loops gracefully."""
        self._running = False
        for task in [self._flush_task, self._ping_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    async def _flush_loop(self) -> None:
        """Periodically flush buffered messages."""
        interval = BATCH_INTERVAL_MS / 1000.0
        while self._running:
            await asyncio.sleep(interval)
            await self._flush_all()

    async def _flush_all(self) -> None:
        """Flush all buffered messages, respecting throttle."""
        now = time.time()
        throttle = THROTTLE_MS / 1000.0

        for user_id in list(self._message_buffers.keys()):
            buffer = self._message_buffers.get(user_id, [])
            if not buffer:
                continue

            last = self._last_send.get(user_id, 0)
            if (now - last) < throttle:
                self._metrics["total_throttled"] += 1
                continue

            # Batch all buffered messages into one payload
            batch_payload = {
                "type": "batch_update",
                "count": len(buffer),
                "updates": buffer,
                "timestamp": now,
            }

            await self._deliver(user_id, batch_payload)
            self._message_buffers[user_id] = []
            self._last_send[user_id] = now

    # ── Ping/Pong & Stale Pruning ────────────────────────────

    async def _ping_loop(self) -> None:
        """Periodically ping all connections and prune stale ones."""
        while self._running:
            await asyncio.sleep(PING_INTERVAL_S)
            await self._ping_and_prune()

    async def _ping_and_prune(self) -> None:
        """Send ping to all connections and prune stale ones."""
        now = time.time()
        for user_id in list(self._connections.keys()):
            dead: list[WebSocket] = []
            for ws in self._connections.get(user_id, []):
                ws_id = id(ws)
                last_pong = self._last_pong.get(ws_id, now)

                # Prune stale connections
                if (now - last_pong) > STALE_TIMEOUT_S:
                    log.info(
                        "Pruning stale WS: user=%d, stale_for=%.1fs",
                        user_id, now - last_pong,
                    )
                    dead.append(ws)
                    self._metrics["total_stale_pruned"] += 1
                    continue

                # Send ping
                try:
                    await ws.send_json({"type": "system.ping", "timestamp": now})
                except Exception:
                    dead.append(ws)

            for ws in dead:
                try:
                    await ws.close(code=1000, reason="Stale connection")
                except Exception:
                    pass
                self.disconnect(ws, user_id)

    def record_pong(self, websocket: WebSocket) -> None:
        """Record a pong response from a client."""
        self._last_pong[id(websocket)] = time.time()

    # ── Utilities ────────────────────────────────────────────

    @property
    def active_connections(self) -> int:
        return sum(
            len(conns) for conns in self._connections.values()
        )

    @property
    def active_users(self) -> int:
        return len(self._connections)

    def get_stats(self) -> dict:
        return {
            "active_users": self.active_users,
            "active_connections": self.active_connections,
            "buffered_messages": sum(
                len(b) for b in self._message_buffers.values()
            ),
            "running": self._running,
            **self._metrics,
        }
