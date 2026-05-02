"""
chat_controller.py
─────────────────────────────────────────────
Core chat logic — the brain of the AI assistant.

v2 Fixes:
  • Context-aware fallback when LLM fails (uses prediction + health data)
  • Better intent detection (health queries, prediction review)
  • Varied, non-repetitive responses
  • Auto-prediction when ≥2 symptoms collected
"""

import logging
import random
import re
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from features.ai_assistant.chat_state import (
    load_state, update_state, reset_state,
)
from features.ai_assistant.tools import (
    predict_tool, get_health_data, update_health_data,
)
from features.ai_assistant.multi_llm_service import (
    get_llm_response, LLM_FAILED_MARKER,
)

logger = logging.getLogger(__name__)


# ── Symptom vocabulary ────────────────────────────────────────
SYMPTOM_KEYWORDS: Dict[str, List[str]] = {
    "high_fever":       ["high fever", "very hot", "burning up"],
    "mild_fever":       ["mild fever", "low grade fever", "slight fever"],
    "fever":            ["fever", "feverish", "temperature"],
    "chills":           ["chills", "chilling"],
    "sweating":         ["sweating", "sweats", "night sweats"],
    "shivering":        ["shivering", "shaking", "trembling"],
    "headache":         ["headache", "head ache", "head pain", "head hurts"],
    "body_pain":        ["body pain", "body ache", "body aches"],
    "chest_pain":       ["chest pain", "chest hurts", "chest tightness"],
    "back_pain":        ["back pain", "backache", "lower back"],
    "joint_pain":       ["joint pain", "joints hurt", "joint ache"],
    "stomach_pain":     ["stomach pain", "stomach ache", "abdominal pain", "tummy pain"],
    "muscle_pain":      ["muscle pain", "muscle ache", "sore muscles"],
    "knee_pain":        ["knee pain", "knee hurts"],
    "neck_pain":        ["neck pain", "stiff neck"],
    "cough":            ["cough", "coughing", "dry cough", "wet cough"],
    "breathlessness":   ["breathless", "short of breath", "difficulty breathing", "can't breathe"],
    "runny_nose":       ["runny nose", "running nose", "nasal drip"],
    "sore_throat":      ["sore throat", "throat pain", "throat hurts"],
    "sneezing":         ["sneezing", "sneeze"],
    "phlegm":           ["phlegm", "mucus", "sputum"],
    "blood_in_sputum":  ["blood in sputum", "coughing blood"],
    "nausea":           ["nausea", "nauseous", "feel sick", "queasy"],
    "vomiting":         ["vomiting", "vomit", "throwing up"],
    "diarrhoea":        ["diarrhea", "diarrhoea", "loose stools", "loose motions"],
    "constipation":     ["constipation", "constipated"],
    "loss_of_appetite": ["loss of appetite", "no appetite", "not hungry", "can't eat"],
    "acidity":          ["acidity", "acid reflux", "heartburn", "gastric"],
    "indigestion":      ["indigestion", "bloating", "bloated", "gas"],
    "skin_rash":        ["rash", "skin rash", "red spots", "hives"],
    "itching":          ["itching", "itchy", "itch"],
    "yellowish_skin":   ["yellowish skin", "yellow skin", "jaundice"],
    "dizziness":        ["dizziness", "dizzy", "lightheaded", "vertigo"],
    "fatigue":          ["fatigue", "tired", "tiredness", "exhausted", "weakness", "weak", "no energy"],
    "anxiety":          ["anxiety", "anxious", "nervous", "panic"],
    "depression":       ["depression", "depressed", "sad", "hopeless"],
    "lack_of_concentration": ["can't concentrate", "brain fog"],
    "blurred_vision":   ["blurred vision", "blurry vision"],
    "watering_from_eyes": ["watery eyes", "eyes watering"],
    "redness_of_eyes":  ["red eyes", "eye redness"],
    "burning_micturition": ["burning urination", "painful urination"],
    "frequent_urination": ["frequent urination", "peeing a lot"],
    "dark_urine":       ["dark urine", "dark pee"],
    "fast_heart_rate":  ["fast heart rate", "rapid heartbeat", "palpitations"],
    "swollen_legs":     ["swollen legs", "leg swelling", "edema"],
    "weight_loss":      ["weight loss", "losing weight"],
    "weight_gain":      ["weight gain", "gaining weight"],
    "excessive_thirst": ["excessive thirst", "very thirsty", "always thirsty"],
    "excessive_hunger": ["excessive hunger", "always hungry"],
    "dehydration":      ["dehydration", "dehydrated"],
}

