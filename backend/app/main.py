from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .db import engine, init_db
from .logic import classify, derive_event_context
from .models import AdminQueueItem, Execution, Workflow, Team
from .schemas import (
    AdvanceWorkflowRequest,
    ExecutionPatch,
    ResolveTbdRequest,
    TeamCreate,
    TeamPatch,
    TeamSummary,
    WorkflowCreateFromDraft,
    WorkflowDetail,
    WorkflowPatch,
    WorkflowSummary,
)

@asynccontextmanager
async def lifespan(app):
    init_db()
    yield


app = FastAPI(
    title="Meal Outpost Athletics API",
    description="Backend for the athletics meal intake, Stripe billing prep, and Nash dispatch flows.",
    version="0.1.0",
    lifespan=lifespan,
)

_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Meal Outpost API is running", "time": datetime.utcnow().isoformat()}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/teams", response_model=list[TeamSummary])
def list_teams():
    with Session(engine) as session:
        teams = session.exec(select(Team).order_by(Team.name)).all()
        # Fallback: find unique teams from workflows if team table is empty
        if not teams:
            workflows = session.exec(select(Workflow)).all()
            unique_teams = {}
            for w in workflows:
                key = (w.team_name, w.school_name, w.sport)
                if key not in unique_teams:
                    unique_teams[key] = {
                        "id": f"wf-team-{len(unique_teams)}",
                        "name": w.team_name,
                        "school_name": w.school_name or "Unknown",
                        "sport": w.sport or "Unknown",
                        "conference": w.conference,
                        "division": w.division or "DI",
                        "default_headcount": 45,
                        "default_budget": 65.0,
                        "default_veg_pct": 10,
                        "default_gf_pct": 0,
                        "default_nf_pct": 0,
                    }
            return list(unique_teams.values())
        return teams


@app.post("/teams", response_model=TeamSummary)
def create_team(payload: TeamCreate):
    with Session(engine) as session:
        team = Team(
            name=payload.name,
            school_name=payload.schoolName,
            sport=payload.sport,
            conference=payload.conference,
            division=payload.division,
            default_headcount=payload.defaultHeadcount,
            default_budget=payload.defaultBudget,
            default_veg_pct=payload.defaultVegPct,
            default_gf_pct=payload.defaultGfPct,
            default_nf_pct=payload.defaultNfPct,
            stripe_customer_id=payload.stripeCustomerId,
        )
        session.add(team)
        session.commit()
        session.refresh(team)
        return team


@app.patch("/teams/{team_id}", response_model=TeamSummary)
def patch_team(team_id: str, patch: TeamPatch):
    with Session(engine) as session:
        team = session.get(Team, team_id)
        if not team:
            raise HTTPException(status_code=404, detail="team not found")
        data = patch.model_dump(by_alias=False, exclude_unset=True)
        if "name" in data and data["name"] is not None:
            team.name = data["name"]
        if "school_name" in data and data["school_name"] is not None:
            team.school_name = data["school_name"]
        if "sport" in data and data["sport"] is not None:
            team.sport = data["sport"]
        if "conference" in data:
            team.conference = data["conference"]
        if "division" in data and data["division"] is not None:
            team.division = data["division"]
        if "default_headcount" in data and data["default_headcount"] is not None:
            team.default_headcount = data["default_headcount"]
        if "default_budget" in data and data["default_budget"] is not None:
            team.default_budget = data["default_budget"]
        if "default_veg_pct" in data and data["default_veg_pct"] is not None:
            team.default_veg_pct = data["default_veg_pct"]
        if "default_gf_pct" in data and data["default_gf_pct"] is not None:
            team.default_gf_pct = data["default_gf_pct"]
        if "default_nf_pct" in data and data["default_nf_pct"] is not None:
            team.default_nf_pct = data["default_nf_pct"]
        if "stripe_customer_id" in data:
            team.stripe_customer_id = data["stripe_customer_id"]
        team.updated_at = datetime.utcnow()
        session.add(team)
        session.commit()
        session.refresh(team)
        return team


@app.patch("/workflows/{workflow_id}")
def patch_workflow(workflow_id: str, patch: WorkflowPatch):
    with Session(engine) as session:
        w = session.get(Workflow, workflow_id)
        if not w:
            raise HTTPException(status_code=404, detail="workflow not found")
        data = patch.model_dump(by_alias=False, exclude_unset=True)
        if "stripe_invoice_id" in data:
            w.stripe_invoice_id = data["stripe_invoice_id"]
        w.updated_at = datetime.utcnow()
        session.add(w)
        session.commit()
        return {"ok": True}


