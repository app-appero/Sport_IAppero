from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    soccer_oracle_base_url: str = "https://soccer-oracle-api-dev.up.railway.app"
    tennis_oracle_base_url: str = "https://tennisoracle-backend-dev.up.railway.app"

    provider_connect_timeout: float = 3.0
    provider_read_timeout: float = 15.0

    use_provider_fixtures: bool = False

    # Optional API keys / static bearer (legacy)
    soccer_oracle_api_key: str | None = None
    tennis_oracle_api_key: str | None = None
    tennis_oracle_bearer_token: str | None = None

    # Username/password login (Tennis today; Soccer later)
    tennis_oracle_username: str | None = None
    tennis_oracle_password: str | None = None
    soccer_oracle_username: str | None = None
    soccer_oracle_password: str | None = None

    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
