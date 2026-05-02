"""
multi_llm_service.py
─────────────────────────────────────────────
Multi-provider LLM with Gemini → Groq → OpenRouter fallback.

Returns LLM_FAILED_MARKER when all providers fail so the
controller can build its own context-aware response.
"""

import asyncio
import hashlib
import logging
import time
from typing import Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES         = 2
RATE_LIMIT_COOLDOWN = 300
ERROR_COOLDOWN      = 60
CACHE_TTL           = 300
REQUEST_TIMEOUT     = 25.0

# Sentinel returned when every LLM provider fails
LLM_FAILED_MARKER = "__LLM_ALL_FAILED__"

# ─── Cache ─────────────────────────────────────
_cache: Dict[str, Tuple[str, float]] = {}


def _cache_key(msg: str, history: List[dict]) -> str:
    s = msg[:200] + "|" + "|".join(m["content"][:30] for m in history[-3:])
    return hashlib.md5(s.encode()).hexdigest()


def _from_cache(key: str) -> Optional[str]:
    if key in _cache:
        txt, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return txt
        del _cache[key]
    return None


def _to_cache(key: str, txt: str) -> None:
    if len(_cache) >= 200:
        oldest = min(_cache, key=lambda k: _cache[k][1])
        del _cache[oldest]
    _cache[key] = (txt, time.time())


# ─── Provider State ────────────────────────────
class _ProviderState:
    def __init__(self):
        self._rl: Dict[str, float] = {}
        self._err: Dict[str, float] = {}

    def ok(self, name: str) -> bool:
        now = time.time()
        if now < self._rl.get(name, 0):
            return False
        if now < self._err.get(name, 0):
            return False
        return True

    def rate_limit(self, name: str) -> None:
        self._rl[name] = time.time() + RATE_LIMIT_COOLDOWN
        logger.warning(f"[{name}] rate-limited for {RATE_LIMIT_COOLDOWN}s")

    def error(self, name: str) -> None:
        self._err[name] = time.time() + ERROR_COOLDOWN
        logger.warning(f"[{name}] error cooldown {ERROR_COOLDOWN}s")

    def success(self, name: str) -> None:
        self._rl.pop(name, None)
        self._err.pop(name, None)


_state = _ProviderState()


def _is_rate_limit(exc: Exception) -> bool:
    msg = str(exc).lower()
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429
    return any(k in msg for k in ["429", "rate limit", "quota", "resource exhausted"])


def _msgs(system: str, history: List[dict], user_msg: str) -> List[dict]:
    out = [{"role": "system", "content": system}]
    for m in history[-8:]:
        out.append({"role": m["role"], "content": m["content"]})
    out.append({"role": "user", "content": user_msg})
    return out


# ─── Provider 1: Gemini ────────────────────────
async def _gemini(system: str, user_msg: str, history: List[dict]) -> str:
    from core.config import settings
    key = settings.GEMINI_API_KEY
    if not key:
        raise ValueError("No GEMINI_API_KEY")
    import google.generativeai as genai
    genai.configure(api_key=key)
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system,
    )
    ch = []
    for m in history[-8:]:
        role = "user" if m["role"] == "user" else "model"
        ch.append({"role": role, "parts": [m["content"]]})

    def _sync():
        chat = model.start_chat(history=ch)
        return chat.send_message(user_msg).text

    return await asyncio.get_event_loop().run_in_executor(None, _sync)


# ─── Provider 2: Groq ─────────────────────────
async def _groq(system: str, user_msg: str, history: List[dict]) -> str:
    from core.config import settings
    key = settings.GROQ_API_KEY
    if not key:
        raise ValueError("No GROQ_API_KEY")
    msgs = _msgs(system, history, user_msg)
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        r = await c.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": "llama-3.1-8b-instant", "messages": msgs,
                  "max_tokens": 600, "temperature": 0.7},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


# ─── Provider 3: OpenRouter ───────────────────
async def _openrouter(system: str, user_msg: str, history: List[dict]) -> str:
    from core.config import settings
    key = settings.OPENROUTER_API_KEY
    if not key:
        raise ValueError("No OPENROUTER_API_KEY")
    msgs = _msgs(system, history, user_msg)
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as c:
        r = await c.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}",
                     "HTTP-Referer": "https://medicare-ai.app",
                     "X-Title": "MediCare AI",
                     "Content-Type": "application/json"},
            json={"model": "meta-llama/llama-3.1-8b-instruct:free",
                  "messages": msgs, "max_tokens": 600, "temperature": 0.7},
        )
        r.raise_for_status()
        choices = r.json().get("choices", [])
        if choices:
            return choices[0]["message"]["content"]
        raise ValueError("Empty choices")


_PROVIDERS = [
    ("gemini", _gemini),
    ("groq", _groq),
    ("openrouter", _openrouter),
]


async def get_llm_response(
    system_prompt: str, user_message: str, history: List[dict],
) -> str:
    ck = _cache_key(user_message, history)
    cached = _from_cache(ck)
    if cached:
        return cached

    for name, fn in _PROVIDERS:
        if not _state.ok(name):
            continue
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                logger.info(f"[{name}] attempt {attempt}")
                result = await fn(system_prompt, user_message, history)
                if result and result.strip():
                    _state.success(name)
                    _to_cache(ck, result)
                    logger.info(f"[{name}] OK ({len(result)} chars)")
                    return result
            except Exception as exc:
                if _is_rate_limit(exc):
                    _state.rate_limit(name)
                    break
                logger.warning(f"[{name}] attempt {attempt}: {exc}")
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(0.5 * attempt)
        else:
            _state.error(name)

    logger.error("All LLM providers failed")
    return LLM_FAILED_MARKER


async def check_providers_status() -> dict:
    now = time.time()
    out = {}
    for name, _ in _PROVIDERS:
        rl = _state._rl.get(name, 0)
        er = _state._err.get(name, 0)
        if now < rl:
            out[name] = {"status": "rate_limited", "available_in_seconds": int(rl - now)}
        elif now < er:
            out[name] = {"status": "error_cooldown", "available_in_seconds": int(er - now)}
        else:
            out[name] = {"status": "available"}
    return out
