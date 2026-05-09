"""
Email service for MediCare AI.
Sends OTP and password reset emails via SMTP (Gmail App Password).
Uses aiosmtplib for async sending.
Falls back to console logging only if MAIL_USERNAME is not configured.
"""
import logging
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from core.config import settings

logger = logging.getLogger(__name__)


def _get_from_address() -> str:
    """
    Gmail rejects sending from addresses that don't match the account.
    Always use MAIL_USERNAME as the From address when configured.
    Falls back to MAIL_FROM for non-Gmail SMTP servers.
    """
    if settings.MAIL_USERNAME and "gmail" in settings.MAIL_SERVER.lower():
        return settings.MAIL_USERNAME
    return settings.MAIL_FROM or settings.MAIL_USERNAME


# ═══════════════════════════════════════════
# ASYNC EMAIL SENDER (core engine)
# ═══════════════════════════════════════════

async def _send_email_async(
    to_email: str,
    subject: str,
    html_body: str,
) -> bool:
    """Send email via aiosmtplib. Returns True on success."""
    try:
        import aiosmtplib

        from_addr = _get_from_address()

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MediCare AI <{from_addr}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.MAIL_SERVER,
            port=settings.MAIL_PORT,
            start_tls=True,
            username=settings.MAIL_USERNAME,
            password=settings.MAIL_PASSWORD,
            local_hostname="localhost",
        )
        logger.info(f"✅ Email sent to {to_email} — {subject}")
        return True

    except Exception as e:
        logger.error(f"❌ Email send failed to {to_email}: {e}")
        return False


def _send_email_sync(
    to_email: str,
    subject: str,
    html_body: str,
) -> bool:
    """Synchronous fallback using smtplib."""
    try:
        import smtplib

        from_addr = _get_from_address()

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"MediCare AI <{from_addr}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT,
                         local_hostname="localhost") as server:
            server.ehlo("localhost")
            server.starttls()
            server.ehlo("localhost")
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.send_message(msg)

        logger.info(f"✅ Email sent (sync) to {to_email} — {subject}")
        return True

    except Exception as e:
        logger.error(f"❌ Email send (sync) failed to {to_email}: {e}")
        return False


# ═══════════════════════════════════════════
# HTML TEMPLATES
# ═══════════════════════════════════════════

