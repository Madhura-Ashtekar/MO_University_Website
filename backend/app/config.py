import os
import logging

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# --- Stripe ---
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_SANDBOX = os.getenv("STRIPE_SANDBOX", "true").lower() == "true"

# --- Nash ---
NASH_API_KEY = os.getenv("NASH_API_KEY", "").strip()
NASH_SANDBOX = os.getenv("NASH_SANDBOX", "true").lower() == "true"
NASH_BASE_URL = (
    "https://sandbox-api.nash.io/api/v1"
    if NASH_SANDBOX
    else "https://api.nash.io/api/v1"
)

# --- LLM (Gemini preferred, OpenAI fallback) ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

# --- Google Places (address resolution) ---
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "").strip()


def validate_env():
    """Run on startup. Refuse to boot with live keys unless explicitly confirmed."""
    if STRIPE_SECRET_KEY.startswith("sk_live_") or STRIPE_SECRET_KEY.startswith("rk_live_"):
        raise RuntimeError(
            "DANGER: Live Stripe key detected with STRIPE_SANDBOX=true. "
            "Set STRIPE_SANDBOX=false if you intend to use production billing."
        )

    if STRIPE_SECRET_KEY and STRIPE_SANDBOX:
        if not (STRIPE_SECRET_KEY.startswith("sk_test_") or STRIPE_SECRET_KEY.startswith("rk_test_")):
            logger.warning("Stripe key does not look like a test key — are you sure this is correct?")
        else:
            logger.info("Stripe SANDBOX mode active (test key)")

    if not STRIPE_SECRET_KEY:
        logger.info("Stripe disabled — no STRIPE_SECRET_KEY set (stub mode)")

    if NASH_API_KEY and NASH_SANDBOX:
        logger.info("Nash SANDBOX mode active — using %s", NASH_BASE_URL)
    elif NASH_API_KEY and not NASH_SANDBOX:
        logger.warning("Nash PRODUCTION mode — real deliveries will be created!")
    else:
        logger.info("Nash disabled — no NASH_API_KEY set (log-only mode)")


def get_sandbox_status():
    """Returns dict for /health and frontend banner."""
    return {
        "stripe_enabled": bool(STRIPE_SECRET_KEY),
        "stripe_sandbox": STRIPE_SANDBOX,
        "nash_enabled": bool(NASH_API_KEY),
        "nash_sandbox": NASH_SANDBOX,
        "sandbox_mode": STRIPE_SANDBOX or NASH_SANDBOX or (not STRIPE_SECRET_KEY and not NASH_API_KEY),
        "llm_enabled": bool(GEMINI_API_KEY or OPENAI_API_KEY),
        "llm_provider": "gemini" if GEMINI_API_KEY else ("openai" if OPENAI_API_KEY else None),
    }
