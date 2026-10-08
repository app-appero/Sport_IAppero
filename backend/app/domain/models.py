from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Competition(BaseModel):
    id: str | None = None
    name: str


class Participant(BaseModel):
    id: str | None = None
    name: str
    role: str | None = None


class Event(BaseModel):
    id: str
    name: str
    competition: Competition | None = None
    start_time: datetime | None = None
    participants: list[Participant] = Field(default_factory=list)
    status: str | None = None


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
