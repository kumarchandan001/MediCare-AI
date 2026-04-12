"""
app.py — Application entry point
─────────────────────────────────
Creates the Flask app, registers all Blueprints, and defines only the
handful of routes that don't belong to a feature module:
  /        (home)
  /home    (redirect)

All feature routes live in routes/:
  routes/auth.py        → /login  /signup  /logout
  routes/health.py      → /health_monitor  /api/health-*  /api/bmi  ...
  routes/prediction.py  → /predict  /api/disease-predictions

All business / DB logic lives in services/health_service.py.
All AI / ML logic lives in ai/prediction.py.
"""

from flask import Flask, render_template, session, redirect, url_for, jsonify, request
import os
import logging
from datetime import timedelta
from dotenv import load_dotenv
from sqlalchemy import text
from flask_wtf.csrf import CSRFProtect
from utils.trend_analysis import analyze_trends
from services.alert_service import generate_alerts
from utils.risk_engine import calculate_risk
from services.habit_coach import generate_habit_tips

# ── Load environment variables ────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# ── Validate critical env vars ────────────────────────────────────────────────
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError(
        "❌ DATABASE_URL not set. "
        "Add DATABASE_URL=postgresql://user:pass@host:port/dbname to your .env file."
    )

# Render / Heroku provide postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

# ── App factory ───────────────────────────────────────────────────────────────
app = Flask(__name__)

# Security: Refuse to start without a real SECRET_KEY
_secret = os.getenv('SECRET_KEY')
if not _secret or _secret == 'health_assistant_fallback_key':
    raise RuntimeError("❌ SECRET_KEY not set securely in .env.")
app.secret_key = _secret

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=31)
app.config['SESSION_TYPE'] = 'filesystem'

# Session Security
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
# In production with HTTPS, use SESSION_COOKIE_SECURE = True
app.config['SESSION_COOKIE_SECURE'] = (os.getenv('FLASK_ENV') == 'production')

# Enable CSRF Protection globally
csrf = CSRFProtect(app)

# ── Database Configuration (PostgreSQL) ───────────────────────────────────────
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_timeout': 30,
    'pool_recycle': 1800,
    'pool_pre_ping': True,
}

from models import db
from flask_migrate import Migrate

db.init_app(app)
migrate = Migrate(app, db)

# ── Verify DB connection at startup ──────────────────────────────────────────
with app.app_context():
    try:
        db.session.execute(text('SELECT 1'))
        logger.info("✅ Database connection successful (%s)", DATABASE_URL.split('@')[-1])
        # Auto-create any new tables (e.g. google_fit_tokens) without
        # touching existing ones — safe no-op for tables that already exist.
        db.create_all()
    except Exception as e:
        logger.critical("❌ Database connection FAILED: %s", e)
        logger.critical("Check DATABASE_URL in .env and ensure PostgreSQL is running")
        raise SystemExit(1)

# ── Register Blueprints ───────────────────────────────────────────────────────
from routes.auth_otp   import auth_bp          # OTP-based auth (replaces old auth.py)
from routes.health     import health_bp
from routes.prediction import prediction_bp
from routes.alerts     import alerts_bp
from routes.habit_coach import habit_coach_bp
from routes.admin      import admin_bp
from routes.onboarding import onboarding_bp
from routes.api.v1     import api_v1            # NEW: Versioned API layer
from routes.google_auth import google_auth_bp   # Google Fit OAuth

