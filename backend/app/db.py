import os

from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine


def get_database_url() -> str:
    load_dotenv()
    # Default to local SQLite for development/testing.
    # Can be replaced with Postgres later via DATABASE_URL.
    return os.getenv("DATABASE_URL", "sqlite:///./mealoutpost.db")


DATABASE_URL = get_database_url()

# For SQLite, allow using a single connection across threads.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)

