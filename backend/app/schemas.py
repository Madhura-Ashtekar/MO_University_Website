from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


class TeamCreate(BaseModel):
    name: str
    schoolName: str
    sport: str
    conference: Optional[str] = None
    division: str = "DI"
    defaultHeadcount: int = 45
    defaultBudget: float = 65.0
    defaultVegPct: int = Field(default=10, ge=0, le=100)
    defaultGfPct: int = Field(default=0, ge=0, le=100)
    defaultNfPct: int = Field(default=0, ge=0, le=100)
    stripeCustomerId: Optional[str] = None


class TeamPatch(BaseModel):
    name: Optional[str] = None
    schoolName: Optional[str] = Field(default=None, alias="schoolName")
    sport: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = None
    defaultHeadcount: Optional[int] = Field(default=None, alias="defaultHeadcount")
    defaultBudget: Optional[float] = Field(default=None, alias="defaultBudget")
    defaultVegPct: Optional[int] = Field(default=None, alias="defaultVegPct", ge=0, le=100)
    defaultGfPct: Optional[int] = Field(default=None, alias="defaultGfPct", ge=0, le=100)
    defaultNfPct: Optional[int] = Field(default=None, alias="defaultNfPct", ge=0, le=100)
    stripeCustomerId: Optional[str] = Field(default=None, alias="stripeCustomerId")

    class Config:
        populate_by_name = True


class TeamSummary(BaseModel):
    id: str
    name: str
    school_name: str
    sport: str
    conference: Optional[str] = None
    division: str
    default_headcount: int
    default_budget: float
    default_veg_pct: int = 10
    default_gf_pct: int = 0
    default_nf_pct: int = 0


class IntakeRowIn(BaseModel):
    date: str
    time: Optional[str] = None  # null means time is unknown (e.g. Wrestling emails with no time)
    timezone: str = "America/New_York"
    mealType: str
    locationType: str
    notes: str = ""
    budget: Optional[float] = Field(default=None, ge=0)
    headcount: int = Field(ge=1)
    dietaryCounts: Optional[dict] = None
    serviceStyle: Optional[str] = "boxed"

    @model_validator(mode='after')
    def check_dietary_counts(self):
        if self.dietaryCounts:
            total_dietary = sum(v for v in self.dietaryCounts.values() if isinstance(v, (int, float)))
            if total_dietary > self.headcount:
                raise ValueError(
                    f"Sum of dietary counts ({int(total_dietary)}) exceeds headcount ({self.headcount}). "
                    "Check vegetarian, gluten-free, and nut-free totals."
                )
        return self


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

    # Financials — unit_price is what MO charges the client; cost_per_meal is MO's cost to vendor
    unit_price: Optional[float] = Field(default=None, alias="unitPrice", ge=0)
    cost_per_meal: Optional[float] = Field(default=None, alias="costPerMeal", ge=0)

    # Dietary counts — editable per-execution (each value must not exceed headcount)
    dietary_counts: Optional[dict] = Field(default=None, alias="dietaryCounts")

    # Nash delivery fields — required before dispatch can be triggered
    pickup_address: Optional[str] = Field(default=None, alias="pickupAddress")
    delivery_address: Optional[str] = Field(default=None, alias="deliveryAddress")
    pickup_contact_name: Optional[str] = Field(default=None, alias="pickupContactName")
    pickup_contact_phone: Optional[str] = Field(default=None, alias="pickupContactPhone")
    delivery_contact_name: Optional[str] = Field(default=None, alias="deliveryContactName")
    delivery_contact_phone: Optional[str] = Field(default=None, alias="deliveryContactPhone")
    delivery_window_start: Optional[str] = Field(default=None, alias="deliveryWindowStart")
    delivery_window_end: Optional[str] = Field(default=None, alias="deliveryWindowEnd")

    class Config:
        populate_by_name = True


class ResolveTbdRequest(BaseModel):
    execution_id: str
    vendor_note: str
    fulfillment_type: str = "mo_delivery"  # mo_delivery | mo_pickup


class WorkflowPatch(BaseModel):
    stripe_invoice_id: Optional[str] = Field(default=None, alias="stripeInvoiceId")

    class Config:
        populate_by_name = True


class AdvanceWorkflowRequest(BaseModel):
    action: str  # feasibility_approve | billing_prep | dispatch_approve
