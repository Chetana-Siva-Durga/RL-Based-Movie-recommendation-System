import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Admin credentials can be overridden without editing source code.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# ──────────────────────────────────────────────────────────────────────────────
# Gmail SMTP for OTP emails
#
# IMPORTANT: Google disabled plain-password SMTP access.
# You must create a Gmail App Password:
#   1. Go to https://myaccount.google.com/security
#   2. Enable 2-Step Verification (if not already)
#   3. Search "App passwords" → Create one for "Mail" → Copy the 16-char code
#   4. Paste that 16-char code into SMTP_APP_PASSWORD below
# ──────────────────────────────────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_APP_PASSWORD = os.getenv("SMTP_APP_PASSWORD", "")
