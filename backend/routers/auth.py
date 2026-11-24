import random
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
try:
    from .. import admin_config
except ImportError:
    import admin_config

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── In-memory OTP store { email: (otp_code, expiry_unix_timestamp) } ─────────
_otp_store: dict[str, tuple[str, float]] = {}
_otp_verified: dict[str, bool] = {}     # track that OTP was successfully verified


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


# ── Email helper ──────────────────────────────────────────────────────────────

def _send_otp_email(to_email: str, otp: str) -> bool:
    subject = "🔐 TeluguRL Admin — Your OTP"
    html = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;
                padding:32px;background:#f8f8ff;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;">🎬</span>
        <h2 style="margin:8px 0 4px;color:#4f46e5;font-size:20px;">TeluguRL Admin Portal</h2>
        <p style="color:#6b7280;font-size:13px;margin:0;">Password Reset Request</p>
      </div>
      <div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 2px 12px rgba(79,70,229,.08);">
        <p style="color:#374151;font-size:14px;margin:0 0 16px;">Your One-Time Password is valid for <strong>10 minutes</strong>:</p>
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;
                    padding:20px;text-align:center;letter-spacing:12px;">
          <span style="color:#fff;font-size:36px;font-weight:900;">{otp}</span>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:16px 0 0;text-align:center;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    </div>
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = admin_config.SMTP_FROM_EMAIL
        msg["To"]      = to_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(admin_config.SMTP_HOST, admin_config.SMTP_PORT) as srv:
            srv.ehlo()
            srv.starttls()
            srv.login(admin_config.SMTP_FROM_EMAIL, admin_config.SMTP_APP_PASSWORD)
            srv.sendmail(admin_config.SMTP_FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"[SMTP ERROR] {exc}")
        return False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest):
    """Validate admin email + password. Returns a session token on success."""
    if req.email.strip() != admin_config.ADMIN_EMAIL or req.password != admin_config.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"success": True, "message": "Login successful"}


@router.post("/forgot-password")
def forgot_password(req: ForgotRequest):
    """Generate a 6-digit OTP and email it to the admin address."""
    if req.email.strip() != admin_config.ADMIN_EMAIL:
        raise HTTPException(status_code=404, detail="Email not registered as admin")

    otp    = str(random.randint(100000, 999999))
    expiry = time.time() + 600   # 10 minutes

    _otp_store[req.email] = (otp, expiry)
    _otp_verified[req.email] = False

    ok = _send_otp_email(req.email, otp)
    if not ok:
        return {
            "success": False,
            "message": "Could not send OTP email. Configure SMTP settings and try again.",
        }

    return {"success": True, "message": "OTP sent to your email"}


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    """Verify the 6-digit OTP. Must be called before reset-password."""
    entry = _otp_store.get(req.email)
    if not entry:
        raise HTTPException(status_code=400, detail="No OTP requested for this email")

    otp_code, expiry = entry
    if time.time() > expiry:
        _otp_store.pop(req.email, None)
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if req.otp.strip() != otp_code:
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    _otp_verified[req.email] = True
    return {"success": True, "message": "OTP verified"}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    """Reset the admin password. Requires prior OTP verification."""
    if not _otp_verified.get(req.email):
        raise HTTPException(status_code=403, detail="OTP not verified for this email")

    entry = _otp_store.get(req.email)
    if not entry:
        raise HTTPException(status_code=400, detail="Session expired. Please start over.")

    otp_code, expiry = entry
    if time.time() > expiry or req.otp.strip() != otp_code:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Update in-memory config (persists for the server process lifetime)
    admin_config.ADMIN_PASSWORD = req.new_password

    _otp_store.pop(req.email, None)
    _otp_verified.pop(req.email, None)

    return {"success": True, "message": "Password updated successfully"}
