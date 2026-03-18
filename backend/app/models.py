from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict
from uuid import uuid4

from sqlmodel import Field, SQLModel, JSON, Column


def utcnow() -> datetime:
    return datetime.utcnow()


class Team(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    school_name: str
    sport: str
    conference: Optional[str] = None
    division: str = Field(default="DI")

    default_headcount: int = Field(default=45)
    default_budget: float = Field(default=65.0)

    # Dietary defaults — pre-fill intake forms for this team
    default_veg_pct: int = Field(default=10)
    default_gf_pct: int = Field(default=0)
    default_nf_pct: int = Field(default=0)

    stripe_customer_id: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Workflow(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    # Layer 1 - Account
    team_id: Optional[str] = Field(default=None, foreign_key="team.id", index=True)
    school_name: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = Field(default="DI")

    name: str
    team_name: str
    sport: Optional[str] = None

    # Layer 2 - Event / Travel Context
    trip_type: Optional[str] = None
    home_away_neutral: Optional[str] = None
    opponent: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    game_date: Optional[str] = None
    game_time: Optional[str] = None

    dietary_notes: Optional[str] = None

    status: str = Field(default="submitted")

    stripe_invoice_id: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Execution(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    workflow_id: str = Field(index=True, foreign_key="workflow.id")

    # Layer 3 - Order
    date: str
    time: Optional[str] = None  # HH:MM (24h). None when time is unknown from email
    timezone: str = Field(default="America/New_York")

    meal_type: str
    service_style: str = Field(default="boxed")
    location_type: str = Field(default="restaurant")
    notes: str = Field(default="")

    event_context: str = Field(default="travel")

    # Layer 4 - Fulfillment
    mo_fulfills: bool = Field(default=True)
    fulfillment_type: str = Field(default="mo_delivery")

    headcount: int = Field(default=0)
    dietary_counts: Dict[str, int] = Field(default_factory=dict, sa_column=Column(JSON))

    # Financials
    unit_price: float = Field(default=0.0)
    total_price: float = Field(default=0.0)
    cost: float = Field(default=0.0)
    margin: float = Field(default=0.0)

    # Nash delivery fields
    pickup_address: Optional[str] = None
    delivery_address: Optional[str] = None
    pickup_contact_name: Optional[str] = None
    pickup_contact_phone: Optional[str] = None
    delivery_contact_name: Optional[str] = None
    delivery_contact_phone: Optional[str] = None
    delivery_window_start: Optional[str] = None
    delivery_window_end: Optional[str] = None

    # Nash tracking
    nash_delivery_id: Optional[str] = None

    status: str = Field(default="submitted")

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class AdminQueueItem(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    type: str
    workflow_id: str = Field(index=True, foreign_key="workflow.id")
    execution_id: Optional[str] = Field(default=None, index=True, foreign_key="execution.id")

    status: str = Field(default="open")
    created_at: datetime = Field(default_factory=utcnow)
    closed_at: Optional[datetime] = None
