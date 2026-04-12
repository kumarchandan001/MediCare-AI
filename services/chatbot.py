"""
services/chatbot.py
────────────────────
Context-aware health chatbot powered by the Gemini API.

Public API:
    generate_response(user_id, question, days=7)  ->  dict

The chatbot enriches every prompt with the user's:
  - Profile summary (age, gender, BMI, blood type, conditions)
  - Risk assessment (from utils/risk_engine.py)
  - Health trend insights (from utils/trend_analysis.py)
  - Recent vital-sign averages

This context turns generic LLM answers into personalised,
data-driven health guidance.

Requires:
    pip install google-genai
    Set GEMINI_API_KEY in .env or environment variables.
"""

from __future__ import annotations

import json
import os

import traceback
from datetime import datetime, timedelta
from typing import Any

from dotenv import load_dotenv

# ── Load environment ──────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, '.env'))

_GEMINI_KEY = os.getenv('GEMINI_API_KEY', '')

# ── Lazy Gemini client (fail gracefully if key missing) ───────────────────────
_client = None


def _get_client():
    """Return a google.genai.Client, creating it on first call."""
    from dotenv import load_dotenv
    import os
    
    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(_BASE_DIR, '.env'))
    api_key = os.getenv('GEMINI_API_KEY', '')

    if not api_key:
        return None
    
    global _client
    if _client is not None:
        # Reinitialize only if API Key somehow changed, but usually keeping the cached client is fine.
        return _client
        
    try:
        from google import genai
        _client = genai.Client(api_key=api_key)
        return _client
    except Exception as e:
        print(f"[chatbot] Failed to initialise Gemini client: {e}")
        return None


# ── DB helper (via SQLAlchemy) ─────────────────────────────────────────────────
from utils.db_helper import fetch_one, fetch_all, execute_sql


# ─────────────────────────────────────────────────────────────────────────────
# Context builders — gather personalised data for the prompt
# ─────────────────────────────────────────────────────────────────────────────

def _build_user_profile(user_id: int) -> str:
    """One-paragraph user profile summary."""
    user = fetch_one('SELECT * FROM users WHERE id = :uid', {'uid': user_id})
    if not user:
        return 'No user profile found.'

    parts = []
    name = ' '.join(filter(None, [user['first_name'], user['last_name']])) or user['username']
    parts.append(f'Name: {name}')

    if user['date_of_birth']:
        try:
            dob = datetime.strptime(str(user['date_of_birth']), '%Y-%m-%d')
            age = (datetime.now() - dob).days // 365
            parts.append(f'Age: {age}')
        except Exception:
            pass

    if user['gender']:         parts.append(f'Gender: {user["gender"]}')
    if user['height']:         parts.append(f'Height: {user["height"]} cm')
    if user['weight']:         parts.append(f'Weight: {user["weight"]} kg')
    if user['blood_type']:     parts.append(f'Blood type: {user["blood_type"]}')

    if user['medical_conditions']:
        try:
            conds = json.loads(user['medical_conditions'])
            if conds:
                parts.append(f'Medical conditions: {", ".join(conds)}')
        except Exception:
            pass

    if user['allergies']:
        try:
            algs = json.loads(user['allergies'])
            if algs:
                parts.append(f'Allergies: {", ".join(algs)}')
        except Exception:
            pass

    return ' | '.join(parts)


def _build_vitals_summary(user_id: int, since: str) -> str:
    """Latest vitals averages as a readable block."""
    row = fetch_one('''
        SELECT
            COUNT(DISTINCT DATE(created_at)) AS days_count,
            ROUND(AVG(heart_rate)::numeric,1)         AS hr,
            ROUND(AVG(oxygen_level)::numeric,1)       AS o2,
            ROUND(AVG(body_temperature)::numeric,1)   AS temp,
            ROUND(AVG(glucose_level)::numeric,1)      AS glucose,
            ROUND(AVG(stress_level)::numeric,1)       AS stress,
            ROUND(AVG(sleep_hours)::numeric,1)        AS sleep
        FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since
    ''', {'uid': user_id, 'since': since})
    if not row or row['days_count'] == 0:
        return 'No recent vital-sign data.'

    lines = [f'Based on {row["days_count"]} day(s) of data:']
    if row['hr']:      lines.append(f'  Heart rate: {row["hr"]} bpm')
    if row['o2']:      lines.append(f'  Blood oxygen: {row["o2"]}%')
    if row['temp']:    lines.append(f'  Temperature: {row["temp"]}°F')
    if row['glucose']: lines.append(f'  Blood glucose: {row["glucose"]} mg/dL')
    if row['stress']:  lines.append(f'  Stress level: {row["stress"]}/10')
    if row['sleep']:   lines.append(f'  Sleep: {row["sleep"]} hrs/night')

    # Blood pressure
    bp_row = fetch_one('''
        SELECT blood_pressure FROM health_monitoring
        WHERE user_id = :uid AND created_at >= :since AND blood_pressure IS NOT NULL
        ORDER BY created_at DESC LIMIT 1
    ''', {'uid': user_id, 'since': since})
    if bp_row:
        try:
            bp = json.loads(bp_row['blood_pressure'])
            lines.append(f'  Blood pressure: {bp.get("systolic")}/{bp.get("diastolic")} mmHg')
        except Exception:
            pass

    # Latest BMI
    bmi_row = fetch_one('''
        SELECT bmi, bmi_category FROM bmi_history
        WHERE user_id = :uid ORDER BY recorded_at DESC LIMIT 1
    ''', {'uid': user_id})
    if bmi_row:
        lines.append(f'  BMI: {bmi_row["bmi"]} ({bmi_row["bmi_category"]})')

    return '\n'.join(lines)


