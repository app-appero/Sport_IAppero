"""Names of the football leagues the Soccer engine imports (API-Sports league ids).

Source: the engine's own list of configured leagues (`download_match_service.py`, `app_config.py`). The engine
sends only the numeric id for part of the history, so the BFF puts the name back instead of showing "League 138".
"""

from __future__ import annotations

import re

SOCCER_LEAGUE_NAMES: dict[str, str] = {
    "135": "Serie A",
    "136": "Serie B",
    "137": "Coppa Italia",
    "138": "Serie C - Girone A",
    "942": "Serie C - Girone B",
    "943": "Serie C - Girone C",
    "2": "Champions League",
    "3": "Europa League",
    "848": "Conference League",
    "140": "La Liga",
    "78": "Bundesliga",
    "39": "Premier League",
    "88": "Eredivisie",
    "492": "Eerste Divisie",
    "94": "Primeira Liga",
    "144": "Jupiler Pro League",
    "61": "Ligue 1",
    "203": "Süper Lig",
}

_PLACEHOLDER = re.compile(r"^\s*League\s+(\d+)\s*$", re.IGNORECASE)
_PREFIX = re.compile(r"^\s*League\s+(.+?)\s*$", re.IGNORECASE)


def soccer_league_name(league_id: object) -> str | None:
    return SOCCER_LEAGUE_NAMES.get(str(league_id).strip()) if league_id is not None else None


def placeholder_league_id(name: str | None) -> str | None:
    """"League 138" is what the BFF used when it knew only the id: return "138", else None."""
    match = _PLACEHOLDER.match(name) if name else None
    return match.group(1) if match else None


def real_league_name(name: str | None) -> str | None:
    """A usable league name: the stored text without the "League " prefix the BFF used to add when the engine
    sent the name in the id field ("League Serie A" -> "Serie A"). None when only an id is left ("League 138")."""
    if not name or not name.strip():
        return None
    match = _PREFIX.match(name)
    rest = (match.group(1) if match else name).strip()
    return None if rest.isdigit() else rest
