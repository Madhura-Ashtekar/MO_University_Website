# Meal Outpost Athletics Platform

A React/Vite admin workspace backed by FastAPI/SQLModel that tracks athletic food deliveries from intake to dispatch while keeping Stripe billing and Nash delivery integrations safely sandboxed by default.

## Architecture at a glance

- **Frontend**: React (Vite) SPA that fetches workflows, admin queue items, and execution edits via `apiFetch`. Tabs surface workflow/state detail, admin queue actions, and billing review.
- **Backend**: FastAPI exposes REST endpoints (`/workflows`, `/admin/workflows/{id}/advance`, `/executions/{id}`, `/admin/resolve-tbd`, `/health`, etc.) while storing data through SQLModel on SQLite (dev) or PostgreSQL (prod). Business logic enforces the workflow state machine (submitted → feasibility → billing prep → dispatch) with validation gates for TBD meals and Nash delivery info.
- **Database**: SQLModel models mirror the UI intent: `Team`, `Workflow`, `Execution`, `AdminQueueItem`. `Execution` captures fulfillment, financials, dietary counts, and all Nash dispatch/address/contact/window metadata.
- **Integrations**: Stripe and Nash wrappers live in `backend/app/integrations.py`. Environment flags enable sandbox or stub modes, ensuring no real invoices/deliveries unless explicitly configured.

## Tech stack

| Layer | Key dependencies |
|-------|------------------|
| Frontend | React 19, Vite, `react-router-dom`, lightweight hooks + custom `apiFetch`, `format.js` helpers |
| Backend | FastAPI, SQLModel/SQLite, `httpx`, `stripe`, Pydantic v2 schemas + background logic for classifying intake rows |
| Dev tooling | Python 3.11, `uvicorn --reload`, npm/yarn for Vite dev server, `.env` driven config |

## Workflows

1. **Intake**: CSV/AI parser stores trips as `Workflow` records with intake rows (`Execution` entries). Diet/defaults seeded from `Team`.
2. **Feasibility Review**: Admin queue items ensure TBD rows are resolved before billing. Workflows track state transitions (`feasibility_approve`, `billing_prep`, `dispatch_approve`).
3. **Billing Prep**: Finance fields (`unit_price`, `cost`, `margin`) are editable via the billing review modal. Stripe customer/invoice IDs live on `Team`/`Workflow`.
4. **Dispatch**: Nash delivery payload is composed from `Execution` pickup/dropoff addresses, contacts, and windows. On dispatch approval, backend either logs a stub or POSTs `/deliveries`, saving `nash_delivery_id`.
5. **Health & Sandbox**: `/health` reports sandbox flags (Stripe/Nash) so the frontend can display a persistent “Sandbox Mode” banner.

## Key data models

- `Team`: identity, conference/division, dietary defaults, optional `stripe_customer_id`.
- `Workflow`: links to a team, stores travel metadata (trip type, game info), status, and optional `stripe_invoice_id`.
- `Execution`: date/time, fulfillment type, headcount, dietary counts, financials, and the full Nash delivery/contact metadata (`pickup_`, `delivery_`, `delivery_window_*`, `nash_delivery_id`).
- `AdminQueueItem`: workflow/execution references plus queue `type`/`status` for admin actions (feasibility, billing_prep, dispatch approval, TBD resolution).

## Users & journeys

- **Nutritionist**: uploads itineraries, reviews scheduled workflows, resolves intake questions, and collaborates on dietary counts. Directly interacts with the modal/table views in `Workflows.jsx`.
- **Admin**: processes admin queue items, advances workflows through the state machine, manages billing details, ensures Nash delivery metadata is complete before dispatch.
- **Student (future)**: will eventually view meals from the same dataset; current backend already records the necessary execution history.

## Trade-offs & current limitations

- **Sandbox-first**: Stripe/Nash calls default to stubbed/log-only behavior unless sandbox API keys are provided. Live mode is locked behind `STRIPE_SANDBOX=false` and the accompanying guardrails to prevent accidental production charges/deliveries.
- **Simplified modeling**: Single SQLModel tables keep the MVP focused, but this means historical audit tables and granular access control are not yet implemented.
- **Frontend state**: `useState` + localStorage (`mo_state_v2`) handle caching instead of a heavier global store, trading off reactivity for simplicity.
- **Dispatch-only Nash scope**: Only the `/deliveries` endpoint is required today; other Nash resources (organizations, webhooks) remain untouched to reduce permissions/surface area.

## Getting started

1. **Backend**
   ```bash
   cd backend
   python3.11 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   The Vite app proxies to `http://localhost:8000` (see `api/client.js`); keep both servers running during testing.

## Environment variables

Place sensitive keys in `.env` at the repo root. Key entries:

```
DATABASE_URL=sqlite:///./mealoutpost.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
STRIPE_SECRET_KEY=sk_test_...
STRIPE_SANDBOX=true
NASH_API_KEY=<sandbox key>
NASH_SANDBOX=true
```

- Leaving `STRIPE_SECRET_KEY` empty disables Stripe and keeps billing in stub mode.
- Nash dispatching only triggers if `NASH_API_KEY` exists—otherwise the payload is logged but not sent.

## Related docs

- `docs/architecture.md` for the detailed system diagram and state machine.
- `docs/sandbox-plan.md` outlines how the external integrations stay safe in test mode.
- `docs/user-flows.md` (if present) for UI/UX-specific journeys.

Feel free to expand this README with deployment instructions, testing commands, or links to new docs as the product matures.
