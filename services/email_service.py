"""
services/email_service.py
──────────────────────────
Production email service for MediCare AI.
Handles OTP and password-reset emails via SMTP with HTML templates.

Supports:
  - Gmail SMTP (with App Password)
  - Any SMTP provider
  - Graceful fallback (logs OTP to console in dev)
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# SMTP CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

def _get_smtp_config() -> dict:
    """Load SMTP configuration from environment variables."""
    return {
        "server":     os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        "port":       int(os.getenv("MAIL_PORT", 587)),
        "use_tls":    os.getenv("MAIL_USE_TLS", "True").lower() == "true",
        "username":   os.getenv("MAIL_USERNAME", ""),
        "password":   os.getenv("MAIL_PASSWORD", ""),
        "from_name":  os.getenv("MAIL_FROM_NAME", "MediCare AI"),
        "from_email": os.getenv("MAIL_FROM_EMAIL", "noreply@medicare-ai.com"),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LOW-LEVEL SEND
# ═══════════════════════════════════════════════════════════════════════════════

def _send_email(to_email: str, subject: str,
                html_body: str, text_body: str = "") -> bool:
    """
    Send an email via SMTP.
    Returns True on success, False on failure.
    Falls back to console log in development / when SMTP is unconfigured.
    """
    cfg = _get_smtp_config()

    # ── Development fallback ─────────────────────────────────────────────────
    if not cfg["username"] or os.getenv("FLASK_ENV") == "development":
        logger.warning("[DEV EMAIL] To: %s | Subject: %s\n%s", to_email, subject, text_body)
        print(
            f"\n{'='*50}\n"
            f"[DEV EMAIL] To: {to_email}\n"
            f"Subject: {subject}\n"
            f"{text_body}\n"
            f"{'='*50}\n"
        )
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"{cfg['from_name']} <{cfg['from_email']}>"
        msg["To"]      = to_email
        msg["X-Mailer"] = "MediCare AI Mailer 1.0"

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(cfg["server"], cfg["port"], timeout=15) as server:
            server.ehlo()
            if cfg["use_tls"]:
                server.starttls()
                server.ehlo()
            if cfg["username"] and cfg["password"]:
                server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())

        logger.info("Email sent to %s: %s", to_email, subject)
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error("SMTP Auth failed — check MAIL_USERNAME / MAIL_PASSWORD: %s", e)
        return False
    except smtplib.SMTPException as e:
        logger.error("SMTP error sending to %s: %s", to_email, e)
        return False
    except (OSError, TimeoutError, ConnectionError) as e:
        logger.error("Network/connection error sending email to %s: %s", to_email, e)
        return False
    except Exception as e:
        logger.error("Unexpected email send failure to %s: %s", to_email, e)
        return False


# ═══════════════════════════════════════════════════════════════════════════════
# OTP EMAIL BUILDER
# ═══════════════════════════════════════════════════════════════════════════════

def _otp_html(otp: str, purpose: str, expiry_minutes: int) -> tuple:
    """Build OTP email HTML and plain-text bodies."""

    purpose_labels = {
        "signup":         "Account Verification",
        "login":          "Login Verification",
        "reset_password": "Password Reset",
    }
    purpose_msgs = {
        "signup":
            "Welcome to MediCare AI! Please verify your email address "
            "to activate your account.",
        "login":
            "You're signing in to MediCare AI. "
            "Use this OTP to complete your login.",
        "reset_password":
            "You requested a password reset for your MediCare AI account. "
            "Use this OTP to proceed.",
    }
    label = purpose_labels.get(purpose, "Verification")
    msg   = purpose_msgs.get(purpose, "")

    html = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MediCare AI — {label}</title>
</head>
<body style="margin:0;padding:0;
  font-family:'Segoe UI',Arial,sans-serif;
  background:#F0F4F8;color:#0F172A;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr><td align="center" style="padding:32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="max-width:520px;background:#FFFFFF;border-radius:20px;
    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr><td style="background:linear-gradient(135deg,#0A7A6B 0%,#085E52 100%);
      padding:32px 40px;text-align:center;">
      <table width="100%" role="presentation"><tr><td align="center">
        <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);
          border-radius:14px;display:inline-block;line-height:52px;
          font-size:24px;text-align:center;margin-bottom:16px;">🏥</div>
        <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:800;
          letter-spacing:-0.03em;">MediCare AI</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);
          font-size:14px;">{label}</p>
      </td></tr></table>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:40px 40px 32px;">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">
        {msg}
      </p>
      <!-- OTP Box -->
      <div style="background:#F0FDF9;border:2px solid #B2DFDB;
        border-radius:16px;padding:28px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:700;
          text-transform:uppercase;letter-spacing:0.1em;color:#6B8E89;">
          Your Verification Code</p>
        <div style="font-size:44px;font-weight:900;letter-spacing:0.18em;
          color:#0A7A6B;font-family:'Courier New',monospace;
          line-height:1;margin:4px 0;">{otp}</div>
        <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">
          ⏱ Expires in <strong>{expiry_minutes} minutes</strong></p>
      </div>
      <!-- Warning -->
      <div style="background:#FFF8E1;border-left:4px solid #F59E0B;
        border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">
          ⚠️ Never share this OTP with anyone. MediCare AI will never
          ask for your OTP via phone or chat.</p>
      </div>
      <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">
        If you didn't request this, please ignore this email.
        Your account remains secure.</p>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;
      padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94A3B8;">
        MediCare AI — Your Health, Our Priority<br>
        <span style="color:#CBD5E1;">This is an automated email.
        Please do not reply.</span></p>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>"""

    text = (
        f"MediCare AI — {label}\n\n"
        f"{msg}\n\n"
        f"Your OTP: {otp}\n\n"
        f"This OTP expires in {expiry_minutes} minutes.\n\n"
        f"Never share this OTP with anyone.\n"
        f"If you did not request this, ignore this email.\n"
    )
    return html, text


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def send_otp_email(to_email: str, otp: str, purpose: str,
                   expiry_minutes: int = 10) -> bool:
    """
    Send an OTP verification email.

    Args:
        to_email: Recipient email address
        otp: Plain-text 6-digit OTP
        purpose: 'signup' | 'login' | 'reset_password'
        expiry_minutes: OTP validity duration

    Returns True if sent (or logged in dev mode).
    """
    subjects = {
        "signup":         "MediCare AI — Verify Your Email",
        "login":          "MediCare AI — Your Login OTP",
        "reset_password": "MediCare AI — Password Reset OTP",
    }
    subject = subjects.get(purpose, "MediCare AI — OTP")
    html, text = _otp_html(otp, purpose, expiry_minutes)
    return _send_email(to_email, subject, html, text)


def send_reset_success_email(to_email: str, username: str) -> bool:
    """Notify user that their password was changed successfully."""
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#F0F4F8;
  margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:32px 16px;">
  <table width="100%" style="max-width:520px;background:#fff;
    border-radius:20px;overflow:hidden;
    box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0A7A6B,#085E52);
      padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">
        Password Changed ✓</h1>
    </td></tr>
    <tr><td style="padding:40px;">
      <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
        Hi <strong>{username}</strong>, your MediCare AI password was
        successfully updated.</p>
      <div style="background:#D1FAE5;border-radius:12px;padding:16px;
        margin-bottom:20px;border-left:4px solid #10B981;">
        <p style="margin:0;color:#065F46;font-size:14px;">
          ✓ Your account is secure. You can now login with your new password.
        </p>
      </div>
      <p style="color:#94A3B8;font-size:13px;margin:0;line-height:1.6;">
        If you did not make this change, contact support immediately.</p>
    </td></tr>
    <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;
      padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94A3B8;">
        MediCare AI — Security Notification</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""

    return _send_email(
        to_email,
        "MediCare AI — Password Changed Successfully",
        html,
        f"Hi {username}, your password was successfully updated. "
        f"If you did not do this, contact support immediately."
    )
