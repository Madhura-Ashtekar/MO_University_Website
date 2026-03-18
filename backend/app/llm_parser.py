"""
LLM-powered intake email parser.
Provider priority: Gemini 2.5 Flash (cheapest) → OpenAI GPT-4o-mini → local fallback.
Set GEMINI_API_KEY or OPENAI_API_KEY in .env to enable.
"""
from __future__ import annotations

import json
import logging
import time

from .config import GEMINI_API_KEY, OPENAI_API_KEY

logger = logging.getLogger(__name__)


# ─── Shared prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert parser for college athletics travel meal planning emails.
Extract every meal mentioned and return ONLY valid JSON — no markdown fences, no explanation, just the JSON object.

EXTRACTION RULES:
1. One row per meal per day
2. Dates: YYYY-MM-DD using the year provided in context
3. mealType: exactly one of "Breakfast", "Lunch", "Dinner", "Pre-Game Meal", "Post-Game Meal", "Snacks / Recovery"
4. vendor: the specific restaurant or vendor name. null if not specified
5. address: street address only (e.g. "7404 Broadview Rd, Parma, OH 44134"). null if not present
6. notes: extra context such as handling names or special instructions. null if none
7. isTbd rules:
   - vendor has "?" → isTbd=true, tbdReason="unconfirmed"
   - vendor has " or " (multiple options) → isTbd=true, tbdReason="multiple_options"
   - vendor is only a cuisine type (Italian, Greek, Steaks, etc.) → isTbd=true, tbdReason="cuisine_only"
   - vendor is vague ("No preference", "Local place", "Breakfast sandwich place") → isTbd=true, tbdReason="no_vendor"
   - no vendor at all → isTbd=true, tbdReason="no_vendor"
8. "[address]" brackets: vendor = text written before the bracket, address = bracket contents
9. If bracket contents contain both a vendor name and a street address (e.g. "Jimmy John's, 7404 Broadview Rd"),
   use the text before the bracket as vendor and the street portion as address
10. "(person name)" after vendor → notes = person name (e.g. "Cole handles")
11. locationType: "restaurant", "hotel", "airport", "field", "bus", or "perdiem"
12. time: 24-hour HH:MM format, or null if not specified
13. timezone: IANA timezone string (default "America/New_York")
14. locationHint: if the vendor has NO full street address but a neighborhood, area, landmark, or person's territory is mentioned (e.g. "Cole Harbor", "downtown Cleveland", "near the stadium"), capture it here so we can look it up via Google Places. null if a full address is already provided or no location hint exists.

