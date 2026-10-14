"""Vista "Cartellini giocatori": probabilita' che un titolare prenda un giallo.

Stesso schema dei marcatori (`scorers_service`): dati dell'engine Soccer (formazione ufficiale, ultima
revisione per partita). Il BFF non calcola nulla: ordina, raggruppa e dichiara cosa la probabilita' significa."""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ProviderError
from app.services.registry import get_provider
from app.services.scorers_service import TOP_PER_TEAM, group_by_fixture

MARKET_NOTE = (
    "Probabilita' che il giocatore venga ammonito (giallo, secondo giallo incluso) nei tempi regolamentari, "
    "stimata dal modello sulla formazione ufficiale: dipende da ruolo, cartellini recenti, squadra e arbitro. "
    "Non e' una quota."
)


async def get_event_player_cards(event_id: str) -> dict[str, Any]:
    """Gialli probabili di una partita. `status`: "ready" | "lineup_pending" | "unsupported" (come i marcatori).
    `top` = i primi 3 per squadra (sezione dell'app); `players` = tutti i titolari."""
    provider = get_provider("football")
    if provider is None:
        raise ProviderError("soccer", "Provider calcio non configurato")
    result = await provider.get_player_cards_for_fixture(event_id)
    fixtures = group_by_fixture(result["rows"], hit_field="yellow", out_field="booked")
    if not fixtures:
        status = "lineup_pending" if result["supported"] else "unsupported"
        return {"event_id": event_id, "available": False, "status": status, "note": MARKET_NOTE, "teams": []}
    fixture = fixtures[0]
    teams: dict[Any, dict[str, Any]] = {}
    for p in fixture["players"]:
        team = teams.setdefault(p["team_id"], {"team_id": p["team_id"], "team": p["team"], "players": []})
        team["players"].append(p)
    out = []
    for team in teams.values():
        team["top"] = team["players"][:TOP_PER_TEAM]
        team["expected_yellows"] = round(sum(p["probability"] for p in team["players"]), 2)
        out.append(team)
    return {
        "event_id": event_id, "available": True, "status": "ready", "note": MARKET_NOTE,
        "kickoff": fixture["kickoff"], "model_version": fixture["model_version"],
        "lineup_type": fixture["lineup_type"], "teams": out,
    }