COUNTRY_MAP: Dict[str, str] = {
    "india": "IN", "indian": "IN", "usa": "US", "united states": "US",
    "america": "US", "uk": "GB", "united kingdom": "GB", "england": "GB",
    "canada": "CA", "australia": "AU", "germany": "DE", "france": "FR",
    "brazil": "BR", "japan": "JP", "china": "CN", "nigeria": "NG",
    "south africa": "ZA", "mexico": "MX", "pakistan": "PK",
    "bangladesh": "BD", "sri lanka": "LK", "nepal": "NP",
    "philippines": "PH", "thailand": "TH", "singapore": "SG",
    "russia": "RU", "italy": "IT", "spain": "ES", "egypt": "EG",
    "uae": "AE", "dubai": "AE", "saudi arabia": "SA",
}


# ── Intent detection ──────────────────────────────────────────

_RESET = ["start over", "reset", "clear", "new session", "restart"]
_GREETING = ["hello", "hi", "hey", "good morning", "good evening", "good afternoon"]
_PREDICT = ["predict", "diagnose", "what disease", "what could", "what's wrong",
            "analyze", "check symptoms", "run analysis", "what do i have", "am i sick"]
_HEALTH_QUERY = ["my health", "health report", "health data", "my condition",
                 "my vitals", "my bmi", "my weight", "my heart rate", "my sleep",
                 "my oxygen", "my stress", "how am i", "my metrics", "my records",
                 "about me", "my profile", "my status"]


def _detect_intent(message: str) -> str:
    msg = message.lower().strip()
    if any(p in msg for p in _RESET):
        return "reset"
    if len(msg.split()) <= 3 and any(p in msg for p in _GREETING):
        return "greeting"
    if any(p in msg for p in _PREDICT):
        return "predict"
    if any(p in msg for p in _HEALTH_QUERY):
        return "health_query"
    for triggers in SYMPTOM_KEYWORDS.values():
        for t in triggers:
            if t in msg:
                return "symptom"
    return "general"


# ── Extractors ────────────────────────────────────────────────

def _extract_symptoms(message: str) -> List[str]:
    msg = message.lower()
    found: List[str] = []
    for key, triggers in SYMPTOM_KEYWORDS.items():
        for t in triggers:
            if t in msg and key not in found:
                found.append(key)
                break
    return found


def _extract_country(message: str) -> Optional[str]:
    msg = message.lower()
    for name, code in sorted(COUNTRY_MAP.items(), key=lambda x: -len(x[0])):
        if name in msg:
            return code
    return None


def _extract_health_data(message: str) -> dict:
    data = {}
    msg = message.lower()
    bp = re.search(r'(\d{2,3})\s*/\s*(\d{2,3})', message)
    if bp:
        data["bp"] = f"{bp.group(1)}/{bp.group(2)}"
    sleep = re.search(r'(?:sleep|sleeping|slept)\s*(?:for\s+)?(\d+\.?\d*)\s*(?:hours?|hrs?|h)', msg)
    if sleep:
        data["sleep"] = float(sleep.group(1))
    age = re.search(r'(?:age|aged|i\s*am|i\'m|im)\s*(\d{1,3})', msg)
    if not age:
        age = re.search(r'(\d{1,3})\s*(?:years?\s*old)', msg)
    if age:
        a = int(age.group(1))
        if 1 <= a <= 120:
            data["age"] = a
    wt = re.search(r'(?:weigh|weight)\s*(?:is\s+)?(\d{2,3})\s*(?:kg)?', msg)
    if not wt:
        wt = re.search(r'(\d{2,3})\s*(?:kg|kgs|kilos)', msg)
    if wt:
        w = int(wt.group(1))
        if 20 <= w <= 300:
            data["weight"] = w
    return data