@app.get("/workflows", response_model=list[WorkflowSummary])
def list_workflows(skip: int = 0, limit: int = 50):
    with Session(engine) as session:
        workflows = session.exec(select(Workflow).order_by(Workflow.created_at.desc()).offset(skip).limit(limit)).all()
        wf_ids = [w.id for w in workflows]
        if not wf_ids:
            return []
        executions = session.exec(
            select(Execution).where(Execution.workflow_id.in_(wf_ids))
        ).all()
        queue_open = session.exec(
            select(AdminQueueItem).where(
                AdminQueueItem.status == "open",
                AdminQueueItem.workflow_id.in_(wf_ids),
            )
        ).all()

    ex_by_wf: dict[str, list[Execution]] = {}
    for e in executions:
        ex_by_wf.setdefault(e.workflow_id, []).append(e)

    q_by_wf: dict[str, list[AdminQueueItem]] = {}
    for q in queue_open:
        q_by_wf.setdefault(q.workflow_id, []).append(q)

    out: list[WorkflowSummary] = []
    for w in workflows:
        ex = ex_by_wf.get(w.id, [])
        counts = {
            "mo": sum(1 for e in ex if e.fulfillment_type not in ("tbd", "not_mo")),
            "tbd": sum(1 for e in ex if e.fulfillment_type == "tbd"),
            "not_mo": sum(1 for e in ex if e.fulfillment_type == "not_mo"),
            "queue_open": len(q_by_wf.get(w.id, [])),
        }
        out.append(WorkflowSummary(
            id=w.id,
            name=w.name,
            team_name=w.team_name,
            sport=w.sport,
            status=w.status,
            counts=counts,
        ))
    return out


@app.get("/workflows/{workflow_id}", response_model=WorkflowDetail)
def get_workflow(workflow_id: str):
    with Session(engine) as session:
        w = session.get(Workflow, workflow_id)
        if not w:
            raise HTTPException(status_code=404, detail="workflow not found")
        ex = session.exec(select(Execution).where(Execution.workflow_id == workflow_id)).all()
        q = session.exec(select(AdminQueueItem).where(AdminQueueItem.workflow_id == workflow_id, AdminQueueItem.status == "open")).all()

    return WorkflowDetail(
        id=w.id,
        name=w.name,
        team_name=w.team_name,
        school_name=w.school_name,
        conference=w.conference,
        division=w.division,
        sport=w.sport,
        trip_type=w.trip_type,
        home_away_neutral=w.home_away_neutral,
        opponent=w.opponent,
        venue_name=w.venue_name,
        city=w.city,
        state=w.state,
        game_date=w.game_date,
        game_time=w.game_time,
        dietary_notes=w.dietary_notes,
        status=w.status,
        executions=[e.model_dump() for e in ex],
        queue_open=[qi.model_dump() for qi in q],
    )


@app.post("/workflows/from-draft")
def create_workflow_from_draft(draft: WorkflowCreateFromDraft):
    # Resolve team_id by matching name+school so the FK is populated.
    team_id: str | None = None
    with Session(engine) as session:
        team = session.exec(
            select(Team).where(
                Team.name == draft.teamName,
                Team.school_name == (draft.schoolName or ""),
            )
        ).first()
        if team:
            team_id = team.id

    workflow = Workflow(
        name=draft.name,
        team_id=team_id,
        team_name=draft.teamName,
        school_name=draft.schoolName,
        conference=draft.conference,
        division=draft.division,
        sport=draft.sport,
        trip_type=draft.tripType,
        home_away_neutral=draft.homeAwayNeutral,
        opponent=draft.opponent,
        venue_name=draft.venueName,
        city=draft.city,
        state=draft.state,
        game_date=draft.gameDate,
        game_time=draft.gameTime,
        dietary_notes=draft.dietaryNotes,
        status="submitted",
    )

    executions: list[Execution] = []
    queue_items: list[AdminQueueItem] = []
    workflow_id = workflow.id

    # Trip-level feasibility item always.
    queue_items.append(AdminQueueItem(type="feasibility", workflow_id=workflow_id, execution_id=None, status="open"))

    for row in draft.rows:
        mo_fulfills, fulfillment_type = classify(row.mealType, row.locationType, row.notes)
        event_context = derive_event_context(row.mealType, row.locationType, row.notes)
        status = "context_only" if fulfillment_type == "not_mo" else "submitted"
        unit_price = float(row.budget) if row.budget is not None else 0.0
        total_price = unit_price * row.headcount if row.headcount > 0 else 0.0
        exe = Execution(
            workflow_id=workflow_id,
            date=row.date,
            time=row.time,
            timezone=row.timezone,
            meal_type=row.mealType,
            service_style=row.serviceStyle or "boxed",
            location_type=row.locationType,
            notes=row.notes,
            event_context=event_context,
            mo_fulfills=mo_fulfills,
            fulfillment_type=fulfillment_type,
            headcount=row.headcount,
            dietary_counts=row.dietaryCounts or {},
            unit_price=unit_price,
            total_price=total_price,
            status=status,
        )
        executions.append(exe)
        if fulfillment_type == "tbd":
            queue_items.append(AdminQueueItem(type="resolve_tbd", workflow_id=workflow_id, execution_id=exe.id, status="open"))

    with Session(engine) as session:
        session.add(workflow)
        for e in executions:
            session.add(e)
        for q in queue_items:
            session.add(q)
        session.commit()

    return {"workflow_id": workflow_id}


