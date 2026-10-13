"""Vista "Marcatori": probabilita' che un giocatore segni, raggruppate per partita.

Dati dell'engine Soccer (formazione ufficiale, un'ultima revisione per partita). Il BFF non calcola
nulla: ordina, raggruppa e dichiara cosa la probabilita' significa."""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ProviderError
from app.services.registry import get_provider

MARKET_NOTE = (
    "Probabilita' che il giocatore segni almeno un gol nei tempi regolamentari (autogol esclusi), "
    "stimata dal modello sulla formazione ufficiale. Non e' una quota."
)


def group_by_fixture(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fixtures: dict[int, dict[str, Any]] = {}
    for r in rows:
        f = fixtures.setdefault(int(r["fixture_id"]), {
            "event_id": str(r["fixture_id"]), "kickoff": r.get("kickoff"), "league": r.get("league"),
            "lineup_type": r.get("lineup_type", "official"), "model_version": r.get("model_version"),
            "players": [],
        })
        f["players"].append({
            "player_id": r["player_id"], "name": r.get("player_name"), "team_id": r.get("team_id"),
            "team": r.get("team_name"), "position": r.get("position"),
            "probability": round(float(r["probability"]), 4), "scored": r.get("scored"),
        })
    out = sorted(fixtures.values(), key=lambda f: (f["kickoff"] or "", f["event_id"]))
    for f in out:
        f["players"].sort(key=lambda p: -p["probability"])
    return out


async def get_scorers(day: str) -> dict[str, Any]:
    provider = get_provider("football")
    if provider is None:
        raise ProviderError("soccer", "Provider calcio non configurato")
    rows = await provider.get_scorers(day)
    fixtures = group_by_fixture(rows)
    return {"date": day, "note": MARKET_NOTE, "count": len(fixtures), "fixtures": fixtures}


TOP_PER_TEAM = 3


async def get_event_scorers(event_id: str) -> dict[str, Any]:
    """Marcatori di una partita: `available=False` finche' la formazione ufficiale non e' pubblicata.
    `top` = i primi 3 per squadra (sezione dell'app); `players` = tutti i titolari (web)."""
    provider = get_provider("football")
    if provider is None:
        raise ProviderError("soccer", "Provider calcio non configurato")
    rows = await provider.get_scorers_for_fixture(event_id)
    fixtures = group_by_fixture(rows)
    if not fixtures:
        return {"event_id": event_id, "available": False, "note": MARKET_NOTE, "teams": []}
    fixture = fixtures[0]
    teams: dict[Any, dict[str, Any]] = {}
    for p in fixture["players"]:
        team = teams.setdefault(p["team_id"], {"team_id": p["team_id"], "team": p["team"], "players": []})
        team["players"].append(p)
    out = []
    for team in teams.values():
        team["top"] = team["players"][:TOP_PER_TEAM]
        team["expected_scorers"] = round(sum(p["probability"] for p in team["players"]), 2)
        out.append(team)
    return {"event_id": event_id, "available": True, "note": MARKET_NOTE, "kickoff": fixture["kickoff"],
            "model_version": fixture["model_version"], "lineup_type": fixture["lineup_type"], "teams": out}
