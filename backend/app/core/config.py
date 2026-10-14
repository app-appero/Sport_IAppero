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

    # Feed / cache (B05–B06)
    app_timezone: str = "Europe/Rome"
    cache_ttl_seconds: int = 60
    cache_stale_max_seconds: int = 300
    feed_deadline_seconds: float = 10.0
    # Safety ceiling only (pagination / upstream day limit). Day feeds request the full day.
    provider_max_items: int = 10000
    snapshot_ttl_seconds: int = 300

    # Deploy identity (D02). Railway injects RAILWAY_GIT_COMMIT_SHA when linked to GitHub.
    git_sha: str | None = None
    railway_git_commit_sha: str | None = None

    # Persistence (Sprint 3). Unset = no database, BFF behaves as in Sprint 2.
    database_url: str | None = None
    # Poll the Soccer official ledger for new publications / settlements.
    ledger_sync_enabled: bool = True
    ledger_sync_interval_seconds: int = 900

    # Optional sign-in (Sprint 4). Needs persistence plus both values below.
    # Comma-separated OAuth client IDs accepted as the audience of Google ID tokens
    # (the Web client ID used by the app, plus any other client you issue tokens for).
    google_client_ids: str | None = None
    # HS256 secret for the BFF's own session tokens. Use a long random value; rotating it
    # signs everybody out.
    session_secret: str | None = None
    # Comma-separated Google emails with full control (promote admins, see audit). Never stored in the DB.
    super_admin_emails: str | None = None
    session_ttl_days: int = 30

    log_level: str = "INFO"

    @property
    def super_admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in (self.super_admin_emails or '').split(',') if e.strip()}

    @property
    def google_audiences(self) -> list[str]:
        return [x.strip() for x in (self.google_client_ids or "").split(",") if x.strip()]

    @property
    def deploy_sha(self) -> str:
        # The Dockerfile bakes GIT_SHA=unknown as a fallback; it must not mask the commit
        # Railway injects at runtime (RAILWAY_GIT_COMMIT_SHA).
        for candidate in (self.git_sha, self.railway_git_commit_sha):
            value = (candidate or "").strip()
            if value and value.lower() != "unknown":
                return value
        return "unknown"


@lru_cache
def get_settings() -> Settings:
    return Settings()
