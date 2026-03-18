# Meal Outpost Athletics — System Architecture

## High-Level Overview

```
+------------------------------------------------------------+
|                        CLIENTS                             |
|                                                            |
|  +------------------+  +---------------+  +-----------+    |
|  | Nutritionist     |  | Admin         |  | Student   |    |
|  | (React SPA)      |  | (React SPA)   |  | (Future)  |    |
|  | - Create trips   |  | - Review queue |  | - Order   |    |
|  | - View calendar  |  | - Set pricing  |  | - Track   |    |
|  | - Track status   |  | - Dispatch     |  | - Dietary  |    |
|  | - Manage teams   |  | - TBD resolve  |  |           |    |
|  +--------+---------+  +-------+-------+  +-----+-----+    |
|           |                    |                |           |
+-----------|--------------------|-----------------|-----------+
            |                    |                |
            v                    v                v
+------------------------------------------------------------+
|                    FRONTEND (Vite + React 19)              |
|                                                            |
|  src/                                                      |
|  +-- App.jsx              State mgmt + routing + toast     |
|  +-- components/                                           |
|  |   +-- Sidebar.jsx      Nav + TBD badge + role label     |
|  +-- pages/                                                |
|  |   +-- Dashboard.jsx    Today's meals, upcoming, stats   |
|  |   +-- Schedules.jsx    Calendar + Trips + New Trip      |
|  |   +-- Teams.jsx        CRUD teams + dietary defaults    |
|  |   +-- Budget.jsx       Spend analytics + filters        |
|  |   +-- Workflows.jsx    Trip detail + Admin Queue        |
|  +-- utils/                                                |
|      +-- format.js        STATUS_LABELS, date helpers      |
|      +-- classify.js      Frontend meal classifier         |
|                                                            |
|  State: useState + localStorage (mo_state_v2)              |
|  API:   fetch() → http://localhost:8000                    |
+-----------------------------+------------------------------+
                              |
                              | REST / JSON
                              | camelCase (frontend) ←→ snake_case (backend)
                              v
+------------------------------------------------------------+
|                 BACKEND (FastAPI + Python)                  |
|                                                            |
|  app/                                                      |
|  +-- main.py          All API endpoints                    |
|  +-- models.py        SQLModel ORM (Team, Workflow,        |
|  |                    Execution, AdminQueueItem)            |
|  +-- schemas.py       Pydantic v2 request/response models  |
|  +-- logic.py         classify() + derive_event_context()  |
|  +-- db.py            Engine init + init_db()              |
|                                                            |
|  Key Endpoints:                                            |
|  GET  /teams              List teams                       |
|  POST /teams              Create team                      |
|  GET  /workflows          List workflows (paginated)       |
|  GET  /workflows/:id      Workflow detail + executions     |
|  POST /workflows/from-draft  Create from intake            |
|  PATCH /executions/:id    Edit execution fields            |
|  POST /admin/resolve-tbd  Resolve TBD meals                |
|  POST /admin/workflows/:id/advance  State machine step     |
|  GET  /admin/queue        Open admin queue items           |
|  GET  /calendar?month=    Calendar events                  |
|  GET  /analytics/budget   Budget analytics                 |
+-----------------------------+------------------------------+
                              |
                              | SQLModel (SQLAlchemy)
                              v
+------------------------------------------------------------+
|                     DATABASE                               |
|                                                            |
|  DEV:  SQLite (mo_athletics.db)                            |
|  PROD: PostgreSQL                                          |
|                                                            |
|  Tables:                                                   |
|  +-- team              (id, name, school, sport, dietary%) |
|  +-- workflow           (id, team_id FK, status, trip meta)|
|  +-- execution          (id, workflow_id FK, date, meal,   |
|  |                       financials, Nash fields, dietary)  |
|  +-- adminqueueitem     (id, type, workflow_id FK,         |
|                          execution_id FK, status)           |
+------------------------------------------------------------+

                    EXTERNAL INTEGRATIONS
+------------------------------------------------------------+
|                                                            |
|  +-- Stripe (SANDBOX)                                      |
|  |   - stripe_customer_id on Team                          |
|  |   - stripe_invoice_id on Workflow                       |
|  |   - Status: stub fields only, no API calls yet          |
|  |   - Plan: Stripe Test Mode (sk_test_*) for sandbox      |
|  |                                                         |
|  +-- Nash (SANDBOX)                                        |
|  |   - Delivery dispatch for mo_delivery executions        |
|  |   - Status: validated + logged, no HTTP calls yet       |
|  |   - Plan: Nash Sandbox API for testing                  |
|  |                                                         |
+------------------------------------------------------------+
```

## Data Flow: Trip Lifecycle

```
Email/CSV                classify()              Admin Queue
   |                        |                        |
   v                        v                        v
+--------+    +---------+    +----------+    +-----------+    +----------+
| Parse  |--->| Draft   |--->| Classify |--->| submitted |--->| feasib.  |
| rows   |    | review  |    | each row |    |           |    | review   |
+--------+    +---------+    +----------+    +-----------+    +----------+
                                                                   |
                                              TBD validation       |
                                              must pass            v
                                                            +-----------+
                                                            | billing   |
                                                            | prep      |
                                                            +-----------+
                                                                   |
                                              Nash validation      |
                                              addresses required   v
                                                            +-----------+
                                                            | dispatch  |
                                                            | approved  |
                                                            +-----------+
                                                                   |
                                                                   v
                                                            +-----------+
                                                            | Nash API  |
                                                            | (sandbox) |
                                                            +-----------+
```

## Classification Engine

```
Input: mealType + locationType + notes
              |
              v
    +-------------------+
    | "per diem"?       |--yes--> not_mo (context_only)
    | "airport"?        |
    | "provided"?       |
    +-------------------+
              | no
              v
    +-------------------+
    | "pickup"?         |--yes--> mo_pickup
    | "pick-up"?        |
    +-------------------+
              | no
              v
    +-------------------+
    | "tbd"?            |--yes--> tbd (needs vendor)
    +-------------------+
              | no
              v
         mo_delivery (default)
```

## Workflow State Machine

```
submitted ──feasibility_approve──> feasibility_approved
                                        |
                            billing_prep (blocked if TBD > 0)
                                        |
                                        v
                                  billing_prepped
                                        |
                            dispatch_approve (blocked if missing addresses)
                                        |
                                        v
                                  dispatch_approved
                                   (Nash dispatched)
```