def _otp_email_html(otp: str, label: str, expire_minutes: int) -> str:
    """Premium dark-themed OTP email template."""
    otp_chars = "".join(
        f'<span style="display:inline-block;width:42px;height:54px;'
        f'background:#131A16;border:1.5px solid rgba(0,245,200,0.25);'
        f'border-radius:10px;font-size:28px;font-weight:900;'
        f'line-height:54px;text-align:center;color:#00F5C8;'
        f"font-family:'SF Mono','Fira Code',monospace;"
        f'margin:0 3px;">{c}</span>'
        for c in otp
    )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#050807;font-family:'Outfit','Segoe UI',Arial,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#080C0B;
                    border-radius:20px;border:1px solid rgba(255,255,255,0.06);
                    overflow:hidden;">
            <!-- Header gradient bar -->
            <div style="height:4px;background:linear-gradient(90deg,#00F5C8,#00D4AA,#00B894);"></div>

            <div style="padding:40px 32px;">
                <!-- Logo -->
                <div style="text-align:center;margin-bottom:32px;">
                    <div style="display:inline-block;background:linear-gradient(135deg,#00F5C8,#00D4AA);
                                width:52px;height:52px;border-radius:14px;line-height:52px;
                                text-align:center;font-size:24px;">
                        💚
                    </div>
                    <h1 style="font-size:22px;font-weight:900;color:#ffffff;margin:12px 0 0;
                               letter-spacing:-0.02em;">
                        MediCare AI
                    </h1>
                    <p style="color:rgba(255,255,255,0.35);font-size:10px;
                              text-transform:uppercase;letter-spacing:0.15em;margin-top:4px;">
                        HEALTH INTELLIGENCE
                    </p>
                </div>

                <!-- Purpose badge -->
                <div style="text-align:center;margin-bottom:24px;">
                    <span style="display:inline-block;background:rgba(0,245,200,0.08);
                                 color:#00F5C8;font-size:11px;font-weight:700;
                                 padding:6px 16px;border-radius:100px;
                                 text-transform:uppercase;letter-spacing:0.1em;
                                 border:1px solid rgba(0,245,200,0.15);">
                        {label}
                    </span>
                </div>

                <!-- Message -->
                <p style="color:rgba(255,255,255,0.6);font-size:15px;
                          text-align:center;margin:0 0 28px;line-height:1.5;">
                    Use this verification code to complete your {label.lower()}:
                </p>

                <!-- OTP Code -->
                <div style="background:#0D1210;border:1px solid rgba(255,255,255,0.06);
                            border-radius:16px;padding:28px 20px;text-align:center;
                            margin-bottom:28px;">
                    {otp_chars}
                </div>

                <!-- Expiry warning -->
                <div style="background:rgba(0,245,200,0.04);border:1px solid rgba(0,245,200,0.1);
                            border-radius:12px;padding:14px 20px;text-align:center;
                            margin-bottom:24px;">
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px;">
                        ⏱ This code expires in <strong style="color:#00F5C8;">{expire_minutes} minutes</strong>
                    </p>
                </div>

                <!-- Security notice -->
                <p style="color:rgba(255,255,255,0.25);font-size:11px;
                          text-align:center;line-height:1.6;margin:0;">
                    🔒 Never share this code with anyone.<br>
                    MediCare AI team will never ask for your OTP.
                </p>
            </div>

            <!-- Footer -->
            <div style="background:#060908;padding:20px 32px;
                        border-top:1px solid rgba(255,255,255,0.04);">
                <p style="color:rgba(255,255,255,0.2);font-size:10px;
                          text-align:center;margin:0;line-height:1.6;">
                    © 2026 MediCare AI — AI-Powered Health Intelligence<br>
                    This is an automated message. Please do not reply.
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def _reset_success_html(username: str) -> str:
    """Password reset success email template."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#050807;font-family:'Outfit','Segoe UI',Arial,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#080C0B;
                    border-radius:20px;border:1px solid rgba(255,255,255,0.06);
                    overflow:hidden;">
            <div style="height:4px;background:linear-gradient(90deg,#00F5C8,#00D4AA,#00B894);"></div>
            <div style="padding:40px 32px;text-align:center;">
                <div style="display:inline-block;background:linear-gradient(135deg,#00F5C8,#00D4AA);
                            width:52px;height:52px;border-radius:14px;line-height:52px;
                            font-size:24px;margin-bottom:16px;">
                    ✅
                </div>
                <h1 style="font-size:22px;font-weight:900;color:#ffffff;margin:0 0 8px;">
                    Password Reset Successful
                </h1>
                <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;margin:16px 0 24px;">
                    Hi <strong style="color:#00F5C8;">{username}</strong>, your password has been
                    reset successfully. You can now login with your new password.
                </p>
                <div style="background:rgba(255,170,0,0.06);border:1px solid rgba(255,170,0,0.15);
                            border-radius:12px;padding:14px 20px;">
                    <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">
                        ⚠️ If you didn't make this change, please contact support immediately.
                    </p>
                </div>
            </div>
            <div style="background:#060908;padding:20px 32px;
                        border-top:1px solid rgba(255,255,255,0.04);">
                <p style="color:rgba(255,255,255,0.2);font-size:10px;
                          text-align:center;margin:0;">
                    © 2026 MediCare AI — AI-Powered Health Intelligence
                </p>
            </div>
        </div>
    </body>
    </html>
    """


# ═══════════════════════════════════════════
# PUBLIC API (called from router)
# ═══════════════════════════════════════════

async def send_otp_email(
    to_email: str,
    otp: str,
    purpose: str,
    expire_minutes: int = 10,
) -> bool:
    """
    Send OTP email (async). If MAIL_USERNAME is not set, logs to console.
    This is the primary API — always use this from async route handlers.
    """
    purpose_labels = {
        "signup": "Account Verification",
        "login": "Login Verification",
        "reset_password": "Password Reset",
    }
    label = purpose_labels.get(purpose, "Verification")

    # ── Dev fallback: log to console ──────
    if not settings.MAIL_USERNAME:
        logger.info(
            f"\n{'='*50}\n"
            f"  📧 OTP EMAIL ({label})\n"
            f"  To: {to_email}\n"
            f"  OTP: {otp}\n"
            f"  Expires: {expire_minutes} minutes\n"
            f"  ⚠️  Set MAIL_USERNAME & MAIL_PASSWORD in .env to send real emails\n"
            f"{'='*50}\n"
        )
        return True

    # ── Production: send real email ───────
    subject = f"MediCare AI — {label} Code"
    html = _otp_email_html(otp, label, expire_minutes)
    return await _send_email_async(to_email, subject, html)


async def send_reset_success_email(to_email: str, username: str) -> bool:
    """Send password reset success confirmation (async)."""
    if not settings.MAIL_USERNAME:
        logger.info(
            f"\n{'='*50}\n"
            f"  📧 PASSWORD RESET SUCCESS\n"
            f"  To: {to_email}\n"
            f"  User: {username}\n"
            f"{'='*50}\n"
        )
        return True

    subject = "MediCare AI — Password Reset Successful"
    html = _reset_success_html(username)
    return await _send_email_async(to_email, subject, html)
