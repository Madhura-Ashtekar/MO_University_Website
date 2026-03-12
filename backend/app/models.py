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
    
    # Defaults for new schedules
    default_headcount: int = Field(default=45)
    default_budget: float = Field(default=65.0)
    
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Workflow(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    # Layer 1 - Account
    school_name: Optional[str] = None
    conference: Optional[str] = None
    division: Optional[str] = Field(default="DI") # DI, DII, DIII

    name: str
    team_name: str
    sport: Optional[str] = None
    
    # Layer 2 - Event / Travel Context
    trip_type: Optional[str] = None  # day_trip|overnight|multi_day
    home_away_neutral: Optional[str] = None  # home|away|neutral
    opponent: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    game_date: Optional[str] = None
    game_time: Optional[str] = None

    status: str = Field(default="submitted")  # submitted|approved|billing_prepped|dispatch_approved

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Execution(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    workflow_id: str = Field(index=True, foreign_key="workflow.id")

    # Layer 3 - Order
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    timezone: str = Field(default="America/New_York")

    meal_type: str
    service_style: str = Field(default="boxed") # boxed|buffet|per_diem
    location_type: str = Field(default="restaurant")
    notes: str = Field(default="")
    
    # Strategic Data Points
    event_context: str = Field(default="travel")  # pre_game|post_game|travel|practice|recovery
    
    # Layer 4 - Fulfillment
    mo_fulfills: bool = Field(default=True)
    fulfillment_type: str = Field(default="mo_delivery")  # mo_delivery|mo_pickup|not_mo|tbd
    
    headcount: int = Field(default=0)
    dietary_counts: Dict[str, int] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # Financials (Strategic benchmarking)
    total_price: float = Field(default=0.0)
    cost: float = Field(default=0.0)
    margin: float = Field(default=0.0)

    status: str = Field(default="submitted")  # submitted|context_only|...

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class AdminQueueItem(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    type: str  # resolve_tbd|feasibility|billing_prep|dispatch_approval
    workflow_id: str = Field(index=True, foreign_key="workflow.id")
    execution_id: Optional[str] = Field(default=None, index=True, foreign_key="execution.id")

    status: str = Field(default="open")  # open|closed
    created_at: datetime = Field(default_factory=utcnow)
    closed_at: Optional[datetime] = None