def _build_activity_summary(user_id: int, since: str) -> str:
    """Recent activity summary."""
    row = fetch_one('''
        SELECT
            COUNT(DISTINCT activity_date)   AS days,
            ROUND(AVG(steps)::numeric)               AS avg_steps,
            ROUND(AVG(calories_burned)::numeric)     AS avg_cal,
            ROUND(AVG(duration)::numeric)            AS avg_dur
        FROM activity_tracking
        WHERE user_id = :uid AND activity_date >= :since
    ''', {'uid': user_id, 'since': since})
    if not row or row['days'] == 0:
        return 'No recent activity data.'

    lines = [f'Activity data from {row["days"]} day(s):']
    if row['avg_steps']: lines.append(f'  Avg daily steps: {int(row["avg_steps"]):,}')
    if row['avg_cal']:   lines.append(f'  Avg calories burned: {int(row["avg_cal"]):,} kcal')
    if row['avg_dur']:   lines.append(f'  Avg exercise duration: {int(row["avg_dur"])} min')
    return '\n'.join(lines)


def _build_medication_summary(user_id: int) -> str:
    """Active medications."""
    meds = fetch_all('''
        SELECT medication_name, dosage, frequency
        FROM medication_reminders
        WHERE user_id = :uid AND is_active = 1
    ''', {'uid': user_id})
    if not meds:
        return 'No active medications.'

    lines = ['Active medications:']
    for m in meds:
        line = f'  - {m["medication_name"]}'
        if m['dosage']:    line += f' ({m["dosage"]})'
        if m['frequency']: line += f', {m["frequency"]}'
        lines.append(line)
    return '\n'.join(lines)


def _collect_context(user_id: int, days: int) -> str:
    """
    Assemble the full health-context block that will be injected into the
    system prompt. Uses the risk engine + trend analysis modules.
    """
    since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
    blocks: list[str] = []

    # DB-sourced context
    try:
        blocks.append('[USER PROFILE]\n' + _build_user_profile(user_id))
        blocks.append('[RECENT VITALS]\n' + _build_vitals_summary(user_id, since))
        blocks.append('[ACTIVITY]\n' + _build_activity_summary(user_id, since))
        blocks.append('[MEDICATIONS]\n' + _build_medication_summary(user_id))

        # Fetch recent chat interactions
        rows = fetch_all('''
            SELECT query, response FROM chatbot_interactions 
            WHERE user_id = :uid ORDER BY id DESC LIMIT 10
        ''', {'uid': user_id})
        if rows:
            hist_lines = ['[RECENT CHAT HISTORY - FOR CONTEXT]']
            for row in reversed(rows):
                hist_lines.append(f"User: {row['query']}")
                hist_lines.append(f"AI: {row['response']}")
            blocks.append('\n'.join(hist_lines))

        # Fetch recent disease predictions
        pred_rows = fetch_all('''
            SELECT symptoms, predicted_disease, confidence_score, predicted_at 
            FROM disease_predictions 
            WHERE user_id = :uid ORDER BY id DESC LIMIT 2
        ''', {'uid': user_id})
        if pred_rows:
            pred_lines = ['[RECENT DISEASE PREDICTIONS]']
            for row in pred_rows:
                pred_lines.append(f"- Diagnosed {row['predicted_disease']} ({row['confidence_score']}) on {row['predicted_at']} for symptoms: {row['symptoms']}")
            blocks.append('\n'.join(pred_lines))
            
        # ── Personalization Engine Injection ──
        try:
            from services.personalization_service import get_personalization_insights
            insights = get_personalization_insights(user_id)
            if insights:
                top_insight = insights[0]
                blocks.append(f"[CRITICAL PERSONALIZATION ALERT]\nPriority Risk ({top_insight['risk_level']}): {top_insight['insight']} Recommendation to reinforce: {top_insight['recommendation']}")
        except Exception as e:
            blocks.append(f'[PERSONALIZATION CONTEXT] Unavailable: {e}')
            
    except Exception as e:
        blocks.append(f'[DB CONTEXT] Unavailable: {e}')

    # Risk score (uses its own DB connection)
    try:
        from utils.risk_engine import calculate_risk
        risk = calculate_risk(user_id, days=days)
        risk_block = (
            f'[RISK ASSESSMENT]\n'
            f'Score: {risk["score"]}/100 ({risk["level"]})\n'
            f'Key factors:\n'
        )
        for f, info in risk.get('factors', {}).items():
            risk_block += f'  {f}: score={info["score"]}, value={info["value"]}\n'
        risk_reasons = '\n'.join(f'  - {r}' for r in risk.get('reasons', []))
        if risk_reasons:
            risk_block += f'Explanations:\n{risk_reasons}'
        blocks.append(risk_block)
    except Exception as e:
        blocks.append(f'[RISK ASSESSMENT]\nUnavailable: {e}')

    # Trend insights
    try:
        from utils.trend_analysis import analyze_trends
        trends = analyze_trends(user_id, days=days)
        if trends:
            blocks.append('[HEALTH TRENDS]\n' + '\n'.join(f'  - {t}' for t in trends))
    except Exception as e:
        blocks.append(f'[HEALTH TRENDS]\nUnavailable: {e}')

    # Active Alerts
    try:
        from services.alert_service import generate_alerts
        alerts = generate_alerts(user_id, days=days)
        if alerts:
            alerts_block = '[ACTIVE ALERTS]\n'
            for a in alerts:
                alerts_block += f'  - [{a.get("severity", "info").upper()}] {a.get("title", "")}: {a.get("message", "")}\n'
            blocks.append(alerts_block)
    except Exception as e:
        blocks.append(f'[ACTIVE ALERTS]\nUnavailable: {e}')

    return '\n\n'.join(blocks)