@app.patch("/executions/{execution_id}")
def patch_execution(execution_id: str, patch: ExecutionPatch):
    with Session(engine) as session:
        exe = session.get(Execution, execution_id)
        if not exe:
            raise HTTPException(status_code=404, detail="execution not found")

        data = patch.model_dump(by_alias=False, exclude_unset=True)
        # Normalize alias keys
        if "meal_type" in data and data["meal_type"] is not None:
            exe.meal_type = data["meal_type"]
        if "location_type" in data and data["location_type"] is not None:
            exe.location_type = data["location_type"]
        if "notes" in data and data["notes"] is not None:
            exe.notes = data["notes"]
        if "time" in data and data["time"] is not None:
            exe.time = data["time"]
        if "timezone" in data and data["timezone"] is not None:
            exe.timezone = data["timezone"]

        # Allow explicit fulfillment_type override from admin.
        if "fulfillment_type" in data and data["fulfillment_type"] is not None:
            exe.fulfillment_type = data["fulfillment_type"]
            exe.mo_fulfills = exe.fulfillment_type in ("mo_delivery", "mo_pickup")
            exe.status = "context_only" if exe.fulfillment_type == "not_mo" else "submitted"
        else:
            mo_fulfills, fulfillment_type = classify(exe.meal_type, exe.location_type, exe.notes)
            exe.mo_fulfills = mo_fulfills
            exe.fulfillment_type = fulfillment_type
            exe.status = "context_only" if fulfillment_type == "not_mo" else "submitted"

        if "event_context" in data and data["event_context"] is not None:
            exe.event_context = data["event_context"]
        else:
            exe.event_context = derive_event_context(exe.meal_type, exe.location_type, exe.notes)

        # Financials: unit_price → total_price; cost_per_meal → cost; recompute margin
        if "unit_price" in data and data["unit_price"] is not None:
            exe.unit_price = float(data["unit_price"])
            exe.total_price = exe.unit_price * exe.headcount if exe.headcount > 0 else 0.0
        if "cost_per_meal" in data and data["cost_per_meal"] is not None:
            exe.cost = float(data["cost_per_meal"]) * exe.headcount if exe.headcount > 0 else 0.0
        # Always recompute margin when either financial changes
        if "unit_price" in data or "cost_per_meal" in data:
            exe.margin = exe.total_price - exe.cost

        # Dietary counts — validate each value does not exceed headcount
        if "dietary_counts" in data and data["dietary_counts"] is not None:
            dc = data["dietary_counts"]
            for key, val in dc.items():
                if isinstance(val, (int, float)) and val > exe.headcount:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Dietary count for '{key}' ({int(val)}) exceeds headcount ({exe.headcount})."
                    )
            exe.dietary_counts = dc

        # Nash delivery fields — written whenever provided
        for src, dest in [
            ("pickup_address", "pickup_address"),
            ("delivery_address", "delivery_address"),
            ("pickup_contact_name", "pickup_contact_name"),
            ("pickup_contact_phone", "pickup_contact_phone"),
            ("delivery_contact_name", "delivery_contact_name"),
            ("delivery_contact_phone", "delivery_contact_phone"),
            ("delivery_window_start", "delivery_window_start"),
            ("delivery_window_end", "delivery_window_end"),
        ]:
            if src in data:
                setattr(exe, dest, data[src])

        exe.updated_at = datetime.utcnow()

        # Queue maintenance: ensure/close TBD item.
        q_open = session.exec(select(AdminQueueItem).where(
            AdminQueueItem.type == "resolve_tbd",
            AdminQueueItem.execution_id == exe.id,
            AdminQueueItem.status == "open",
        )).first()
        if exe.fulfillment_type == "tbd":
            if not q_open:
                session.add(AdminQueueItem(type="resolve_tbd", workflow_id=exe.workflow_id, execution_id=exe.id, status="open"))
        else:
            if q_open:
                q_open.status = "closed"
                q_open.closed_at = datetime.utcnow()

        session.add(exe)
        session.commit()
        session.refresh(exe)

        return {"execution": exe.model_dump()}


