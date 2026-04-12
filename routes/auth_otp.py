"""
routes/auth_otp.py
────────────────────
Complete OTP authentication routes for MediCare AI.

Routes:
  GET/POST /signup           — Register + send OTP
  GET/POST /verify-email     — Verify signup OTP
  GET/POST /login            — Login + send OTP (2FA)
  GET/POST /verify-login     — Verify login OTP
  GET/POST /forgot-password  — Request reset OTP
  GET/POST /verify-reset-otp — Verify reset OTP
  GET/POST /reset-password   — Set new password via token
  POST     /resend-otp       — Resend OTP with cooldown
  GET      /logout           — Clear session
  POST     /guest-login      — Guest (demo) login bypass
"""

import logging
from flask import (
    Blueprint, render_template, request,
    redirect, url_for, session, flash, jsonify,
)
from werkzeug.security import (
    generate_password_hash, check_password_hash,
)
from models import db
from models.user import User
from services.otp_service import (
    create_otp, verify_otp, OTP_EXPIRY_MINUTES,
    check_rate_limit, get_resend_cooldown,
    check_brute_force, record_login_attempt,
    unlock_account, create_reset_token,
    verify_reset_token, consume_reset_token,
)
from services.email_service import (
    send_otp_email, send_reset_success_email,
)

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_ip() -> str:
    return (
        request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        .split(",")[0].strip()
    )

def _get_ua() -> str:
    return request.headers.get("User-Agent", "")[:500]

def _find_user_by_email(email: str):
    """Fetch user by email (case-insensitive)."""
    return User.query.filter_by(email=email.lower().strip()).first()

def _find_user_by_login(identifier: str):
    """Find user by email OR username (case-insensitive)."""
    identifier = identifier.strip()
    if "@" in identifier:
        return User.query.filter_by(email=identifier.lower()).first()
    return User.query.filter(
        db.func.lower(User.username) == identifier.lower()
    ).first()

def _start_session(user):
    """Set session variables for a logged-in user."""
    session.clear()
    session.permanent = True
    session["user_id"]   = user.id
    session["username"]  = user.username
    session["email"]     = user.email
    session["language"]  = getattr(user, "language", "en")
    session["logged_in"] = True


# ═══════════════════════════════════════════════════════════════════════════════
# SIGNUP
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if session.get("logged_in"):
        return redirect(url_for("home"))

    if request.method == "GET":
        return render_template("auth/signup.html")

    # ── Collect form data ────────────────────────────────────────────────────
    username = request.form.get("username", "").strip()
    email    = request.form.get("email", "").strip().lower()
    phone    = request.form.get("phone", "").strip()
    password = request.form.get("password", "")
    confirm  = request.form.get("confirm_password", "")

    # ── Validation ───────────────────────────────────────────────────────────
    errors = {}
    if not username or len(username) < 3:
        errors["username"] = "Username must be at least 3 characters"
    if len(username) > 50:
        errors["username"] = "Username max 50 characters"
    if not email or "@" not in email:
        errors["email"] = "Valid email required"
    if len(password) < 8:
        errors["password"] = "Password must be at least 8 characters"
    if password != confirm:
        errors["confirm_password"] = "Passwords do not match"
    if password and not any(c.isupper() for c in password):
        errors.setdefault("password", "Password must include an uppercase letter")
    if password and not any(c.isdigit() for c in password):
        errors.setdefault("password", "Password must include a number")

    # Validate phone (optional but if provided must be valid)
    import re
    if phone and not re.match(r'^[+]?[\d\s\-]{7,20}$', phone):
        errors["phone"] = "Enter a valid phone number (e.g. +91 9876543210)"

    if errors:
        return render_template("auth/signup.html", errors=errors,
                               form_data={"username": username, "email": email, "phone": phone})

    # ── Check existing user ──────────────────────────────────────────────────
    existing = _find_user_by_email(email)
    if existing:
        if existing.email_verified:
            return render_template("auth/signup.html",
                errors={"email": "This email is already registered. Please login instead."},
                form_data={"username": username, "phone": phone})
        else:
            # Unverified — re-send OTP
            user_id = existing.id
    else:
        # Check username uniqueness
        if User.query.filter_by(username=username).first():
            return render_template("auth/signup.html",
                errors={"username": "Username already taken"},
                form_data={"email": email, "phone": phone})

        # Create unverified user
        pw_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)
        new_user = User(
            username=username, email=email,
            phone=phone or None,
            password_hash=pw_hash,
            email_verified=False, profile_completed=False,
        )
        db.session.add(new_user)
        db.session.commit()
        user_id = new_user.id

    # ── Send OTP ─────────────────────────────────────────────────────────────
    otp, err = create_otp(email, "signup", ip_address=_get_ip(), user_agent=_get_ua())
    if err:
        return render_template("auth/signup.html", errors={"general": err},
                               form_data={"username": username, "email": email, "phone": phone})

    try:
        email_sent = send_otp_email(email, otp, "signup", OTP_EXPIRY_MINUTES)
    except Exception as e:
        logger.error("SMTP failure during signup for %s: %s", email, e)
        email_sent = False

    if not email_sent:
        logger.error("Failed to send OTP email to %s", email)
        return render_template("auth/signup.html",
            errors={"general": "Could not send verification email. Please check your email address or try again later."},
            form_data={"username": username, "email": email, "phone": phone})

    session["otp_email"]   = email
    session["otp_purpose"] = "signup"
    session["otp_user_id"] = user_id

    return redirect(url_for("auth.verify_email"))


# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY EMAIL (Signup OTP)
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/verify-email", methods=["GET", "POST"])
def verify_email():
    email = session.get("otp_email")
    if not email or session.get("otp_purpose") != "signup":
        return redirect(url_for("auth.signup"))

    cooldown = get_resend_cooldown(email, "signup")

    if request.method == "GET":
        return render_template("auth/verify_otp.html",
            email=email, purpose="signup",
            purpose_label="Account Verification",
            cooldown=cooldown,
            next_url=url_for("auth.verify_email"))

    # Gather the 6 OTP digits from individual fields
    otp_input = "".join(
        request.form.get(f"otp_{i}", "") for i in range(1, 7)
    ).strip()

    if len(otp_input) != 6 or not otp_input.isdigit():
        return render_template("auth/verify_otp.html",
            email=email, purpose="signup",
            purpose_label="Account Verification",
            cooldown=cooldown,
            error="Please enter the complete 6-digit OTP.",
            next_url=url_for("auth.verify_email"))

    success, err = verify_otp(email, otp_input, "signup")
    if not success:
        return render_template("auth/verify_otp.html",
            email=email, purpose="signup",
            purpose_label="Account Verification",
            cooldown=get_resend_cooldown(email, "signup"),
            error=err,
            next_url=url_for("auth.verify_email"))

    # Mark email as verified
    user_id = session.get("otp_user_id")
    user = db.session.get(User, user_id)
    if user:
        user.email_verified = True
        db.session.commit()
        _start_session(user)

    # Clean up OTP session keys
    for key in ("otp_email", "otp_purpose", "otp_user_id"):
        session.pop(key, None)

    flash("🎉 Email verified! Welcome to MediCare AI!", "success")

    # Redirect to onboarding if profile not completed
    if user and not user.profile_completed:
        return redirect(url_for("onboarding.onboarding_page"))
    return redirect(url_for("home"))