def _extract_lifestyle(message: str) -> dict:
    msg = message.lower()
    flags = {}
    if any(w in msg for w in ["i smoke", "smoker", "smoking"]):
        flags["smoker"] = True
    if any(w in msg for w in ["don't smoke", "non smoker", "no smoking"]):
        flags["smoker"] = False
    if any(w in msg for w in ["i drink", "drinker", "alcohol"]):
        flags["drinker"] = True
    if any(w in msg for w in ["don't drink", "no alcohol", "sober"]):
        flags["drinker"] = False
    if any(w in msg for w in ["sedentary", "inactive", "no exercise"]):
        flags["inactive"] = True
    return flags


# ── Context-aware fallback responses ──────────────────────────

def _build_health_report(db_health: dict, state: dict, username: str) -> str:
    """Build a rich health data response when user asks about their data."""
    lines = [f"Here's what I know about your health, {username}:\n"]
    has_data = False

    if db_health.get("sleep") is not None:
        sleep = db_health["sleep"]
        status = "which is below the recommended 7-8 hours" if sleep < 7 else "which is in the healthy range"
        lines.append(f"💤 **Sleep:** {sleep:.1f} hours — {status}.")
        has_data = True
    if db_health.get("heart_rate") is not None:
        hr = db_health["heart_rate"]
        status = "normal range" if 60 <= hr <= 100 else "outside normal range (60-100 bpm)"
        lines.append(f"❤️ **Heart Rate:** {hr} bpm — {status}.")
        has_data = True
    if db_health.get("oxygen") is not None:
        o2 = db_health["oxygen"]
        status = "healthy" if o2 >= 95 else "below normal (should be ≥95%)"
        lines.append(f"🫁 **Oxygen:** {o2:.1f}% — {status}.")
        has_data = True
    if db_health.get("stress") is not None:
        stress = db_health["stress"]
        status = "high — consider relaxation techniques" if stress >= 7 else "manageable"
        lines.append(f"🧠 **Stress Level:** {stress:.0f}/10 — {status}.")
        has_data = True
    if db_health.get("bmi") is not None:
        bmi = db_health["bmi"]
        cat = "Underweight" if bmi < 18.5 else "Normal" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"
        lines.append(f"⚖️ **BMI:** {bmi:.1f} ({cat}).")
        has_data = True
    if db_health.get("steps") is not None:
        steps = db_health["steps"]
        status = "great activity!" if steps >= 10000 else "try to aim for 10,000 steps"
        lines.append(f"🚶 **Steps:** {steps:,} — {status}.")
        has_data = True

    symptoms = state.get("symptoms", [])
    if symptoms:
        formatted = [s.replace("_", " ").title() for s in symptoms]
        lines.append(f"\n📋 **Symptoms you've reported:** {', '.join(formatted)}.")

    if not has_data:
        return (
            f"I don't have any health metrics logged for you yet, {username}. "
            "You can start tracking your health data in the Health Monitoring section — "
            "just log your sleep, heart rate, stress level, and activity. "
            "Once you do, I'll be able to give you personalized insights!"
        )

    lines.append("\nWould you like advice on any of these metrics, or should I analyze your symptoms?")

    # If data is stale, prompt user to update
    freshness = db_health.get("data_freshness", "none")
    if freshness in ("stale", "none"):
        lines.append(
            "\n📋 *Your health data may be outdated. "
            "Could you share today's sleep, BP, or step count so I can give better insights?*"
        )

    return "\n".join(lines)


