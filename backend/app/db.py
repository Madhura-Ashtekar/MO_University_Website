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


def _migrate_missing_columns(engine) -> None:
    """Add columns that exist in the model but not yet in the SQLite table."""
    import sqlite3
    import logging
    logger = logging.getLogger(__name__)

    if not DATABASE_URL.startswith("sqlite"):
        return

    db_path = DATABASE_URL.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Map of table -> list of (column_name, column_type_sql)
    migrations = {
        "execution": [
            ("nash_delivery_id", "TEXT"),
            ("cost", "REAL DEFAULT 0.0"),
            ("margin", "REAL DEFAULT 0.0"),
            ("pickup_address", "TEXT"),
            ("delivery_address", "TEXT"),
            ("pickup_contact_name", "TEXT"),
            ("pickup_contact_phone", "TEXT"),
            ("delivery_contact_name", "TEXT"),
            ("delivery_contact_phone", "TEXT"),
            ("delivery_window_start", "TEXT"),
            ("delivery_window_end", "TEXT"),
        ],
    }

    for table, columns in migrations.items():
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            existing = {row[1] for row in cursor.fetchall()}
        except Exception:
            continue

        for col_name, col_type in columns:
            if col_name not in existing:
                try:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                    logger.info("  migrated: ALTER TABLE %s ADD COLUMN %s %s", table, col_name, col_type)
                except Exception as exc:
                    logger.warning("  migration skipped %s.%s: %s", table, col_name, exc)

    conn.commit()
    conn.close()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_missing_columns(engine)