# ═══════════════════════════════════════════════════════════════════════════════
# LOGIN
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("logged_in"):
        return redirect(url_for("home"))

    if request.method == "GET":
        return render_template("auth/login.html")

    identifier = request.form.get("identifier", "").strip()
    password   = request.form.get("password", "")
    login_mode = request.form.get("login_mode", "otp")  # 'otp' or 'direct'

    if not identifier or not password:
        return render_template("auth/login.html",
            error="Username/email and password are required.",
            form_data={"identifier": identifier})

    ip = _get_ip()

    # ── Brute-force check ────────────────────────────────────────────────────
    locked, wait_mins = check_brute_force(identifier)
    if locked:
        return render_template("auth/login.html",
            error=(
                f"Account temporarily locked due to too many failed attempts. "
                f"Please wait {wait_mins} minute{'s' if wait_mins != 1 else ''} "
                f"or reset your password."
            ),
            form_data={"identifier": identifier}, show_forgot=True)

    # ── Find user by email OR username ────────────────────────────────────────
    user = _find_user_by_login(identifier)
    if not user:
        record_login_attempt(identifier, False, ip)
        return render_template("auth/login.html",
            error="Invalid username/email or password.",
            form_data={"identifier": identifier})

    # ── Email verified? ──────────────────────────────────────────────────────
    if not user.email_verified:
        return render_template("auth/login.html",
            error="Email not verified. Please check your inbox or sign up again.",
            form_data={"identifier": identifier})

    # ── Verify password ──────────────────────────────────────────────────────
    password_matched = False
    if user.password_hash:
        if check_password_hash(user.password_hash, password):
            password_matched = True
        else:
            # Legacy SHA-256 check
            import hashlib as _hl
            if user.password_hash == _hl.sha256(password.encode("utf-8")).hexdigest():
                password_matched = True
                user.password_hash = generate_password_hash(password)
                db.session.commit()

    if not password_matched:
        record_login_attempt(identifier, False, ip)
        locked2, wait2 = check_brute_force(identifier)
        if locked2:
            return render_template("auth/login.html",
                error=f"Account locked for {wait2} min due to failed attempts.",
                form_data={"identifier": identifier}, show_forgot=True)
        return render_template("auth/login.html",
            error="Invalid username/email or password.",
            form_data={"identifier": identifier})

    # ── DIRECT LOGIN (password-only, no OTP) ─────────────────────────────────
    if login_mode == "direct":
        record_login_attempt(user.email, True, ip)
        unlock_account(user.email)
        _start_session(user)
        flash("Welcome back! Logged in successfully.", "success")
        if user.is_admin:
            return redirect("/admin/dashboard")
        if not user.profile_completed:
            return redirect(url_for("onboarding.onboarding_page"))
        return redirect(url_for("home"))

    # ── OTP LOGIN (2FA) ──────────────────────────────────────────────────────
    otp, err = create_otp(user.email, "login", ip_address=ip, user_agent=_get_ua())
    if err:
        return render_template("auth/login.html",
            error=err, form_data={"identifier": identifier})

    try:
        email_sent = send_otp_email(user.email, otp, "login")
    except Exception as e:
        logger.error("SMTP failure during login OTP for %s: %s", user.email, e)
        email_sent = False

    if not email_sent:
        return render_template("auth/login.html",
            error="Could not send OTP email. Please try the direct sign-in option or try again later.",
            form_data={"identifier": identifier})

    session["otp_email"]   = user.email
    session["otp_purpose"] = "login"
    session["otp_user_id"] = user.id

    return redirect(url_for("auth.verify_login"))


# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY LOGIN OTP
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/verify-login", methods=["GET", "POST"])
def verify_login():
    email = session.get("otp_email")
    if not email or session.get("otp_purpose") != "login":
        return redirect(url_for("auth.login"))

    cooldown = get_resend_cooldown(email, "login")

    if request.method == "GET":
        return render_template("auth/verify_otp.html",
            email=email, purpose="login",
            purpose_label="Login Verification",
            cooldown=cooldown,
            next_url=url_for("auth.verify_login"))

    otp_input = "".join(
        request.form.get(f"otp_{i}", "") for i in range(1, 7)
    ).strip()

    if len(otp_input) != 6 or not otp_input.isdigit():
        return render_template("auth/verify_otp.html",
            email=email, purpose="login",
            purpose_label="Login Verification",
            cooldown=cooldown, error="Enter the complete 6-digit OTP.",
            next_url=url_for("auth.verify_login"))

    success, err = verify_otp(email, otp_input, "login")
    if not success:
        record_login_attempt(email, False, _get_ip())
        return render_template("auth/verify_otp.html",
            email=email, purpose="login",
            purpose_label="Login Verification",
            cooldown=get_resend_cooldown(email, "login"),
            error=err,
            next_url=url_for("auth.verify_login"))

    # ✅ Success
    user = _find_user_by_email(email)
    if not user:
        return redirect(url_for("auth.login"))

    record_login_attempt(email, True, _get_ip())
    unlock_account(email)
    _start_session(user)

    for key in ("otp_email", "otp_purpose", "otp_user_id"):
        session.pop(key, None)

    flash("Welcome back! Logged in securely.", "success")

    # Redirect based on role / onboarding
    if user.is_admin:
        return redirect("/admin/dashboard")
    if not user.profile_completed:
        return redirect(url_for("onboarding.onboarding_page"))
    return redirect(url_for("home"))