OUTPUT SCHEMA (return exactly this shape):
{
  "metadata": {
    "team": "string or null",
    "sport": "string or null",
    "division": "string or null",
    "city": "string or null",
    "state": "string or null",
    "venueName": "string or null"
  },
  "rows": [
    {
      "date": "YYYY-MM-DD",
      "mealType": "string",
      "vendor": "string or null",
      "address": "string or null",
      "locationHint": "string or null",
      "notes": "string or null",
      "isTbd": true or false,
      "tbdReason": "unconfirmed|multiple_options|cuisine_only|no_vendor or null",
      "locationType": "string",
      "time": "HH:MM or null",
      "timezone": "string"
    }
  ]
}"""


def _normalise_rows(raw_rows: list) -> list:
    return [
        {
            "date": r.get("date", ""),
            "time": r.get("time") or None,
            "timezone": r.get("timezone", "America/New_York"),
            "mealType": r.get("mealType", "Meal"),
            "locationType": r.get("locationType", "restaurant"),
            "vendor": r.get("vendor") or None,
            "address": r.get("address") or None,
            "locationHint": r.get("locationHint") or None,
            "notes": r.get("notes") or "",
            "isTbd": bool(r.get("isTbd", False)),
            "tbdReason": r.get("tbdReason") or None,
        }
        for r in raw_rows
    ]


def _log_parsed_rows(rows: list, metadata: dict, source: str) -> None:
    """Print a clean summary of parsed results to the terminal."""
    tbd_count = sum(1 for r in rows if r.get("isTbd"))
    logger.info("━━━ PARSE RESULT [%s] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", source.upper())
    logger.info("  Team: %s | Sport: %s | Division: %s",
                metadata.get("team") or "—",
                metadata.get("sport") or "—",
                metadata.get("division") or "—")
    logger.info("  Location: %s, %s  |  Venue: %s",
                metadata.get("city") or "—",
                metadata.get("state") or "—",
                metadata.get("venueName") or "—")
    logger.info("  Rows: %d total, %d TBD", len(rows), tbd_count)
    logger.info("  %-12s %-10s %-26s %-38s %s", "DATE", "MEAL", "VENDOR", "ADDRESS", "FLAGS")
    logger.info("  %s", "─" * 100)
    for r in rows:
        flags = []
        if r.get("isTbd"):
            flags.append(f"TBD:{r.get('tbdReason','?')}")
        if r.get("locationHint"):
            flags.append(f"hint:{r['locationHint']}")
        if r.get("notes"):
            flags.append(f"note:{r['notes']}")
        logger.info("  %-12s %-10s %-26s %-38s %s",
                    r.get("date", ""),
                    (r.get("mealType") or "")[:10],
                    (r.get("vendor") or "—")[:26],
                    (r.get("address") or "—")[:38],
                    ", ".join(flags) or "✓")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


def _strip_fences(text: str) -> str:
    """Remove markdown code fences a model may add despite instructions."""
    t = text.strip()
    if t.startswith("```"):
        t = t.split("```")[1]
        if t.startswith("json"):
            t = t[4:]
    return t.strip()


def _build_user_message(email_text: str, year: int, team: str, school: str) -> str:
    return (
        f"Year: {year}\n"
        f"Team: {team or 'unknown'} at {school or 'unknown university'}\n\n"
        f"EMAIL:\n{email_text}"
    )


# ─── Gemini provider ──────────────────────────────────────────────────────────

def _parse_with_gemini(email_text: str, year: int, team: str, school: str) -> dict | None:
    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore

        logger.info("  → Calling Gemini 2.5 Flash...")
        t0 = time.time()

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = _build_user_message(email_text, year, team, school)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

        elapsed = time.time() - t0
        logger.info("  → Gemini responded in %.2fs", elapsed)

        result = json.loads(_strip_fences(response.text))
        rows = _normalise_rows(result.get("rows", []))
        metadata = result.get("metadata", {})
        _log_parsed_rows(rows, metadata, "gemini")
        return {"rows": rows, "metadata": metadata, "source": "gemini"}
    except Exception as exc:
        logger.warning("  ✗ Gemini parser failed: %s", exc)
        return None


# ─── OpenAI provider ──────────────────────────────────────────────────────────

def _parse_with_openai(email_text: str, year: int, team: str, school: str) -> dict | None:
    try:
        from openai import OpenAI  # type: ignore

        logger.info("  → Calling OpenAI GPT-4o-mini...")
        t0 = time.time()

        client = OpenAI(api_key=OPENAI_API_KEY)
        prompt = _build_user_message(email_text, year, team, school)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )

        elapsed = time.time() - t0
        logger.info("  → OpenAI responded in %.2fs", elapsed)

        result = json.loads(response.choices[0].message.content)
        rows = _normalise_rows(result.get("rows", []))
        metadata = result.get("metadata", {})
        _log_parsed_rows(rows, metadata, "openai")
        return {"rows": rows, "metadata": metadata, "source": "openai"}
    except Exception as exc:
        logger.warning("  ✗ OpenAI parser failed: %s", exc)
        return None


# ─── Public entry point ───────────────────────────────────────────────────────

def parse_email_with_llm(email_text: str, year: int = 2026, team: str = "", school: str = "") -> dict | None:
    """
    Parse an intake email with the best available LLM provider.
    Priority: Gemini 2.5 Flash → OpenAI GPT-4o-mini → None (frontend fallback).
    """
    logger.info("══ INTAKE PARSE ══ team=%r school=%r email_len=%d chars",
                team or "?", school or "?", len(email_text))

    if GEMINI_API_KEY:
        logger.info("  Provider: Gemini 2.5 Flash (primary)")
        result = _parse_with_gemini(email_text, year, team, school)
        if result:
            return result
        logger.warning("  Gemini failed — falling back to OpenAI")

    if OPENAI_API_KEY:
        logger.info("  Provider: OpenAI GPT-4o-mini (fallback)")
        result = _parse_with_openai(email_text, year, team, school)
        if result:
            return result

    logger.warning("  No LLM available — frontend will use local parser")
    return None
