from abc import ABC, abstractmethod
from typing import Any

from app.domain.models import Competition, Event, MarketInfo, UnifiedPrediction


class SportProvider(ABC):
    sport: str
    provider_name: str

    @abstractmethod
    async def get_competitions(self, **filters: Any) -> list[Competition]:
        raise NotImplementedError

    @abstractmethod
    async def get_events(self, **filters: Any) -> list[Event]:
        raise NotImplementedError

    @abstractmethod
    async def get_markets(self, **filters: Any) -> list[MarketInfo]:
        raise NotImplementedError

    @abstractmethod
    async def get_predictions(self, **filters: Any) -> list[UnifiedPrediction]:
        raise NotImplementedError

    @abstractmethod
    async def get_prediction(
        self, prediction_id: str, **filters: Any
    ) -> UnifiedPrediction | None:
        raise NotImplementedError

    @abstractmethod
    async def healthcheck(self) -> dict[str, Any]:
        raise NotImplementedError

    async def aclose(self) -> None:
        return None