# ═══════════════════════════════════════════════════════════════════════════════
# FORGOT PASSWORD
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "GET":
        return render_template("auth/forgot_password.html")

    email = request.form.get("email", "").strip().lower()
    if not email or "@" not in email:
        return render_template("auth/forgot_password.html",
            error="Please enter a valid email address.",
            form_data={"email": email})

    # Always show success (prevent email enumeration)
    user = _find_user_by_email(email)
    if user and user.email_verified:
        allowed, used, wait = check_rate_limit(email, "reset_password", _get_ip())
        if allowed:
            otp, err = create_otp(email, "reset_password",
                ip_address=_get_ip(), user_agent=_get_ua())
            if otp:
                try:
                    send_otp_email(email, otp, "reset_password")
                except Exception as e:
                    logger.error("SMTP failure during password reset for %s: %s", email, e)
                session["reset_email"]   = email
                session["reset_user_id"] = user.id
                session["reset_step"]    = "otp"

    # Always redirect — no indication of whether the email exists
    session.setdefault("reset_email", email)
    return redirect(url_for("auth.verify_reset_otp"))


# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY RESET OTP
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/verify-reset-otp", methods=["GET", "POST"])
def verify_reset_otp():
    email = session.get("reset_email")
    if not email:
        return redirect(url_for("auth.forgot_password"))

    cooldown = get_resend_cooldown(email, "reset_password")

    if request.method == "GET":
        return render_template("auth/verify_otp.html",
            email=email, purpose="reset_password",
            purpose_label="Password Reset",
            cooldown=cooldown,
            next_url=url_for("auth.verify_reset_otp"),
            is_reset=True)

    otp_input = "".join(
        request.form.get(f"otp_{i}", "") for i in range(1, 7)
    ).strip()

    if len(otp_input) != 6 or not otp_input.isdigit():
        return render_template("auth/verify_otp.html",
            email=email, purpose="reset_password",
            purpose_label="Password Reset",
            cooldown=cooldown,
            error="Enter the complete 6-digit OTP.",
            next_url=url_for("auth.verify_reset_otp"),
            is_reset=True)

    success, err = verify_otp(email, otp_input, "reset_password")
    if not success:
        return render_template("auth/verify_otp.html",
            email=email, purpose="reset_password",
            purpose_label="Password Reset",
            cooldown=get_resend_cooldown(email, "reset_password"),
            error=err,
            next_url=url_for("auth.verify_reset_otp"),
            is_reset=True)

    # OTP valid — create secure reset token
    user_id = session.get("reset_user_id")
    if not user_id:
        user = _find_user_by_email(email)
        user_id = user.id if user else None

    if not user_id:
        return redirect(url_for("auth.forgot_password"))

    plain_token, err = create_reset_token(user_id, email, _get_ip())
    if err:
        return render_template("auth/verify_otp.html",
            email=email, purpose="reset_password",
            purpose_label="Password Reset", cooldown=0,
            error="Failed to create reset token. Please try again.",
            next_url=url_for("auth.verify_reset_otp"),
            is_reset=True)

    session["reset_step"] = "new_password"
    return redirect(url_for("auth.reset_password", token=plain_token))


# ═══════════════════════════════════════════════════════════════════════════════
# RESET PASSWORD
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/reset-password", methods=["GET", "POST"])
def reset_password():
    token = request.args.get("token") or request.form.get("token", "")

    if not token:
        flash("Invalid or missing reset link.", "error")
        return redirect(url_for("auth.forgot_password"))

    token_data, err = verify_reset_token(token)
    if err:
        return render_template("auth/reset_password.html",
            error=err, invalid_token=True)

    if request.method == "GET":
        return render_template("auth/reset_password.html",
            token=token, email=token_data.get("email", ""))

    # ── POST — update password ───────────────────────────────────────────────
    new_password = request.form.get("password", "")
    confirm      = request.form.get("confirm_password", "")

    errors = {}
    if len(new_password) < 8:
        errors["password"] = "Password must be at least 8 characters"
    if new_password and not any(c.isupper() for c in new_password):
        errors.setdefault("password", "Must include an uppercase letter")
    if new_password and not any(c.isdigit() for c in new_password):
        errors.setdefault("password", "Must include a number")
    if new_password != confirm:
        errors["confirm_password"] = "Passwords do not match"

    if errors:
        return render_template("auth/reset_password.html",
            token=token, email=token_data.get("email", ""), errors=errors)

    # Update password
    user = db.session.get(User, token_data["user_id"])
    if user:
        user.password_hash = generate_password_hash(
            new_password, method="pbkdf2:sha256", salt_length=16)
        db.session.commit()

    # Consume token (single-use)
    consume_reset_token(token_data["id"])

    # Unlock account
    unlock_account(token_data["email"])

    # Clear reset session
    for key in ("reset_email", "reset_user_id", "reset_step"):
        session.pop(key, None)

    # Confirmation email
    if user:
        send_reset_success_email(token_data["email"], user.username)

    flash("✓ Password reset successfully! Please login with your new password.", "success")
    return redirect(url_for("auth.login"))


