# Project Roadmap

## Current State (v0.1 — MVP)

What works today:
- Trip creation (email parse + CSV upload)
- 4-stage approval pipeline (feasibility → billing → dispatch)
- Calendar view + trip detail
- Team management with dietary defaults
- Budget analytics with filters
- Role separation (nutritionist vs admin views)
- TBD validation at billing stage
- Classification engine (MO delivery / MO pickup / TBD / Not MO)

What's stubbed:
- Stripe (fields exist, no API calls)
- Nash (validation + logging, no HTTP calls)
- Auth (hardcoded Jane Crawford, no login)

---

## Phase 1 — Sandbox Integrations (Next)

**Goal:** Real Stripe test invoices + Nash sandbox deliveries

| Task | Effort | Priority |
|------|--------|----------|
| Add `.env` + env validation on startup | S | P0 |
| Stripe SDK: customer create on team create | M | P0 |
| Stripe SDK: invoice create at billing_prep | M | P0 |
| Stripe SDK: finalize invoice at dispatch | M | P0 |
| Nash HTTP: POST /deliveries at dispatch | M | P0 |
| Nash: store delivery_id + status on Execution | S | P0 |
| Frontend: sandbox mode banner | S | P1 |
| Frontend: show invoice status in billing review | S | P1 |
| Frontend: show Nash tracking status per execution | S | P1 |
| Health endpoint: include sandbox flags | S | P1 |

---

## Phase 2 — Authentication & Authorization

**Goal:** Real user accounts, role-based access

| Task | Effort | Priority |
|------|--------|----------|
| Auth model: User (email, role, team_id) | M | P0 |
| Login/signup pages (email + password or SSO) | L | P0 |
| JWT or session-based auth middleware | M | P0 |
| Role enum: `nutritionist`, `admin`, `student` | S | P0 |
| Endpoint guards: admin-only routes behind auth | M | P0 |
| Frontend: route guards based on role | M | P0 |
| Frontend: dynamic sidebar based on role | S | P1 |
| Invite flow: admin invites nutritionist/student | M | P1 |
| University SSO integration (SAML/OAuth) | L | P2 |

---

## Phase 3 — Student Portal

**Goal:** Athletes can view meals, set dietary profiles, give feedback

| Task | Effort | Priority |
|------|--------|----------|
| Student model: link to Team, dietary profile | M | P0 |
| Student portal: "My Meals" — upcoming meals for my team | M | P0 |
| Dietary profile page: allergies, preferences, notes | M | P0 |
| Auto-aggregate dietary profiles → team dietary counts | M | P0 |
| Meal rating + feedback form | M | P1 |
| Team feed: announcements from coach/nutritionist | M | P1 |
| Push notifications: meal ready, schedule change | L | P2 |
| Meal photo upload (vendor sends photo → student sees) | M | P2 |

---

## Phase 4 — Vendor Management

**Goal:** Track vendors, quality, pricing, and preferences

| Task | Effort | Priority |
|------|--------|----------|
| Vendor model: name, address, cuisine, rating, contacts | M | P0 |
| Vendor directory page (admin) | M | P0 |
| Link executions to vendor (replace text notes) | M | P0 |
| Vendor quality dashboard (from student ratings) | M | P1 |
| Vendor pricing history + cost comparison | M | P1 |
| Preferred vendor list per city/region | S | P1 |
| Auto-suggest vendors based on location + meal type | L | P2 |

---

## Phase 5 — Intelligence & Optimization

**Goal:** Smart defaults, cost optimization, predictive scheduling

| Task | Effort | Priority |
|------|--------|----------|
| Historical cost analysis: avg cost by city, sport, meal | M | P1 |
| Budget alerts: "This trip is 20% over avg for baseball" | M | P1 |
| Smart headcount: predict no-shows from historical data | L | P2 |
| Template trips: "Clone last basketball away trip" | M | P1 |
| Recurring schedules: auto-create weekly home meals | M | P1 |
| Dietary trend reports: GF requests increasing 15% | M | P2 |
| Integration: export to Excel / PDF for compliance | M | P1 |

---

## Phase 6 — Production Readiness

**Goal:** Deploy, monitor, scale

| Task | Effort | Priority |
|------|--------|----------|
| PostgreSQL migration from SQLite | M | P0 |
| Docker + docker-compose for local dev | M | P0 |
| CI/CD pipeline (GitHub Actions) | M | P0 |
| Alembic migrations for schema changes | M | P0 |
| Error tracking (Sentry) | S | P1 |
| Logging + observability (structured JSON logs) | M | P1 |
| Rate limiting on public endpoints | S | P1 |
| Deployment: AWS/GCP/Vercel | L | P1 |
| Load testing: 50 concurrent users | M | P2 |
| Backup strategy for database | M | P1 |

---

## Effort Key

| Label | Meaning |
|-------|---------|
| S | Small — < 2 hours |
| M | Medium — 2–8 hours |
| L | Large — 1–3 days |

## Priority Key

| Label | Meaning |
|-------|---------|
| P0 | Must have for this phase |
| P1 | Should have, improves quality |
| P2 | Nice to have, can defer |
