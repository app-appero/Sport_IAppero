from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class Competition(BaseModel):
    id: str | None = None
    name: str


class Participant(BaseModel):
    id: str | None = None
    name: str
    role: str | None = None


class EventScore(BaseModel):
    """Final or live score. Football uses home/away; tennis may use display only."""

    home: int | float | None = None
    away: int | float | None = None
    display: str | None = None


class LiveState(BaseModel):
    """In-progress snapshot of a match (tennis): games per set, the current game and who serves."""

    is_live: bool = True
    # Games per set as [home, away], in play order, e.g. [[6, 4], [3, 2]].
    sets: list[list[int]] = Field(default_factory=list)
    # Points in the current game as shown by the provider, e.g. "30 - 15".
    current_game: str | None = None
    server: Literal["home", "away"] | None = None
    # Provider status text, e.g. "Set 2".
    status_detail: str | None = None


class Event(BaseModel):
    id: str
    name: str
    competition: Competition | None = None
    start_time: datetime | None = None
    # Source calendar day (YYYY-MM-DD) when timezone is unknown — used for day filters.
    calendar_date: str | None = None
    # Provider clock time "HH:MM" with NO timezone claim: only good for ordering matches of the same day.
    local_time: str | None = None
    participants: list[Participant] = Field(default_factory=list)
    status: str | None = None
    score: EventScore | None = None
    live: LiveState | None = None
    actual_totals: dict[str, Any] | None = None


class Selection(BaseModel):
    id: str | None = None
    name: str


class PredictionValue(BaseModel):
    type: str
    selection: Selection
    confidence: float | None = None


class Probability(BaseModel):
    key: str
    label: str
    value: float


class ProviderMetadata(BaseModel):
    name: str
    version: str | None = None


class PricingInfo(BaseModel):
    """Optional bookmaker / model pricing from provider decision cards."""

    odds_decimal: float | None = None
    expected_value: float | None = None
    probability_edge: float | None = None
    fair_odds: float | None = None
    bookmakers_count: int | None = None


class DecisionInfo(BaseModel):
    """Provider value decision (PLAY / BORDERLINE / NO BET, …)."""

    code: str | None = None
    reason: str | None = None
    policy_version: str | None = None


class MarketInfo(BaseModel):
    key: str
    name: str
    sport: str
    provider: str


class UnifiedPrediction(BaseModel):
    id: str
    sport: str
    event: Event
    prediction: PredictionValue
    probabilities: list[Probability] = Field(default_factory=list)
    provider: ProviderMetadata
    oracle_score: float | None = None
    generated_at: datetime | None = None
    correct: bool | None = None
    pricing: PricingInfo | None = None
    decision: DecisionInfo | None = None
    raw: dict[str, Any] | None = Field(default=None, exclude=True)


class SportInfo(BaseModel):
    id: str
    name: str
    provider: str
    enabled: bool = True


class ProviderHealth(BaseModel):
    provider: str
    status: str
    detail: str | None = None


class ListMeta(BaseModel):
    count: int
    sport: str
    provider: str
    provider_status: str = "ok"


class PredictionListResponse(BaseModel):
    items: list[UnifiedPrediction]
    meta: ListMeta


class EventListResponse(BaseModel):
    items: list[Event]
    meta: ListMeta


class CompetitionListResponse(BaseModel):
    items: list[Competition]
    meta: ListMeta


class MarketListResponse(BaseModel):
    items: list[MarketInfo]
    meta: ListMeta


class FeedQuery(BaseModel):
    date: str | None = None
    timezone: str = "Europe/Rome"
    sports: list[str] = Field(default_factory=lambda: ["football", "tennis"])
    market: str | None = None
    competition: str | None = None
    sort: str = "start_time_asc"
    limit: int = 30


class FeedPage(BaseModel):
    limit: int
    next_cursor: str | None = None


class ProviderFeedStatus(BaseModel):
    provider: str
    status: str
    item_count: int = 0
    truncated: bool = False


class FeedMeta(BaseModel):
    status: str
    is_complete: bool
    providers: list[ProviderFeedStatus] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class FeedItem(BaseModel):
    event: Event
    predictions: list[UnifiedPrediction] = Field(default_factory=list)
    sport: str


class FeedResponse(BaseModel):
    schema_version: str = "1"
    snapshot_id: str
    generated_at: datetime
    query: FeedQuery
    items: list[FeedItem] = Field(default_factory=list)
    page: FeedPage
    meta: FeedMeta