def _build_prediction_response(prediction: dict, symptoms: List[str]) -> str:
    """Build a detailed response when prediction is run."""
    disease = prediction.get("predicted_disease", "Unknown")
    conf = prediction.get("confidence", 0)
    desc = prediction.get("description", "")
    precs = prediction.get("precautions", [])
    risk = prediction.get("risk_level", "Low")
    matched = prediction.get("matched_symptoms", [])

    formatted_symptoms = [s.replace("_", " ").title() for s in matched]

    lines = [
        f"Based on your symptoms ({', '.join(formatted_symptoms)}), "
        f"the AI assessment suggests **{disease}** with {conf:.0f}% confidence.\n"
    ]

    if desc:
        lines.append(f"**About {disease}:** {desc[:250]}\n")

    if risk == "High" or risk == "Moderate":
        lines.append(f"⚠️ **Risk Level:** {risk} — please take this seriously.\n")

    if precs:
        lines.append("**Recommended precautions:**")
        for i, p in enumerate(precs[:4], 1):
            lines.append(f"  {i}. {p}")
        lines.append("")

    lines.append(
        "⚕️ **Important:** This is an AI-based assessment, not a medical diagnosis. "
        "Please consult a healthcare professional for proper evaluation and treatment."
    )
    return "\n".join(lines)


def _build_symptom_followup(symptoms: List[str]) -> str:
    """Build a varied follow-up question for more symptoms."""
    formatted = [s.replace("_", " ").title() for s in symptoms]
    templates = [
        f"I've noted **{', '.join(formatted)}**. To give you a more accurate assessment, "
        "could you tell me if you have any other symptoms? For example: "
        "nausea, body pain, dizziness, or cough?",

        f"Got it — **{', '.join(formatted)}**. Are you experiencing anything else? "
        "Things like difficulty sleeping, loss of appetite, or any skin changes "
        "would help me narrow down the assessment.",

        f"I've recorded **{', '.join(formatted)}**. "
        "How long have you been experiencing these? And do you have any additional symptoms "
        "like chills, sweating, or sore throat?",
    ]
    return random.choice(templates)


def _build_greeting(username: str, db_health: dict, state: dict) -> str:
    """Build a personalized greeting."""
    symptoms = state.get("symptoms", [])
    parts = [f"Hello {username}! 👋 I'm Karuna, your health assistant."]

    if symptoms:
        formatted = [s.replace("_", " ").title() for s in symptoms]
        parts.append(
            f"\nI remember you mentioned these symptoms earlier: **{', '.join(formatted)}**. "
            "Would you like me to analyze them, or do you have something new to discuss?"
        )
    elif db_health.get("sleep") is not None or db_health.get("heart_rate") is not None:
        parts.append(
            "\nI can see you have health data logged. "
            "Would you like a health summary, symptom analysis, or general health advice?"
        )
    else:
        parts.append(
            "\nI can help you with symptom analysis, health advice, "
            "and understanding your health metrics. What's on your mind today?"
        )

    # If data is stale or missing, add a gentle prompt
    freshness = db_health.get("data_freshness", "none")
    if freshness in ("stale", "none"):
        parts.append(
            "\n💡 *Tip: Share your today's health data (sleep, BP, steps) "
            "so I can give you personalized insights!*"
        )

    return "\n".join(parts)


