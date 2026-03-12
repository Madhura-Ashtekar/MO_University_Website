from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class TeamCreate(BaseModel):
    name: str
    schoolName: str
    sport: str
    conference: Optional[str] = None
    division: str = "DI"
    defaultHeadcount: int = 45
    defaultBudget: float = 65.0


class TeamSummary(BaseModel):
    id: str
    name: str
    school_name: str
    sport: str
    conference: Optional[str] = None
    division: str
    default_headcount: int
    default_budget: float


class IntakeRowIn(BaseModel):
    date: str
    time: Optional[str] = None  # null means time is unknown (e.g. Wrestling emails with no time)
    timezone: str = "America/New_York"
    mealType: str
    locationType: str
    notes: str = ""
    budget: Optional[float] = None
    headcount: int
    dietaryCounts: Optional[dict] = None
    serviceStyle: Optional[str] = "boxed"


class WorkflowCreateFromDraft(BaseModel):
    name: str
    teamName: str
    schoolName: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = "DI"
    sport: Optional[str] = None
    tripType: Optional[str] = None
    homeAwayNeutral: Optional[str] = None
    opponent: Optional[str] = None
    venueName: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    gameDate: Optional[str] = None
    gameTime: Optional[str] = None
    dietaryNotes: Optional[str] = None
    rows: List[IntakeRowIn]


class WorkflowSummary(BaseModel):
    id: str
    name: str
    team_name: str
    sport: Optional[str] = None
    status: str
    counts: dict


class WorkflowDetail(BaseModel):
    id: str
    name: str
    team_name: str
    school_name: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = None
    sport: Optional[str] = None
    trip_type: Optional[str] = None
    home_away_neutral: Optional[str] = None
    opponent: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    game_date: Optional[str] = None
    game_time: Optional[str] = None
    dietary_notes: Optional[str] = None
    status: str
    executions: list
    queue_open: list


class ExecutionPatch(BaseModel):
    time: Optional[str] = None
    timezone: Optional[str] = None
    meal_type: Optional[str] = Field(default=None, alias="mealType")
    location_type: Optional[str] = Field(default=None, alias="locationType")
    notes: Optional[str] = None
    fulfillment_type: Optional[str] = Field(default=None, alias="fulfillmentType")
    event_context: Optional[str] = Field(default=None, alias="eventContext")

    class Config:
        populate_by_name = True


class ResolveTbdRequest(BaseModel):
    execution_id: str
    vendor_note: str
    fulfillment_type: str = "mo_delivery"  # mo_delivery | mo_pickup


class AdvanceWorkflowRequest(BaseModel):
    action: str  # feasibility_approve | billing_prep | dispatch_approve
