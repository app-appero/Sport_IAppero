from functools import lru_cache

from app.core.config import get_settings
from app.providers.base import SportProvider
from app.providers.soccer.client import SoccerProvider
from app.providers.tennis.client import TennisProvider


@lru_cache
def get_providers() -> dict[str, SportProvider]:
    settings = get_settings()
    soccer = SoccerProvider(settings)
    tennis = TennisProvider(settings)
    return {
        soccer.sport: soccer,
        tennis.sport: tennis,
    }


def get_provider(sport: str) -> SportProvider | None:
    return get_providers().get(sport)


async def close_providers() -> None:
    for provider in get_providers().values():
        await provider.aclose()
    get_providers.cache_clear()
