"""
demo_seed.py
─────────────
Seed the PostgreSQL database with demo health data for user_id=1.
Uses SQLAlchemy ORM via Flask app context instead of sqlite3.

Run with:  python demo_seed.py
"""

import os
import sys
import json
import random
from datetime import datetime, timedelta

# Ensure project root on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app import app

def seed_data():
    with app.app_context():
        from models import db
        from sqlalchemy import text

        USER_ID = 1
        TODAY   = datetime.now()

        print("\n🌱 Starting demo seed for PostgreSQL...\n")

        # ── Health monitoring (14 days) ───────────────────────────────────────
        print("  Seeding health_monitoring...")
        for i in range(14):
            ts = TODAY - timedelta(days=i, hours=random.randint(0, 8))
            bp = json.dumps({'systolic': random.randint(110, 135), 'diastolic': random.randint(70, 90)})
            db.session.execute(text('''
                INSERT INTO health_monitoring
                (user_id, heart_rate, oxygen_level, body_temperature,
                 glucose_level, stress_level, sleep_hours, blood_pressure, created_at)
                VALUES (:uid, :hr, :o2, :temp, :gl, :stress, :sleep, :bp, :ts)
            '''), {
                'uid':    USER_ID,
                'hr':     random.randint(62, 95),
                'o2':     random.uniform(95, 100),
                'temp':   round(random.uniform(97.5, 99.2), 1),
                'gl':     random.randint(75, 130),
                'stress': random.randint(2, 8),
                'sleep':  round(random.uniform(5.5, 8.5), 1),
                'bp':     bp,
                'ts':     ts,
            })

        # ── Activity tracking (14 days) ────────────────────────────────────────
        print("  Seeding activity_tracking...")
        for i in range(14):
            day = (TODAY - timedelta(days=i)).date()
            db.session.execute(text('''
                INSERT INTO activity_tracking
                (user_id, activity_type, activity_date, steps, calories_burned, duration)
                VALUES (:uid, :atype, :day, :steps, :cal, :dur)
            '''), {
                'uid':   USER_ID,
                'atype': random.choice(['walking', 'running', 'cycling', 'yoga']),
                'day':   day,
                'steps': random.randint(3000, 12000),
                'cal':   random.randint(150, 500),
                'dur':   random.randint(20, 90),
            })

        # ── BMI history ────────────────────────────────────────────────────────
        print("  Seeding bmi_history...")
        for i in range(4):
            ts = TODAY - timedelta(weeks=i)
            bmi = round(random.uniform(21.5, 27.0), 1)
            cat = 'Normal' if bmi < 25 else 'Overweight'
            db.session.execute(text('''
                INSERT INTO bmi_history (user_id, bmi, weight, height, bmi_category, recorded_at)
                VALUES (:uid, :bmi, :weight, :height, :cat, :ts)
            '''), {
                'uid':    USER_ID,
                'bmi':    bmi,
                'weight': round(bmi * 1.75 * 1.75, 1),
                'height': 1.75,
                'cat':    cat,
                'ts':     ts,
            })

        # ── Medication history ─────────────────────────────────────────────────
        print("  Seeding medication_history...")
        meds = ['Metformin 500mg', 'Vitamin D3', 'Omega-3']
        for i in range(10):
            ts = TODAY - timedelta(days=i)
            db.session.execute(text('''
                INSERT INTO medication_history
                (user_id, medication_name, status, taken_at)
                VALUES (:uid, :med, :status, :ts)
            '''), {
                'uid':    USER_ID,
                'med':    random.choice(meds),
                'status': random.choice(['taken', 'taken', 'skipped']),
                'ts':     ts,
            })

        # ── Disease predictions ────────────────────────────────────────────────
        print("  Seeding disease_predictions...")
        diseases = [
            ('Common Cold', json.dumps(['fever', 'cough', 'runny nose']), 0.78),
            ('Migraine',    json.dumps(['headache', 'nausea', 'light sensitivity']), 0.85),
        ]
        for disease, symptoms, score in diseases:
            db.session.execute(text('''
                INSERT INTO disease_predictions
                (user_id, symptoms, predicted_disease, confidence_score,
                 recommendations, saved_to_records, predicted_at)
                VALUES (:uid, :sym, :disease, :score, :rec, :saved, :ts)
            '''), {
                'uid':     USER_ID,
                'sym':     symptoms,
                'disease': disease,
                'score':   score,
                'rec':     'Stay hydrated. Rest. Consult your doctor if symptoms worsen.',
                'saved':   True,
                'ts':      TODAY - timedelta(days=random.randint(1, 7)),
            })

        db.session.commit()
        print("\n✅ Demo seed completed successfully!\n")

if __name__ == '__main__':
    seed_data()
