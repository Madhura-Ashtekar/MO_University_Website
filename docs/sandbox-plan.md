# Sandbox Strategy — No Real Orders, No Real Money

## Principle
Every external integration must be sandboxed by default. A developer or tester should be able to run the entire flow — create trip, approve feasibility, prep billing, dispatch — without triggering real charges, real deliveries, or real notifications.

---

## 1. Stripe Sandbox

### Current State
- `stripe_customer_id` on Team model (field exists, unused)
- `stripe_invoice_id` on Workflow model (field exists, unused)
- No Stripe SDK imported, no API calls made

### Plan

| Component | Implementation |
|-----------|---------------|
| **API Key** | Use `sk_test_*` key from Stripe Dashboard → Test Mode |
| **Env var** | `STRIPE_SECRET_KEY` — backend reads from `.env`; default = empty (billing disabled) |
| **Sandbox flag** | `STRIPE_SANDBOX=true` in `.env` — when true, all invoice creation uses test mode |
| **Customer creation** | On team create, call `stripe.Customer.create()` with test key → returns `cus_test_*` |
| **Invoice flow** | At billing_prep stage: create draft invoice via `stripe.Invoice.create(customer=cus_test_*)` |
| **Line items** | Each MO execution → `stripe.InvoiceItem.create(unit_amount=unit_price*100, quantity=headcount)` |
| **Finalization** | At dispatch_approve: `stripe.Invoice.finalize_invoice()` — sends test email to Stripe test email |
| **Webhook** | Optional: Stripe webhook for `invoice.paid` → update workflow financial status |

### Safety Guards
- Backend refuses to start with `sk_live_*` unless `STRIPE_LIVE_MODE_CONFIRMED=true` is explicitly set
- All Stripe calls wrapped in try/except — failure does NOT block workflow advancement
- Frontend shows "[SANDBOX]" badge next to any Stripe-related UI when `STRIPE_SANDBOX=true`
- Test card numbers: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)

### Files to Change
- `backend/app/main.py` — add Stripe calls at billing_prep and dispatch_approve
- `backend/app/models.py` — add `stripe_invoice_status` to Workflow
- `backend/requirements.txt` — add `stripe>=8.0`
- `frontend/src/pages/Workflows.jsx` — show invoice ID + status in billing review
- `.env.example` — document all Stripe env vars

---

## 2. Nash Sandbox

### Current State
- Nash delivery fields exist on Execution model (pickup/delivery address, contacts, windows)
- Validation at dispatch_approve: checks all addresses filled
- Dispatch action: logs payload to console, does NOT make HTTP call
- Comment: `# TODO: replace stub with real POST to Nash /deliveries API`

### Plan

| Component | Implementation |
|-----------|---------------|
| **API Key** | `NASH_API_KEY` — from Nash sandbox dashboard |
| **Env var** | `NASH_API_KEY` in `.env`; default = empty (dispatch logged only) |
| **Sandbox flag** | `NASH_SANDBOX=true` — uses Nash sandbox endpoint |
| **Base URL** | Sandbox: `https://sandbox.nash.io/api/v1` / Prod: `https://api.nash.io/api/v1` |
| **Dispatch call** | At dispatch_approve: `POST /deliveries` with execution payloads |
| **Tracking** | Nash returns `delivery_id` → store on Execution model |
| **Webhook** | Nash webhook for status updates (picked_up, delivered, cancelled) |

### Safety Guards
- If `NASH_API_KEY` is empty → skip HTTP call, log payload, return success (current behavior)
- If `NASH_SANDBOX=true` → only allow sandbox base URL; reject if someone sets prod URL
- All Nash calls wrapped in try/except — failure does NOT block status update
- Frontend shows "[SANDBOX]" badge when `NASH_SANDBOX=true`
- Add `nash_delivery_id` and `nash_status` to Execution model for tracking

### Files to Change
- `backend/app/main.py` — replace Nash stub with conditional HTTP call
- `backend/app/models.py` — add `nash_delivery_id`, `nash_status` to Execution
- `backend/requirements.txt` — add `httpx` for async HTTP calls
- `.env.example` — document Nash env vars

---

## 3. Environment Configuration

### `.env.example`

```env
# === Database ===
DATABASE_URL=sqlite:///mo_athletics.db
# For production: postgresql://user:pass@host:5432/mo_athletics

# === CORS ===
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# === Stripe ===
STRIPE_SECRET_KEY=          # sk_test_* for sandbox, sk_live_* for production
STRIPE_SANDBOX=true         # safety: must be explicitly set to false for prod
# STRIPE_LIVE_MODE_CONFIRMED=true  # uncomment ONLY for production

# === Nash ===
NASH_API_KEY=               # empty = stub mode (log only, no HTTP calls)
NASH_SANDBOX=true           # safety: uses sandbox endpoint
NASH_BASE_URL=              # auto-set based on NASH_SANDBOX; override for custom

# === App ===
LOG_LEVEL=INFO
```

### Backend Startup Validation

```python
# On startup, validate environment safety
if STRIPE_SECRET_KEY.startswith("sk_live_") and not STRIPE_LIVE_MODE_CONFIRMED:
    raise RuntimeError("DANGER: Live Stripe key detected without STRIPE_LIVE_MODE_CONFIRMED=true")

if NASH_API_KEY and not NASH_SANDBOX and NASH_BASE_URL contains "api.nash.io":
    logger.warning("PRODUCTION Nash endpoint active — all dispatches will create real deliveries")
```

---

## 4. Sandbox Mode Indicator (Frontend)

When any sandbox flag is active, show a persistent banner:

```
+------------------------------------------------------------------+
| ⚡ SANDBOX MODE — No real charges or deliveries will be created  |
+------------------------------------------------------------------+
|  [Dashboard]  [Schedules]  [Teams]  [Budget]                     |
```

This banner:
- Reads from `/health` endpoint (which will include `{ sandbox: true }`)
- Shows in amber/orange at the very top of the app
- Cannot be dismissed — always visible in sandbox mode
- Disappears only when all integrations are in production mode

---

## 5. What Happens When You Place an Order (Sandbox)

| Step | What happens | Real impact |
|------|-------------|-------------|
| Jane creates a trip | Rows saved to local DB | None |
| Admin approves feasibility | Status changes in DB | None |
| Admin preps billing | Stripe test invoice created (if key set) | Test email to Stripe sandbox |
| Admin dispatches | Nash sandbox delivery created (if key set) | Sandbox delivery logged |
| Student views meal | Reads from local DB | None |
| Student rates meal | Saved to local DB | None |

**Zero real-world side effects in sandbox mode.**