_SYSTEM_PROMPT = """\
You are a **health assistant**. Use the user's health data and conversation context to provide personalized advice. Do not provide medical diagnosis. Always include insight, risk, and recommendation for health-related queries.

## Your rules:
1. **Reference the user's actual data only when relevant**. Give personalised context from recent DB metrics (e.g., BMI, Sleep, Heart Rate).
2. **Conversation Context**: Remember the previous interactions from [RECENT CHAT HISTORY]. If the user asks a follow-up (e.g. "What should I do?"), understand what they are referring to.
3. **Structured Response Format**: For ANY health-related query, observation, or question, YOU MUST rigidly structure your response into these three exact sections:
   - **🧠 Insight:** (Short explanation of what their data or symptom means)
   - **⚠️ Risk/Observation:** (Identify any risks, or note if they are in healthy ranges)
   - **✅ Recommendation:** (Actionable, practical advice tailored to their lifestyle)
4. **Safety & Ethics**: Do NOT provide medical diagnosis. Always remind them to consult a qualified healthcare provider for serious medical concerns.
5. **Fallback Flow**: If the user's input is unclear, politely ask: "Can you provide more details?"

## User's health context:
{context}

---
Answer the user's question inherently referencing their data. If the user asks a completely non-health general question (like greeting or casual chat), you may skip the 3-part structure, but gracefully pivot back to health.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Smart fallback engine — provides context-aware, question-specific answers
# ─────────────────────────────────────────────────────────────────────────────

# Intent detection keywords (order matters — first match wins)
_INTENTS = [
    ('greeting',    ['hi', 'hello', 'hey', 'good morning', 'good evening',
                     'good afternoon', 'good night', 'howdy', 'hiya', 'sup',
                     'what\'s up', 'how are you', 'namaste']),
    ('fever',       ['fever', 'temperature', 'chills', 'shivering', 'hot',
                     'burning', 'cold sweat']),
    ('headache',    ['headache', 'head pain', 'head ache', 'migraine',
                     'head hurts', 'head is paining']),
    ('cold_flu',    ['cold', 'cough', 'sneeze', 'runny nose', 'sore throat',
                     'flu', 'throat pain', 'blocked nose', 'congestion']),
    ('stomach',     ['stomach', 'acidity', 'indigestion', 'nausea', 'vomit',
                     'diarrhea', 'diarrhoea', 'constipation', 'abdomen',
                     'stomach ache', 'stomach pain', 'gas', 'bloating']),
    ('sleep',       ['sleep', 'insomnia', 'can\'t sleep', 'sleeping',
                     'tired', 'fatigue', 'exhausted', 'drowsy', 'rest',
                     'not sleeping', 'wake up']),
    ('exercise',    ['exercise', 'workout', 'gym', 'run', 'walk', 'steps',
                     'fitness', 'activity', 'active', 'sport', 'yoga',
                     'jogging', 'cycling', 'physical']),
    ('diet',        ['diet', 'food', 'eat', 'nutrition', 'weight loss',
                     'weight gain', 'calorie', 'protein', 'vitamin',
                     'healthy eating', 'meal', 'fruits', 'vegetables']),
    ('water',       ['water', 'hydration', 'dehydrated', 'thirsty',
                     'drinking water', 'fluid']),
    ('bmi',         ['bmi', 'body mass', 'weight', 'overweight', 'underweight',
                     'obese', 'obesity']),
    ('heart',       ['heart', 'heart rate', 'pulse', 'chest pain',
                     'palpitation', 'blood pressure', 'bp', 'cardiac']),
    ('stress',      ['stress', 'anxiety', 'anxious', 'worried', 'panic',
                     'nervous', 'mental health', 'depression', 'depressed',
                     'tense', 'overwhelmed']),
    ('medication',  ['medicine', 'medication', 'drug', 'pill', 'tablet',
                     'dose', 'dosage', 'prescription', 'side effect']),
    ('risk',        ['risk', 'risk score', 'health risk', 'danger',
                     'health score', 'overall health']),
    ('summary',     ['summary', 'report', 'how am i', 'my health',
                     'health update', 'health status', 'overview',
                     'tell me about my health']),
]


def _detect_intent(question: str) -> str:
    """Detect user intent from the question text."""
    q = question.lower().strip()
    for intent, keywords in _INTENTS:
        for kw in keywords:
            if kw in q:
                return intent
    return 'general'


def _get_user_data(user_id: int, days: int) -> dict:
    """Gather all user health data for response generation."""
    data: dict[str, Any] = {}

    # Vitals
    try:
        since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        row = fetch_one('''
            SELECT
                ROUND(AVG(heart_rate)::numeric,1)       AS hr,
                ROUND(AVG(oxygen_level)::numeric,1)     AS o2,
                ROUND(AVG(body_temperature)::numeric,1) AS temp,
                ROUND(AVG(stress_level)::numeric,1)     AS stress,
                ROUND(AVG(sleep_hours)::numeric,1)      AS sleep,
                ROUND(AVG(glucose_level)::numeric,1)    AS glucose,
                COUNT(DISTINCT DATE(created_at)) AS days_count
            FROM health_monitoring
            WHERE user_id = :uid AND created_at >= :since
        ''', {'uid': user_id, 'since': since})
        if row and row['days_count'] and row['days_count'] > 0:
            data['hr'] = row['hr']
            data['o2'] = row['o2']
            data['temp'] = row['temp']
            data['stress'] = row['stress']
            data['sleep'] = row['sleep']
            data['glucose'] = row['glucose']
            data['days_count'] = row['days_count']

        # Activity
        act = fetch_one('''
            SELECT ROUND(AVG(steps)::numeric) AS avg_steps,
                   COUNT(DISTINCT activity_date) AS act_days
            FROM activity_tracking
            WHERE user_id = :uid AND activity_date >= :since
        ''', {'uid': user_id, 'since': since})
        if act and act['act_days'] and act['act_days'] > 0:
            data['steps'] = int(act['avg_steps']) if act['avg_steps'] else 0

        # Profile info
        user = fetch_one('SELECT * FROM users WHERE id = :uid', {'uid': user_id})
        if user:
            data['name'] = user['first_name'] or user['username'] or 'there'
            data['weight'] = user['weight']
            data['height'] = user['height']
            if user['medical_conditions']:
                try:
                    data['conditions'] = json.loads(user['medical_conditions'])
                except Exception:
                    pass
            if user['allergies']:
                try:
                    data['allergies'] = json.loads(user['allergies'])
                except Exception:
                    pass

        # BMI
        bmi_row = fetch_one('''
            SELECT bmi, bmi_category FROM bmi_history
            WHERE user_id = :uid ORDER BY recorded_at DESC LIMIT 1
        ''', {'uid': user_id})
        if bmi_row:
            data['bmi'] = bmi_row['bmi']
            data['bmi_cat'] = bmi_row['bmi_category']
        elif user and user['height'] and user['weight']:
            h_m = float(user['height']) / 100
            data['bmi'] = round(float(user['weight']) / (h_m * h_m), 1)
            data['bmi_cat'] = (
                'Underweight' if data['bmi'] < 18.5 else
                'Normal' if data['bmi'] <= 24.9 else
                'Overweight' if data['bmi'] <= 29.9 else 'Obese'
            )

        # Medications
        meds = fetch_all('''
            SELECT medication_name, dosage, frequency
            FROM medication_reminders
            WHERE user_id = :uid AND is_active = 1
        ''', {'uid': user_id})
        if meds:
            data['medications'] = [
                {'name': m['medication_name'], 'dosage': m['dosage'],
                 'frequency': m['frequency']}
                for m in meds
            ]
    except Exception as e:
        print(f'[chatbot] _get_user_data error: {e}')

    # Risk score
    try:
        from utils.risk_engine import calculate_risk
        risk = calculate_risk(user_id, days=days)
        data['risk_score'] = risk.get('score', 0)
        data['risk_level'] = risk.get('level', 'unknown')
        data['risk_reasons'] = risk.get('reasons', [])
    except Exception:
        pass

    return data


def _build_intent_response(intent: str, question: str, data: dict) -> str:
    """Build a response tailored to the detected intent using user data."""
    name = data.get('name', 'there')
    sleep = data.get('sleep')
    steps = data.get('steps')
    hr = data.get('hr')
    stress = data.get('stress')
    bmi = data.get('bmi')
    bmi_cat = data.get('bmi_cat', '')
    risk = data.get('risk_score')
    risk_lvl = data.get('risk_level', 'unknown')
    conditions = data.get('conditions', [])
    meds = data.get('medications', [])

    if intent == 'greeting':
        parts = [f"👋 Hello {name}! I'm MediCare AI, your personal health assistant."]
        if risk is not None:
            parts.append(f"\nYour current health risk score is **{risk}/100 ({risk_lvl})**.")
        if sleep:
            status = "great" if sleep >= 7 else "a bit low"
            parts.append(f"Your average sleep is **{sleep} hrs** — that's {status}.")
        parts.append("\nFeel free to ask me anything about your health! For example:")
        parts.append("- *\"How can I improve my sleep?\"*")
        parts.append("- *\"I have a headache, what should I do?\"*")
        parts.append("- *\"What does my risk score mean?\"*")
        return '\n'.join(parts)

    if intent == 'fever':
        parts = ["🤒 **Fever Management Tips:**\n"]
        parts.append("Here's what you should do right now:\n")
        parts.append("1. **Rest** — your body needs energy to fight infection")
        parts.append("2. **Stay hydrated** — drink water, clear broths, or electrolyte drinks")
        parts.append("3. **Take an OTC fever reducer** — paracetamol (500mg) or ibuprofen as directed")
        parts.append("4. **Monitor temperature** — use a thermometer every 4 hours")
        parts.append("5. **Cool compress** — place a lukewarm cloth on your forehead\n")
        if data.get('temp'):
            parts.append(f"📊 Your last recorded temperature was **{data['temp']}°F**.")
        parts.append("\n⚠️ **See a doctor if:**")
        parts.append("- Fever exceeds 103°F (39.4°C)")
        parts.append("- It persists for more than 3 days")
        parts.append("- You experience severe headache, stiff neck, or rash")
        if conditions:
            parts.append(f"\n💊 Since you have **{', '.join(conditions)}**, consult your doctor before taking new medication.")
        parts.append("\n*This is general guidance. Please consult a healthcare professional for persistent symptoms.*")
        return '\n'.join(parts)

    if intent == 'headache':
        parts = ["🤕 **Headache Relief Tips:**\n"]
        parts.append("Here are some immediate steps:\n")
        parts.append("1. **Hydrate** — dehydration is a common headache cause")
        parts.append("2. **Rest** in a quiet, dark room for 15–30 minutes")
        parts.append("3. **OTC pain relief** — paracetamol or ibuprofen as directed")
        parts.append("4. **Cold or warm compress** on your forehead or neck")
        parts.append("5. **Gentle massage** on temples and neck\n")
        if sleep and sleep < 7:
            parts.append(f"💤 Your average sleep is only **{sleep} hrs/night** — poor sleep is a major headache trigger. Aim for 7–9 hours.")
        if stress and stress > 5:
            parts.append(f"😰 Your stress level is **{stress}/10** — tension headaches are common with elevated stress. Try deep breathing or meditation.")
        parts.append("\n⚠️ **Seek medical attention if:** the headache is sudden and severe, comes with vision changes, or doesn't improve with rest and OTC medication.")
        return '\n'.join(parts)

    if intent == 'cold_flu':
        parts = ["🤧 **Cold & Flu Care:**\n"]
        parts.append("1. **Rest** — your immune system needs it")
        parts.append("2. **Stay warm** and drink hot fluids (tea, soup, warm water with honey)")
        parts.append("3. **Gargle** warm salt water for sore throat")
        parts.append("4. **Steam inhalation** to clear congestion")
        parts.append("5. **Vitamin C** — citrus fruits, amla, or supplements\n")
        if data.get('o2') and data['o2'] < 95:
            parts.append(f"⚠️ Your blood oxygen is **{data['o2']}%** — this is below normal (95–100%). Monitor closely and seek medical help if it drops further.")
        parts.append("\n🩺 **See a doctor if symptoms last more than 7–10 days or worsen.**")
        return '\n'.join(parts)

    if intent == 'stomach':
        parts = ["🤢 **Stomach Issue Remedies:**\n"]
        parts.append("1. **Eat light** — rice, bananas, toast (BRAT diet)")
        parts.append("2. **Stay hydrated** — ORS solution, coconut water, or clear fluids")
        parts.append("3. **Avoid** spicy, oily, and heavy food")
        parts.append("4. **Ginger tea** can help with nausea")
        parts.append("5. **Probiotics** — yogurt or probiotic supplements\n")
        parts.append("⚠️ **Consult a doctor if:** symptoms persist more than 2 days, you see blood, or experience severe pain.")
        return '\n'.join(parts)

    if intent == 'sleep':
        parts = ["😴 **Sleep Improvement Guide:**\n"]
        if sleep:
            if sleep >= 7:
                parts.append(f"Your average sleep is **{sleep} hrs/night** — that's within the healthy 7–9 hour range! 🎉\n")
                parts.append("To maintain quality sleep:")
            else:
                parts.append(f"Your average sleep is **{sleep} hrs/night** — this is below the recommended 7–9 hours. Here's how to improve:\n")
        else:
            parts.append("Here are evidence-based tips for better sleep:\n")
        parts.append("1. **Consistent schedule** — sleep and wake at the same time daily")
        parts.append("2. **No screens** 1 hour before bed (blue light disrupts melatonin)")
        parts.append("3. **Cool, dark room** — ideal temperature is 65–68°F (18–20°C)")
        parts.append("4. **Avoid caffeine** after 2 PM")
        parts.append("5. **30 mins of exercise** daily — but not right before bed")
        parts.append("6. **Relaxation techniques** — deep breathing, meditation, or reading")
        if stress and stress > 5:
            parts.append(f"\n😰 Your stress level is **{stress}/10** — high stress directly impacts sleep quality. Consider meditation apps or journaling before bed.")
        return '\n'.join(parts)

    if intent == 'exercise':
        parts = ["🏃 **Exercise & Activity Guide:**\n"]
        if steps:
            if steps >= 8000:
                parts.append(f"Great job! You're averaging **{steps:,} steps/day** — keep it up! 🎉\n")
            else:
                parts.append(f"You're currently averaging **{steps:,} steps/day** — aim for 8,000–10,000 steps daily.\n")
        parts.append("**Recommended weekly exercise:**")
        parts.append("- 150 minutes of moderate cardio (brisk walking, cycling)")
        parts.append("- 2 sessions of strength training")
        parts.append("- Daily stretching or yoga for flexibility\n")
        parts.append("**Easy ways to move more:**")
        parts.append("- Take stairs instead of elevator")
        parts.append("- 10-minute walk after meals")
        parts.append("- Stand and stretch every hour at work")
        if bmi and bmi > 25:
            parts.append(f"\n📊 Your BMI is **{bmi} ({bmi_cat})** — regular exercise combined with dietary changes can help reach a healthier range.")
        if conditions:
            parts.append(f"\n💊 Given your conditions ({', '.join(conditions)}), consult your doctor before starting an intense exercise routine.")
        return '\n'.join(parts)

    if intent == 'diet':
        parts = ["🥗 **Nutrition & Diet Tips:**\n"]
        parts.append("**Balanced daily diet should include:**")
        parts.append("- 🥦 **5 servings** of fruits and vegetables")
        parts.append("- 🥩 **Lean protein** — chicken, fish, lentils, beans")
        parts.append("- 🌾 **Whole grains** — brown rice, oats, whole wheat")
        parts.append("- 💧 **2–3 litres** of water")
        parts.append("- 🥜 **Healthy fats** — nuts, seeds, olive oil\n")
        parts.append("**Foods to limit:**")
        parts.append("- Processed foods and excess sugar")
        parts.append("- Sodium (salt) — max 5g/day")
        parts.append("- Saturated fats and fried food")
        if bmi:
            if bmi > 25:
                parts.append(f"\n📊 Your BMI is **{bmi}** — a calorie-controlled diet with smaller portions can help with weight management.")
            elif bmi < 18.5:
                parts.append(f"\n📊 Your BMI is **{bmi}** — focus on nutrient-dense, calorie-rich foods to reach a healthy weight.")
        return '\n'.join(parts)

    if intent == 'water':
        parts = ["💧 **Hydration Guide:**\n"]
        parts.append("**Daily water intake recommendation:**")
        parts.append("- Adults: **2.5–3.5 litres** (8–12 glasses)")
        parts.append("- More if you exercise or it's hot\n")
        parts.append("**Benefits of proper hydration:**")
        parts.append("- Better energy and focus")
        parts.append("- Improved digestion")
        parts.append("- Healthier skin")
        parts.append("- Better kidney function\n")
        parts.append("**Tips to drink more water:**")
        parts.append("- Keep a bottle at your desk")
        parts.append("- Set hourly reminders")
        parts.append("- Drink a glass before each meal")
        parts.append("- Add lemon or cucumber for flavour")
        return '\n'.join(parts)

    if intent == 'bmi':
        parts = ["📊 **BMI & Weight Analysis:**\n"]
        if bmi:
            parts.append(f"Your current BMI is **{bmi}** — classified as **{bmi_cat}**.\n")
            parts.append("**BMI Categories:**")
            parts.append("- Below 18.5 → Underweight")
            parts.append("- 18.5 – 24.9 → Normal ✅")
            parts.append("- 25.0 – 29.9 → Overweight")
            parts.append("- 30.0+ → Obese\n")
            if bmi >= 18.5 and bmi <= 24.9:
                parts.append("🎉 **Your BMI is in the healthy range!** Maintain your current diet and exercise habits.")
            elif bmi > 24.9:
                parts.append("**To reduce BMI:**")
                parts.append("- Create a moderate calorie deficit (500 cal/day)")
                parts.append("- Increase physical activity")
                parts.append("- Focus on whole foods, avoid processed food")
                parts.append("- Get adequate sleep (7–9 hours)")
            else:
                parts.append("**To increase BMI healthily:**")
                parts.append("- Eat more calorie-dense, nutritious foods")
                parts.append("- Strength training to build muscle")
                parts.append("- Eat more frequent meals")
        else:
            parts.append("I don't have your BMI data yet. Please log your height and weight on the Health page so I can analyze it!")
        return '\n'.join(parts)

    if intent == 'heart':
        parts = ["❤️ **Heart Health Information:**\n"]
        if hr:
            status = "normal" if 60 <= hr <= 100 else ("low" if hr < 60 else "elevated")
            parts.append(f"Your average heart rate is **{hr} bpm** — this is **{status}**.\n")
        parts.append("**Healthy heart tips:**")
        parts.append("- Regular aerobic exercise (30 min/day)")
        parts.append("- Limit sodium and saturated fats")
        parts.append("- Manage stress through meditation or yoga")
        parts.append("- Avoid smoking and limit alcohol")
        parts.append("- Monitor blood pressure regularly")
        if hr and hr > 100:
            parts.append(f"\n⚠️ Your heart rate of **{hr} bpm** is above the normal resting range (60–100 bpm). If you experience chest pain, dizziness, or shortness of breath, seek medical attention immediately.")
        return '\n'.join(parts)

    if intent == 'stress':
        parts = ["🧘 **Stress Management:**\n"]
        if stress:
            level = "manageable" if stress <= 4 else ("moderate" if stress <= 6 else "elevated")
            parts.append(f"Your current stress level is **{stress}/10** — this is **{level}**.\n")
        parts.append("**Immediate stress relief:**")
        parts.append("- **4-7-8 breathing**: Inhale 4s → Hold 7s → Exhale 8s")
        parts.append("- **Progressive muscle relaxation**: Tense and release each muscle group")
        parts.append("- **5 senses grounding**: Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste\n")
        parts.append("**Long-term strategies:**")
        parts.append("- Regular exercise (natural stress reducer)")
        parts.append("- 7–9 hours of quality sleep")
        parts.append("- Social connections and talking to someone")
        parts.append("- Limit caffeine and screen time")
        parts.append("- Consider mindfulness or meditation apps")
        if sleep and sleep < 6:
            parts.append(f"\n💤 Your sleep is only **{sleep} hrs** — poor sleep greatly amplifies stress. Prioritize sleep hygiene.")
        return '\n'.join(parts)

    if intent == 'medication':
        parts = ["💊 **Medication Information:**\n"]
        if meds:
            parts.append("**Your active medications:**")
            for m in meds:
                line = f"- **{m['name']}**"
                if m.get('dosage'):
                    line += f" ({m['dosage']})"
                if m.get('frequency'):
                    line += f" — {m['frequency']}"
                parts.append(line)
            parts.append("\n**Important reminders:**")
            parts.append("- Take medications at the same time daily")
            parts.append("- Don't skip doses or double up")
            parts.append("- Store as directed (temperature, sunlight)")
            parts.append("- Always inform your doctor about all medications")
        else:
            parts.append("You don't have any active medications recorded.")
            parts.append("If you're taking medications, you can add them on the **Health** page for better tracking and reminders.")
        parts.append("\n⚠️ *Never change dosage or stop medication without consulting your doctor.*")
        return '\n'.join(parts)

    if intent == 'risk':
        parts = ["🛡️ **Your Health Risk Assessment:**\n"]
        if risk is not None:
            emoji = "🟢" if risk <= 30 else ("🟡" if risk <= 60 else "🔴")
            parts.append(f"{emoji} Your health risk score is **{risk}/100** — **{risk_lvl}** risk.\n")
            reasons = data.get('risk_reasons', [])
            if reasons:
                parts.append("**Key factors affecting your score:**")
                for r in reasons[:5]:
                    parts.append(f"- {r}")
            parts.append("\n**How to improve your score:**")
            if sleep and sleep < 7:
                parts.append("- 💤 Improve sleep to 7–9 hours/night")
            if steps and steps < 8000:
                parts.append("- 🚶 Increase activity to 8,000+ steps/day")
            if bmi and bmi > 25:
                parts.append("- 📊 Work on reducing BMI to the 18.5–24.9 range")
            parts.append("- 🥗 Maintain a balanced diet")
            parts.append("- 🧘 Manage stress levels")
        else:
            parts.append("I don't have enough data to calculate your risk score. Please log your health vitals regularly!")
        return '\n'.join(parts)

    if intent == 'summary':
        parts = [f"📋 **Health Summary for {name}:**\n"]
        if sleep:
            parts.append(f"- 💤 Average sleep: **{sleep} hrs/night** {'✅' if sleep >= 7 else '⚠️'}")
        if steps:
            parts.append(f"- 🚶 Daily steps: **{steps:,}** {'✅' if steps >= 8000 else '⚠️'}")
        if hr:
            parts.append(f"- ❤️ Heart rate: **{hr} bpm** {'✅' if 60 <= hr <= 100 else '⚠️'}")
        if bmi:
            parts.append(f"- 📊 BMI: **{bmi}** ({bmi_cat})")
        if stress:
            parts.append(f"- 🧘 Stress: **{stress}/10**")
        if risk is not None:
            parts.append(f"- 🛡️ Risk score: **{risk}/100** ({risk_lvl})")
        if conditions:
            parts.append(f"- 💊 Conditions: {', '.join(conditions)}")
        if not any([sleep, steps, hr, bmi]):
            parts.append("I don't have much data yet! Start logging your health on the **Health** page.")
        return '\n'.join(parts)

    # ── General / unrecognized ────────────────────────────────────────────────
    parts = [f"I'd be happy to help, {name}! Here's what I can assist you with:\n"]
    parts.append("- 🤒 **Feeling unwell?** — Tell me your symptoms (e.g., \"I have a fever\")")
    parts.append("- 😴 **Sleep issues?** — Ask \"How can I improve my sleep?\"")
    parts.append("- 🏃 **Exercise advice?** — Ask \"What exercises should I do?\"")
    parts.append("- 📊 **Health overview?** — Ask \"Give me my health summary\"")
    parts.append("- 🛡️ **Risk assessment?** — Ask \"What does my risk score mean?\"\n")
    if risk is not None:
        parts.append(f"Quick update: your health risk is **{risk}/100 ({risk_lvl})**.")
    if sleep and sleep < 6:
        parts.append(f"💤 Heads up — your average sleep is only **{sleep} hrs**. Try to get more rest!")
    import os
    if not os.getenv('GEMINI_API_KEY'):
        parts.append("\n*For advanced AI-powered conversational answers, set up your Gemini API key in the .env file.*")
    else:
        parts.append("\n*Gemini AI is currently taking a little longer than usual to respond. I am providing a localized response.*")
    return '\n'.join(parts)


def _fallback_response(user_id: int, question: str, days: int) -> dict:
    """
    Generate a smart, context-aware, question-specific response
    using rule-based logic when Gemini is unavailable.
    """
    intent = _detect_intent(question)
    data = _get_user_data(user_id, days)
    text = _build_intent_response(intent, question, data)

    return {
        'response':     text,
        'source':       'fallback',
        'context_used': True,
        'intent':       intent,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

import time
_query_cache = {}

def generate_response(user_id: int, question: str, days: int = 7) -> dict:
    """
    Generate a context-aware health chatbot response.

    Parameters
    ----------
    user_id : int
        The user's database ID.
    question : str
        The user's natural language question.
    days : int
        Lookback window for health data (default 7).

    Returns
    -------
    dict with keys:
        response     : str   — the chatbot's reply (markdown)
        source       : str   — "gemini" | "fallback"
        model        : str   — Gemini model used (or "n/a")
        context_used : bool  — True if health data was included
    """
    if not question or not question.strip():
        return {
            'response': 'Please ask a question about your health.',
            'source': 'validation',
            'model': 'n/a',
            'context_used': False,
        }

    # Check cache first (cache expires after 5 minutes)
    cache_key = f"{user_id}:{question.strip().lower()}"
    cached = _query_cache.get(cache_key)
    if cached and (time.time() - cached['timestamp'] < 300):
        print(f"[chatbot] Cache hit for {user_id}")
        return cached['data']

    # ── Gather context ────────────────────────────────────────────────────────
    context = _collect_context(user_id, days)
    context_used = bool(context.strip())

    # ── Try Gemini ────────────────────────────────────────────────────────────
    import os
    from dotenv import load_dotenv
    import requests

    _BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    load_dotenv(os.path.join(_BASE_DIR, '.env'))
    api_key = os.getenv('GEMINI_API_KEY', '')

    if not api_key:
        print("[chatbot] No Gemini API Key found in environment. Falling back.")
        fallback = _fallback_response(user_id, question, days)
        fallback['response'] += "\n\n*⚠️ Missing Gemini API Key. Please add it to the .env file.*"
        return fallback

    system_prompt = _SYSTEM_PROMPT.format(context=context)
    model_name = 'gemini-2.5-flash'
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": question}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024
        }
    }

    last_error = None
    for attempt in range(3):
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if resp.status_code == 429:
                fallback = _fallback_response(user_id, question, days)
                fallback['response'] += "\n\n*⚠️ Gemini API Quota Exceeded (Error 429 Too Many Requests). Please update your API key in the .env file with a new one.*"
                return fallback
                
            resp.raise_for_status()
            data = resp.json()
            
            try:
                reply_text = data['candidates'][0]['content']['parts'][0]['text']
            except (KeyError, IndexError):
                reply_text = "I was unable to generate a response from the API."
                
            response_data = {
                'response':     reply_text,
                'source':       'gemini',
                'model':        model_name,
                'context_used': context_used,
            }
            
            # Save to cache
            _query_cache[cache_key] = {
                'timestamp': time.time(),
                'data': response_data
            }
            
            return response_data

        except Exception as e:
            last_error = e
            print(f"[chatbot] Gemini API error (attempt {attempt + 1}/3): {e}")
            import time
            time.sleep(1)

    print(f"[chatbot] Gemini API failed after 3 attempts.")
    traceback.print_exception(type(last_error), last_error, last_error.__traceback__)
    fallback = _fallback_response(user_id, question, days)
    fallback['response'] += f"\n\n*⚠️ Gemini API connection error: {last_error}. I am providing a localized response.*"
    
    # Save to cache
    _query_cache[cache_key] = {
        'timestamp': time.time(),
        'data': fallback
    }
    
    return fallback


# ─────────────────────────────────────────────────────────────────────────────
# Persist interaction (optional — call from route after responding)
# ─────────────────────────────────────────────────────────────────────────────

def save_interaction(user_id: int, query: str, response: str,
                     interaction_type: str = 'general') -> bool:
    """
    Save a chat Q&A pair to the chatbot_interactions table.
    Returns True on success, False on failure.
    """
    try:
        execute_sql('''
            INSERT INTO chatbot_interactions
            (user_id, query, response, interaction_type)
            VALUES (:uid, :query, :response, :itype)
        ''', {'uid': user_id, 'query': query, 'response': response,
              'itype': interaction_type}, commit=True)
        return True
    except Exception as e:
        print(f"[chatbot] Failed to save interaction: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# CLI quick-test
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    q   = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else 'How is my health looking?'

    print(f'\n── Chatbot: user_id={uid} ──')
    print(f'Q: {q}\n')

    result = generate_response(uid, q)
    print(f'Source: {result["source"]}')
    print(f'Context used: {result["context_used"]}')
    print(f'\nA:\n{result["response"]}')
