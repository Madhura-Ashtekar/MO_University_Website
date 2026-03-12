from __future__ import annotations


def classify(meal_type: str, location_type: str, notes: str) -> tuple[bool, str]:
    text = f"{meal_type or ''} {location_type or ''} {notes or ''}".lower()
    if "per diem" in text or "per-diem" in text or location_type in ("perdiem", "airport"):
        return (False, "not_mo")
    if "provided" in text or "at field" in text:
        return (False, "not_mo")
    if "tbd" in text:
        return (False, "tbd")
    return (True, "mo_delivery")


def derive_event_context(meal_type: str, location_type: str, notes: str) -> str:
    text = f"{meal_type or ''} {location_type or ''} {notes or ''}".lower()
    if "pre-game" in text or "pregame" in text:
        return "pre_game"
    if "post-game" in text or "post game" in text or "recovery" in text:
        return "post_game"
    if location_type in ("airport", "bus"):
        return "travel"
    if "practice" in text:
        return "practice"
    return "travel"