app.register_blueprint(auth_bp)
app.register_blueprint(health_bp)
app.register_blueprint(prediction_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(habit_coach_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(onboarding_bp)
app.register_blueprint(google_auth_bp)           # /auth/google/*
app.register_blueprint(api_v1)                  # NEW: /api/v1/*

# Exempt API v1 routes from CSRF (they use session auth + CORS headers)
csrf.exempt(api_v1)

# ── User Context (injected into all templates) ─────────────────────────
@app.context_processor
def inject_user():
    from models.user import User
    from models import db
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(User, user_id)
        if user:
            return {'current_user': user, 'is_authenticated': True}
    
    # Mock fallback for layout if not logged in
    class Guest:
        id = None
        username = "Guest"
        name = "Guest"
        first_name = "Guest"
        blood_type = ""
        profile_completed = False
        is_admin = False
    return {'current_user': Guest(), 'is_authenticated': False}

# ── Core routes ───────────────────────────────────────────────────────────────
@app.route('/')
def landing():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return render_template('landing.html')

@app.route('/dashboard', endpoint='home')
def home():
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    user_id = session.get('user_id')
    
    from models.user import User
    from models import db
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        return redirect(url_for('auth.login'))
        
    if not user.profile_completed:
        return redirect(url_for('onboarding.onboarding_page'))

    # Generate intelligent insights — with graceful fallbacks
    try:
        insights = analyze_trends(user_id)
    except Exception:
        insights = ["Start logging health data to see AI insights."]

    try:
        alerts = generate_alerts(user_id)
    except Exception:
        alerts = []

    try:
        risk = calculate_risk(user_id)
    except Exception:
        risk = {"score": 0, "level": "unknown", "reasons": []}

    # Prompt for daily log if missing (once per day per session)
    needs_daily_log = False
    try:
        from datetime import date
        from models.health_record import DailyHealthLog
        today_str = str(date.today())
        today_log = DailyHealthLog.query.filter_by(user_id=user_id, log_date=date.today()).first()
        if not today_log and session.get('daily_prompt_date') != today_str:
            needs_daily_log = True
            session['daily_prompt_date'] = today_str
    except Exception as e:
        pass

    # Pop any pending Google Fit message (set by OAuth redirect flow)
    gfit_msg = session.pop('gfit_msg', None)

    return render_template('index.html', insights=insights, alerts=alerts, risk=risk,
                           needs_daily_log=needs_daily_log, gfit_msg=gfit_msg)

@app.route('/home')
def home_redirect():
    return redirect(url_for('home'))

@app.route('/health-check')
def health_check():
    return jsonify({
        'status': 'MediCare AI Running',
        'database': 'PostgreSQL',
        'user_id': session.get('user_id')
    })

# ── Security Middleware & Error Handling ─────────────────────────────────────
@app.after_request
def set_secure_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    # Important: HSTS is generally added in production (e.g. nginx) but can go here:
    if os.getenv('FLASK_ENV') == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # CORS headers for API routes
    if request.path.startswith('/api/'):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRFToken'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        response.headers['X-API-Version'] = '1.0'

    return response

@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api/') or request.is_json:
        from utils.api_response import not_found as api_not_found
        return api_not_found('Endpoint')
    return render_template('landing.html'), 404

@app.errorhandler(405)
def method_not_allowed(error):
    if request.path.startswith('/api/') or request.is_json:
        from utils.api_response import error as api_error
        return api_error('Method not allowed', code=405, error_type='METHOD_NOT_ALLOWED')
    return "Method not allowed", 405

@app.errorhandler(500)
def internal_error(error):
    logger.exception("Internal Server Error: %s", error)
    if request.path.startswith('/api/') or request.is_json:
        from utils.api_response import server_error as api_500
        return api_500('An unexpected internal error occurred.')
    return "Something went wrong. Please try again later.", 500

@app.errorhandler(Exception)
def unhandled_exception(e):
    logger.exception("Unhandled Exception: %s", e)
    if request.path.startswith('/api/') or request.is_json:
        from utils.api_response import server_error as api_500
        return api_500('An unexpected error occurred.', exc=e)
    return "Something went wrong. Please try again later.", 500

# ── Server entry point ────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    is_dev = os.getenv('FLASK_ENV') == 'development'
    app.run(
        host='0.0.0.0',
        port=port,
        debug=is_dev,
        use_reloader=is_dev,
    )
