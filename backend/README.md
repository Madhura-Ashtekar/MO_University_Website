# Meal Outpost Backend

This directory contains the FastAPI backend that will handle CSV imports, AI intake parsing, Stripe billing prep, and Nash dispatch workflow verbs.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoints

- `GET /`: health check
- `POST /ai/intake`: mock AI parser for athletics itineraries
- `POST /imports`: register a CSV import
- `POST /workflows`: bootstrap a workflow container
- `GET /workflows/{workflow_id}`: read workflow data
