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
    """In-progress snapshot. Tennis fills sets, the current game and the server; football fills the minute."""

    is_live: bool = True
    # Football: elapsed minute (e.g. 63). Empty at the break, when stoppage time is shown in status_detail.
    minute: int | None = None
    # Games per set as [home, away], in play order, e.g. [[6, 4], [3, 2]].
    sets: list[list[int]] = Field(default_factory=list)
    # Points in the current game as shown by the provider, e.g. "30 - 15".
    current_game: str | None = None
    server: Literal["home", "away"] | None = None
    # Provider status text, e.g. "Set 2".
    status_detail: str | None = None


class UnavailableMarket(BaseModel):
    """A market the engine could not predict for an event. `reason` is the engine's
    own code (e.g. no_odds_for_market, missing_persisted_prediction); None when the
    engine gives none. The aggregation layer never guesses a reason."""

    market: str
    reason: str | None = None


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
    # Additive. Markets the engine lists for this event without a prediction, with the
    # reason the engine itself declares. Empty when the engine reports none.
    unavailable_markets: list[UnavailableMarket] = Field(default_factory=list)


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


class ModelInfo(BaseModel):
    """Model behind one prediction, as declared by the engine.

    `version` is the engine's own identifier of the trained artifact: the model
    version for tennis ("v4"), the training-run id for football. It is an
    identifier, not a timestamp of when the prediction was computed."""

    name: str | None = None
    version: str | None = None


class Availability(BaseModel):
    """Whether the prediction carries a usable probability.

    - available: a probability is present and the engine flags no gap in its inputs;
    - limited: a probability is present but the engine declares a gap (`reason`);
    - unavailable: the engine returned the market without a probability."""

    status: Literal["available", "limited", "unavailable"]
    reason: str | None = None


class DataFreshness(BaseModel):
    """Timestamps the engines really record. A missing value means "not recorded",
    never "fresh". `timezone_explicit` is False when the engine sends timestamps
    without an offset (server clock, zone not declared): they are passed through
    unchanged, no zone is assumed."""

    predicted_at: datetime | None = None
    event_data_updated_at: datetime | None = None
    live_updated_at: datetime | None = None
    odds_captured_at: datetime | None = None
    timezone_explicit: bool | None = None


class Provenance(BaseModel):
    """Where the numbers come from. `data_quality` is the engine's own evidence
    report, passed through as received."""

    engine: str
    source: str | None = None
    data_quality: dict[str, Any] | None = None


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
    # True when the provider flags the prediction as less reliable (e.g. an
    # unquoted line the model is known to handle worse); None when not flagged.
    low_reliability: bool | None = None


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
    # Additive fields (same meaning for every sport). All optional: clients that
    # ignore them keep working, engines that do not send the data leave them empty.
    model: ModelInfo | None = None
    availability: Availability | None = None
    data_freshness: DataFreshness | None = None
    provenance: Provenance | None = None
    anomalies: list[str] = Field(default_factory=list)
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
    # Additive. Seconds between the snapshot build (`generated_at`) and this response.
    snapshot_age_seconds: float | None = None
    # Additive. True when a rebuild failed and an older snapshot is served instead.
    is_stale: bool = False


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