@app.post("/admin/resolve-tbd")
def resolve_tbd(payload: ResolveTbdRequest):
    with Session(engine) as session:
        exe = session.get(Execution, payload.execution_id)
        if not exe:
            raise HTTPException(status_code=404, detail="execution not found")

        ft = payload.fulfillment_type if payload.fulfillment_type in ("mo_delivery", "mo_pickup") else "mo_delivery"
        exe.notes = payload.vendor_note.strip()
        exe.location_type = "restaurant"
        exe.mo_fulfills = True
        exe.fulfillment_type = ft
        exe.status = "submitted"
        exe.event_context = derive_event_context(exe.meal_type, exe.location_type, exe.notes)
        exe.updated_at = datetime.utcnow()

        q_open = session.exec(select(AdminQueueItem).where(
            AdminQueueItem.type == "resolve_tbd",
            AdminQueueItem.execution_id == exe.id,
            AdminQueueItem.status == "open",
        )).first()
        if q_open:
            q_open.status = "closed"
            q_open.closed_at = datetime.utcnow()
            session.add(q_open)

        session.add(exe)
        session.commit()
        return {"ok": True}


@app.post("/admin/workflows/{workflow_id}/advance")
def advance_workflow(workflow_id: str, payload: AdvanceWorkflowRequest):
    with Session(engine) as session:
        w = session.get(Workflow, workflow_id)
        if not w:
            raise HTTPException(status_code=404, detail="workflow not found")

        action = payload.action
        if action == "feasibility_approve":
            close_type = "feasibility"
            open_next = "billing_prep"
            w.status = "feasibility_approved"
        elif action == "billing_prep":
            tbd_execs = session.exec(
                select(Execution).where(
                    Execution.workflow_id == workflow_id,
                    Execution.fulfillment_type == "tbd",
                )
            ).all()
            if tbd_execs:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": f"{len(tbd_execs)} TBD meal(s) must be resolved before billing prep.",
                        "tbd_count": len(tbd_execs),
                    },
                )
            close_type = "billing_prep"
            open_next = "dispatch_approval"
            w.status = "billing_prepped"
        elif action == "dispatch_approve":
            close_type = "dispatch_approval"
            open_next = None
            w.status = "dispatch_approved"

            # Mark all MO executions as dispatched and build Nash payload stub.
            # TODO: replace stub with real POST to Nash /deliveries API.
            mo_executions = session.exec(
                select(Execution).where(
                    Execution.workflow_id == workflow_id,
                    Execution.mo_fulfills == True,  # noqa: E712
                )
            ).all()

            # Validate Nash required fields on all mo_delivery executions before dispatch.
            missing_fields = []
            for exe in mo_executions:
                if exe.fulfillment_type == "mo_delivery":
                    missing = []
                    if not exe.pickup_address:
                        missing.append("pickup_address")
                    if not exe.delivery_address:
                        missing.append("delivery_address")
                    if missing:
                        missing_fields.append({"execution_id": exe.id, "date": exe.date, "meal_type": exe.meal_type, "missing": missing})
            if missing_fields:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "message": "Some MO Delivery executions are missing required Nash fields. Fill in pickup and delivery addresses before dispatching.",
                        "incomplete_executions": missing_fields,
                    }
                )
            nash_deliveries = []
            for exe in mo_executions:
                exe.status = "dispatched"
                exe.updated_at = datetime.utcnow()
                session.add(exe)
                nash_deliveries.append({
                    "execution_id": exe.id,
                    "date": exe.date,
                    "time": exe.time,
                    "headcount": exe.headcount,
                    "pickup_address": exe.pickup_address,
                    "delivery_address": exe.delivery_address,
                    "delivery_window_start": exe.delivery_window_start,
                    "delivery_window_end": exe.delivery_window_end,
                })
            # Log what would be sent to Nash (swap for real HTTP call with NASH_API_KEY)
            import logging
            logger = logging.getLogger(__name__)
            logger.info("[NASH STUB] Would dispatch %d deliveries for workflow %s: %s", len(nash_deliveries), workflow_id, nash_deliveries)
        else:
            raise HTTPException(status_code=400, detail="unknown action")

        q = session.exec(select(AdminQueueItem).where(
            AdminQueueItem.workflow_id == workflow_id,
            AdminQueueItem.type == close_type,
            AdminQueueItem.status == "open",
        )).first()
        if q:
            q.status = "closed"
            q.closed_at = datetime.utcnow()
            session.add(q)

        if open_next:
            exists = session.exec(select(AdminQueueItem).where(
                AdminQueueItem.workflow_id == workflow_id,
                AdminQueueItem.type == open_next,
                AdminQueueItem.status == "open",
            )).first()
            if not exists:
                session.add(AdminQueueItem(type=open_next, workflow_id=workflow_id, execution_id=None, status="open"))

        w.updated_at = datetime.utcnow()
        session.add(w)
        session.commit()
        resp: dict = {"ok": True, "status": w.status}
        if action == "dispatch_approve":
            resp["dispatched_count"] = len(nash_deliveries)
        return resp


