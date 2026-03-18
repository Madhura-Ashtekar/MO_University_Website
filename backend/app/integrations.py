"""Stripe and Nash integration wrappers. Safe for sandbox and stub modes."""

import logging

import stripe
import httpx

from .config import (
    STRIPE_SECRET_KEY,
    STRIPE_SANDBOX,
    NASH_API_KEY,
    NASH_BASE_URL,
)

logger = logging.getLogger(__name__)

# Configure Stripe SDK
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


# ── Stripe ──────────────────────────────────────────────────

def stripe_create_customer(team_name: str, school_name: str) -> str | None:
    """Create a Stripe customer for a team. Returns customer ID or None."""
    if not STRIPE_SECRET_KEY:
        logger.info("[STRIPE STUB] Would create customer for %s", team_name)
        return None
    try:
        customer = stripe.Customer.create(
            name=f"{team_name} — {school_name}",
            metadata={"team_name": team_name, "school_name": school_name, "sandbox": str(STRIPE_SANDBOX)},
        )
        logger.info("[STRIPE] Created customer %s for %s", customer.id, team_name)
        return customer.id
    except stripe.StripeError as e:
        logger.error("[STRIPE] Failed to create customer: %s", e)
        return None


def stripe_create_invoice(
    customer_id: str,
    workflow_name: str,
    line_items: list[dict],
) -> str | None:
    """Create a draft invoice with line items. Returns invoice ID or None.

    line_items: [{"description": str, "unit_amount_cents": int, "quantity": int}]
    """
    if not STRIPE_SECRET_KEY:
        logger.info("[STRIPE STUB] Would create invoice for %s with %d items", workflow_name, len(line_items))
        return None
    if not customer_id:
        logger.warning("[STRIPE] No customer_id — skipping invoice for %s", workflow_name)
        return None
    try:
        invoice = stripe.Invoice.create(
            customer=customer_id,
            collection_method="send_invoice",
            days_until_due=30,
            metadata={"workflow_name": workflow_name, "sandbox": str(STRIPE_SANDBOX)},
        )
        for item in line_items:
            stripe.InvoiceItem.create(
                customer=customer_id,
                invoice=invoice.id,
                description=item["description"],
                unit_amount=item["unit_amount_cents"],
                quantity=item["quantity"],
                currency="usd",
            )
        logger.info("[STRIPE] Created draft invoice %s with %d items", invoice.id, len(line_items))
        return invoice.id
    except stripe.StripeError as e:
        logger.error("[STRIPE] Failed to create invoice: %s", e)
        return None


def stripe_finalize_invoice(invoice_id: str) -> bool:
    """Finalize (send) an invoice. Returns success bool."""
    if not STRIPE_SECRET_KEY:
        logger.info("[STRIPE STUB] Would finalize invoice %s", invoice_id)
        return True
    if not invoice_id:
        return False
    try:
        stripe.Invoice.finalize_invoice(invoice_id)
        logger.info("[STRIPE] Finalized invoice %s", invoice_id)
        return True
    except stripe.StripeError as e:
        logger.error("[STRIPE] Failed to finalize invoice: %s", e)
        return False


# ── Nash ────────────────────────────────────────────────────

def nash_create_delivery(execution_payload: dict) -> str | None:
    """Create a delivery via Nash API. Returns delivery_id or None.

    execution_payload: {
        "execution_id", "date", "time", "headcount",
        "pickup_address", "delivery_address",
        "pickup_contact_name", "pickup_contact_phone",
        "delivery_contact_name", "delivery_contact_phone",
        "delivery_window_start", "delivery_window_end",
    }
    """
    if not NASH_API_KEY:
        logger.info("[NASH STUB] Would create delivery: %s", execution_payload.get("execution_id"))
        return None
    try:
        resp = httpx.post(
            f"{NASH_BASE_URL}/deliveries",
            headers={
                "Authorization": f"Bearer {NASH_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "pickup": {
                    "address": execution_payload.get("pickup_address", ""),
                    "contact": {
                        "name": execution_payload.get("pickup_contact_name", ""),
                        "phone": execution_payload.get("pickup_contact_phone", ""),
                    },
                },
                "dropoff": {
                    "address": execution_payload.get("delivery_address", ""),
                    "contact": {
                        "name": execution_payload.get("delivery_contact_name", ""),
                        "phone": execution_payload.get("delivery_contact_phone", ""),
                    },
                },
                "scheduled_at": f"{execution_payload.get('date', '')}T{execution_payload.get('time', '12:00')}:00",
                "metadata": {
                    "execution_id": execution_payload.get("execution_id"),
                    "headcount": execution_payload.get("headcount"),
                },
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        data = resp.json()
        delivery_id = data.get("id") or data.get("delivery_id")
        logger.info("[NASH] Created delivery %s for execution %s", delivery_id, execution_payload.get("execution_id"))
        return delivery_id
    except (httpx.HTTPError, Exception) as e:
        logger.error("[NASH] Failed to create delivery: %s", e)
        return None