def _build_general_fallback(message: str) -> str:
    """Varied general responses when LLM fails on non-specific queries."""
    msg = message.lower()
    if any(w in msg for w in ["thank", "thanks", "thx"]):
        return random.choice([
            "You're welcome! Feel free to ask anything about your health anytime. Take care! 😊",
            "Happy to help! Remember to stay hydrated and get enough rest. 💪",
        ])
    if any(w in msg for w in ["help", "what can you do", "how do you work"]):
        return (
            "Here's what I can do for you:\n\n"
            "🔍 **Symptom Analysis** — Tell me your symptoms and I'll provide an AI assessment\n"
            "📊 **Health Report** — Ask \"what's my health data\" and I'll show your metrics\n"
            "💡 **Health Advice** — Ask about sleep, diet, exercise, stress, or any health topic\n"
            "🌍 **Country Risk** — Mention your country for WHO-adjusted risk analysis\n\n"
            "Just tell me how you're feeling or what you'd like to know!"
        )
    if any(w in msg for w in ["sleep", "tired", "rest", "insomnia"]):
        return (
            "Sleep is one of the most important pillars of health. Adults need 7-9 hours per night. "
            "Here are some tips that can help:\n\n"
            "• Keep a consistent sleep schedule (same bedtime and wake-up time)\n"
            "• Avoid screens 30 minutes before bed\n"
            "• Keep your room cool (18-20°C) and dark\n"
            "• Avoid caffeine after 2 PM\n\n"
            "If sleep problems persist for more than 2-3 weeks, please consult a doctor."
        )
    if any(w in msg for w in ["stress", "anxiety", "worry", "tension"]):
        return (
            "Managing stress is crucial for your overall wellbeing. Here are some proven techniques:\n\n"
            "• **4-7-8 Breathing:** Inhale 4s, hold 7s, exhale 8s (repeat 4 times)\n"
            "• **Progressive Muscle Relaxation:** Tense and release each muscle group\n"
            "• **Exercise:** Even 20 minutes of walking reduces cortisol\n"
            "• **Limit news/social media** if it increases anxiety\n\n"
            "If stress is severely impacting your daily life, please speak with a mental health professional."
        )
    if any(w in msg for w in ["diet", "food", "eat", "nutrition", "weight"]):
        return (
            "Good nutrition is the foundation of health. Here's a balanced approach:\n\n"
            "• Fill half your plate with vegetables and fruits\n"
            "• Choose whole grains over refined ones\n"
            "• Include lean proteins (fish, chicken, legumes)\n"
            "• Stay hydrated — 8-10 glasses of water daily\n"
            "• Limit processed foods, excess sugar, and saturated fats\n\n"
            "For personalized diet advice, consult a registered dietitian."
        )
    return random.choice([
        "I'm here to help with your health questions! You can tell me about any symptoms "
        "you're experiencing, ask about your health data, or get advice on topics like "
        "sleep, nutrition, exercise, and stress management. What would you like to explore?",

        "Feel free to share any health concerns with me. I can analyze symptoms, "
        "review your health metrics, or provide general wellness advice. "
        "What's on your mind?",

        "I can help you understand your health better! Try telling me about "
        "symptoms you're experiencing, or ask me to review your health data. "
        "I'm also happy to give advice on sleep, diet, and exercise.",
    ])


# ── Severity check ────────────────────────────────────────────

SEVERE_COMBOS = [
    {"chest_pain", "breathlessness"},
    {"blood_in_sputum", "cough"},
    {"high_fever", "breathlessness"},
    {"chest_pain", "sweating", "dizziness"},
]


def _has_severe(symptoms: List[str]) -> bool:
    s = set(symptoms)
    return any(c.issubset(s) for c in SEVERE_COMBOS)


# ── LLM prompt ────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Karuna, a friendly health assistant in the MediCare AI app.

STYLE — THIS IS CRITICAL:
1. Be CONCISE. Max 3-4 short sentences per response. No walls of text.
2. Sound like a caring friend texting — warm, natural, casual. NOT a clinical report.
3. DO NOT use bullet points, numbered lists, or headers. Write in flowing sentences/paragraphs.
4. DO NOT repeat "consult your doctor" more than once in a response.
5. DO NOT restate every single health metric — only highlight what's relevant or concerning.
6. Use emoji sparingly (1-2 max per response).
7. If user asks about health data, give a quick summary with insights, not a metric-by-metric breakdown.
8. When giving advice, pick the TOP 1-2 most important tips, not 6.
9. Be direct and helpful. No filler phrases like "Let's break down..." or "Here's a summary..."

SAFETY: You are NOT a doctor. Mention seeing a professional only once if relevant.