@app.get("/admin/queue")
def list_admin_queue_open():
    with Session(engine) as session:
        q = session.exec(select(AdminQueueItem).where(AdminQueueItem.status == "open").order_by(AdminQueueItem.created_at.desc())).all()
    return {"items": [qi.model_dump() for qi in q]}


@app.get("/calendar")
def get_calendar(month: str):
    """Returns executions for a given month (YYYY-MM) with workflow context."""
    with Session(engine) as session:
        executions = session.exec(
            select(Execution).where(Execution.date.startswith(month))
        ).all()
        if not executions:
            return {"events": []}
        wf_ids = list({e.workflow_id for e in executions})
        workflows = session.exec(select(Workflow).where(Workflow.id.in_(wf_ids))).all()

    wf_map = {w.id: w for w in workflows}
    events = []
    for e in executions:
        wf = wf_map.get(e.workflow_id)
        events.append({
            "id": e.id,
            "workflow_id": e.workflow_id,
            "date": e.date,
            "time": e.time,
            "timezone": e.timezone,
            "meal_type": e.meal_type,
            "location_type": e.location_type,
            "notes": e.notes,
            "headcount": e.headcount,
            "fulfillment_type": e.fulfillment_type,
            "dietary_counts": e.dietary_counts or {},
            "team_name": wf.team_name if wf else "Unknown",
            "sport": wf.sport if wf else None,
            "workflow_name": wf.name if wf else "Unknown",
        })
    # Sort by date then time (nulls last)
    events.sort(key=lambda x: (x["date"], x["time"] or "99:99"))
    return {"events": events}


@app.get("/analytics/budget")
def get_budget_analytics(team_name: Optional[str] = None, month: Optional[str] = None):
    with Session(engine) as session:
        wf_query = select(Workflow)
        if team_name:
            wf_query = wf_query.where(Workflow.team_name == team_name)
        workflows = session.exec(wf_query).all()
        wf_ids = [w.id for w in workflows]

        if not wf_ids:
            return {"total_spend": 0.0, "total_cost": 0.0, "total_margin": 0.0, "by_team": [], "by_month": []}

        ex_query = select(Execution).where(Execution.workflow_id.in_(wf_ids))
        if month:
            ex_query = ex_query.where(Execution.date.startswith(month))
        executions = session.exec(ex_query).all()

    wf_map = {w.id: w for w in workflows}

    total_spend = 0.0
    total_cost = 0.0
    by_team: dict = {}
    by_month: dict = {}

    for e in executions:
        total_spend += e.total_price or 0.0
        total_cost += e.cost or 0.0

        wf = wf_map.get(e.workflow_id)
        if wf:
            team_key = wf.team_name
            team_stats = by_team.get(team_key, {"spend": 0.0, "meals": 0, "avg": 0.0})
            team_stats["spend"] += e.total_price or 0.0
            team_stats["meals"] += 1
            by_team[team_key] = team_stats

        # Group by month
        month_key = e.date[:7]  # YYYY-MM
        month_stats = by_month.get(month_key, {"spend": 0.0, "meals": 0})
        month_stats["spend"] += e.total_price or 0.0
        month_stats["meals"] += 1
        by_month[month_key] = month_stats

    # Reformat for frontend
    team_list = [{"name": k, **v} for k, v in by_team.items()]
    month_list = [{"month": k, **v} for k, v in by_month.items()]

    return {
        "total_spend": total_spend,
        "total_cost": total_cost,
        "total_margin": total_spend - total_cost,
        "by_team": sorted(team_list, key=lambda x: x["spend"], reverse=True),
        "by_month": sorted(month_list, key=lambda x: x["month"]),
    }