# ═══════════════════════════════════════════════════════════════════════════════
# RESEND OTP
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    """Handles resend for signup, login, and reset_password OTPs."""
    purpose = request.form.get("purpose", "")

    email_map = {
        "signup":         session.get("otp_email"),
        "login":          session.get("otp_email"),
        "reset_password": session.get("reset_email"),
    }
    email = email_map.get(purpose)

    if not email:
        flash("Session expired. Please start over.", "error")
        return redirect(url_for("auth.login"))

    # Cooldown check
    cooldown = get_resend_cooldown(email, purpose)
    if cooldown > 0:
        flash(f"Please wait {cooldown}s before requesting another OTP.", "warning")
        next_map = {
            "signup":         "auth.verify_email",
            "login":          "auth.verify_login",
            "reset_password": "auth.verify_reset_otp",
        }
        return redirect(url_for(next_map.get(purpose, "auth.login")))

    # Create and send new OTP
    otp, err = create_otp(email, purpose, ip_address=_get_ip(), user_agent=_get_ua())
    if err:
        flash(err, "error")
    else:
        try:
            sent = send_otp_email(email, otp, purpose)
        except Exception as e:
            logger.error("SMTP failure during resend for %s: %s", email, e)
            sent = False
        flash("OTP resent! Check your email." if sent else "Failed to send email. Try again.",
              "success" if sent else "error")

    next_map = {
        "signup":         "auth.verify_email",
        "login":          "auth.verify_login",
        "reset_password": "auth.verify_reset_otp",
    }
    return redirect(url_for(next_map.get(purpose, "auth.login")))


# ═══════════════════════════════════════════════════════════════════════════════
# GUEST LOGIN (Demo — bypasses OTP)
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/guest-login", methods=["POST"])
def guest_login():
    """
    Log in as demo_user — bypasses OTP completely.
    The demo user is auto-created if missing.
    """
    from services.user_service import get_or_create_demo_user
    demo_id = get_or_create_demo_user()

    user = db.session.get(User, demo_id)
    if not user:
        flash("Guest login unavailable.", "error")
        return redirect(url_for("auth.login"))

    # Ensure demo user is verified so nothing blocks
    if not user.email_verified:
        user.email_verified = True
        db.session.commit()

    _start_session(user)
    flash("Welcome, Guest! Some features may be limited.", "info")

    if not user.profile_completed:
        return redirect(url_for("onboarding.onboarding_page"))
    return redirect(url_for("home"))


# ═══════════════════════════════════════════════════════════════════════════════
# LANGUAGE UPDATE (migrated from old auth.py)
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/api/update_language", methods=["POST"])
def update_language():
    data = request.json or {}
    lang = data.get("lang")
    if lang not in ("en", "ta", "hi"):
        return jsonify({"success": False, "error": "Invalid language"}), 400

    user_id = session.get("user_id")
    if user_id:
        user = db.session.get(User, user_id)
        if user:
            user.language = lang
            db.session.commit()

    session["language"] = lang
    return jsonify({"success": True})


# ═══════════════════════════════════════════════════════════════════════════════
# LOGOUT
# ═══════════════════════════════════════════════════════════════════════════════

@auth_bp.route("/logout")
def logout():
    session.clear()
    flash("Logged out successfully.", "info")
    return redirect(url_for("auth.login"))