{context}
"""


def _build_context(state: dict, prediction: Optional[dict],
                   db_health: dict, username: str) -> str:
    lines = [f"USER: {username}"]
    has_health = False
    for key, label in [("sleep", "Sleep"), ("heart_rate", "HR"),
                       ("oxygen", "O2"), ("stress", "Stress"),
                       ("bmi", "BMI"), ("steps", "Steps")]:
        v = db_health.get(key)
        if v is not None:
            lines.append(f"  {label}: {v}")
            has_health = True
    symptoms = state.get("symptoms", [])
    if symptoms:
        lines.append(f"SYMPTOMS: {', '.join(s.replace('_',' ') for s in symptoms)}")
    hd = state.get("health_data", {})
    if hd.get("bp"):
        lines.append(f"BP: {hd['bp']}")
    if hd.get("age"):
        lines.append(f"Age: {hd['age']}")
    if prediction and prediction.get("predicted_disease"):
        d = prediction["predicted_disease"]
        c = prediction.get("confidence", 0)
        lines.append(f"PREDICTION: {d} ({c:.0f}%)")
        if prediction.get("precautions"):
            lines.append(f"Precautions: {', '.join(prediction['precautions'][:3])}")
    return "\n".join(lines)


# ── Main controller ───────────────────────────────────────────

async def process_message(
    db: AsyncSession, user_id: int, username: str,
    message: str, history: List[dict],
) -> dict:
    # Step 1: Parse
    intent = _detect_intent(message)
    new_symptoms = _extract_symptoms(message)
    country = _extract_country(message)
    health_data = _extract_health_data(message)
    lifestyle = _extract_lifestyle(message)

    logger.info(f"Chat | user={user_id} intent={intent} symptoms={new_symptoms}")

    # Step 2: Handle reset
    if intent == "reset":
        state = await reset_state(db, user_id)
        return {"reply": "I've cleared our conversation. Let's start fresh! "
                         "What symptoms or health concerns would you like to discuss?",
                "state": _safe_state(state), "prediction": None}

    # Step 3: Update state
    state = await load_state(db, user_id)
    updates = {"turn_count": state.get("turn_count", 0) + 1, "last_intent": intent}
    if new_symptoms:
        updates["symptoms"] = new_symptoms
    if country:
        updates["country"] = country
    if health_data:
        updates["health_data"] = health_data
    if lifestyle:
        updates["profile"] = lifestyle
    state = await update_state(db, user_id, updates)

    # Check for pending health update confirmation
    if "yes" in message.lower() and state.get("pending_health_update"):
        await update_health_data(db, user_id, state["pending_health_update"])
        logger.info(f"Confirmed and saved health data for user={user_id}")
        await update_state(db, user_id, {"pending_health_update": None})
        return {
            "reply": "I've saved that to your daily health records! Is there anything else you'd like to check or analyze?",
            "state": _safe_state(state), "prediction": None
        }
    elif "no" in message.lower() and state.get("pending_health_update"):
        await update_state(db, user_id, {"pending_health_update": None})
        return {
            "reply": "Okay, I won't save that. What else can I help you with today?",
            "state": _safe_state(state), "prediction": None
        }

    # Extract health data and ask for confirmation instead of auto-saving
    pending_update = None
    if health_data:
        daily_update = {}
        if "bp" in health_data:
            try:
                parts = health_data["bp"].split("/")
                daily_update["bp_systolic"] = int(parts[0])
                daily_update["bp_diastolic"] = int(parts[1])
            except (ValueError, IndexError):
                pass
        if "sleep" in health_data:
            daily_update["sleep_hours"] = health_data["sleep"]
        if "weight" in health_data:
            daily_update["weight"] = float(health_data["weight"])
        if daily_update:
            pending_update = daily_update
            await update_state(db, user_id, {"pending_health_update": daily_update})

    # Step 4: Get DB health data
    db_health = await get_health_data(db, user_id)

    # Step 5: Decision — predict or follow up?
    symptoms = state.get("symptoms", [])
    prediction = None

    should_predict = (
        intent == "predict"
        or (intent == "symptom" and len(symptoms) >= 2 and db_health.get("sleep") is not None)
        or (new_symptoms and len(symptoms) >= 3)
    )

    if should_predict and symptoms:
        profile = state.get("profile", {})
        pred_lifestyle = {}
        if profile.get("smoker"):
            pred_lifestyle["smoker"] = True
        if profile.get("drinker"):
            pred_lifestyle["drinker"] = True
        age = state.get("health_data", {}).get("age")
        if age:
            pred_lifestyle["age_group"] = "senior" if age >= 60 else "middle" if age >= 36 else "young"
        prediction = predict_tool(
            user_id=user_id,
            symptoms=symptoms,
            country_code=state.get("country"),
            profile=pred_lifestyle or None,
        )
        if prediction and not prediction.get("error"):
            await update_state(db, user_id, {
                "last_prediction": {"disease": prediction.get("predicted_disease"),
                                    "confidence": prediction.get("confidence")}
            })

    # Step 6: Try LLM
    context = _build_context(state, prediction, db_health, username)
    system = SYSTEM_PROMPT.format(context=context)

    enriched = message
    if prediction and not prediction.get("error"):
        d = prediction["predicted_disease"]
        c = prediction.get("confidence", 0)
        enriched += (f"\n\n[SYSTEM: Prediction just ran. Result: {d} at {c:.0f}%. "
                     f"Explain this to the user clearly, mention precautions, recommend a doctor.]")
    elif intent == "health_query":
        enriched += "\n\n[SYSTEM: User wants their health data summary. Show their metrics with insights.]"

    # Smartwatch data check
    is_missing_smartwatch = (db_health.get("steps") is None or db_health.get("sleep") is None)
    if is_missing_smartwatch:
        enriched += "\n\n[SYSTEM: Smartwatch data (steps/sleep) is missing. Politely prompt the user to sync their smartwatch to get more accurate health insights.]"
    else:
        enriched += f"\n\n[SYSTEM: Smartwatch data is available. Steps: {db_health.get('steps')}, Sleep: {db_health.get('sleep')}h. Use this data in your response generation.]"

    if symptoms and _has_severe(symptoms):
        enriched += "\n\n[SYSTEM: SEVERE symptoms detected. Include URGENT warning.]"

    reply = await get_llm_response(system, enriched, history)

    # Step 7: If LLM failed, build smart contextual response
    if reply == LLM_FAILED_MARKER:
        logger.info("LLM failed — building contextual fallback")
        if prediction and not prediction.get("error"):
            reply = _build_prediction_response(prediction, symptoms)
        elif intent == "health_query":
            reply = _build_health_report(db_health, state, username)
        elif intent == "greeting":
            reply = _build_greeting(username, db_health, state)
        elif intent == "symptom" and len(symptoms) <= 1:
            reply = _build_symptom_followup(symptoms)
        elif intent == "symptom" and len(symptoms) >= 2 and not prediction:
            # Run prediction now
            prediction = predict_tool(user_id=user_id, symptoms=symptoms, country_code=state.get("country"))
            if prediction and not prediction.get("error"):
                reply = _build_prediction_response(prediction, symptoms)
            else:
                reply = "I've noted your symptoms. Please provide more details or ask for a prediction."
        else:
            reply = _build_general_fallback(message)

        # Add severity warning
        if symptoms and _has_severe(symptoms):
            reply = ("🚨 **URGENT:** Your symptom combination may indicate a serious condition. "
                     "Please seek immediate medical attention or call emergency services.\n\n" + reply)

        if is_missing_smartwatch and not pending_update:
            reply += "\n\n*Tip: Sync your smartwatch so I can use your steps and sleep data for better insights!*"

    # If there's a pending health update, prepend the confirmation question
    if pending_update:
        extracted = []
        if "sleep_hours" in pending_update: extracted.append(f"{pending_update['sleep_hours']}h sleep")
        if "bp_systolic" in pending_update: extracted.append(f"BP {pending_update['bp_systolic']}/{pending_update.get('bp_diastolic','')}")
        if "weight" in pending_update: extracted.append(f"{pending_update['weight']}kg")
        reply = f"I noticed you mentioned {', '.join(extracted)}. Would you like me to save this to your daily health records? (Yes/No)\n\n" + reply

    return {
        "reply": reply,
        "state": _safe_state(state),
        "prediction": _safe_prediction(prediction),
    }


def _safe_state(state: dict) -> dict:
    return {
        "symptoms": state.get("symptoms", []),
        "country": state.get("country"),
        "profile": state.get("profile", {}),
        "health_data": state.get("health_data", {}),
        "turn_count": state.get("turn_count", 0),
    }


def _safe_prediction(pred: Optional[dict]) -> Optional[dict]:
    if not pred or pred.get("error"):
        return None
    return {
        "predicted_disease": pred.get("predicted_disease"),
        "confidence": pred.get("confidence"),
        "risk_level": pred.get("risk_level"),
        "description": pred.get("description", "")[:300],
        "precautions": pred.get("precautions", [])[:5],
        "matched_symptoms": pred.get("matched_symptoms", []),
    }
