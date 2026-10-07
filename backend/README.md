# Oracle Sports Backend

FastAPI BFF for Sport_IAppero / Oracle Sports.

Aggregates:

- Soccer Oracle → sport `football` / provider `soccer-oracle`
- Tennis Oracle → sport `tennis` / provider `tennis-oracle`

## Quick start

```bash
cd backend
python3 -m pip install -e ".[dev]"
cp .env.example .env

# Demo mode (local fixtures — use when upstream Railway apps are down)
export USE_PROVIDER_FIXTURES=true

uvicorn app.main:app --reload --port 8000
```

Open:

- http://localhost:8000/docs
- http://localhost:8000/api/v1/health
- http://localhost:8000/api/v1/sports/football/predictions
- http://localhost:8000/api/v1/sports/tennis/predictions

## Tests

```bash
cd backend
USE_PROVIDER_FIXTURES=true python3 -m pytest -q
```

## Notes

- Upstream OpenAPI discovery docs: `../sport_IAppero-docs/provider-soccer-api.md` and `provider-tennis-api.md`.
- When Soccer/Tennis Oracle are online, set `USE_PROVIDER_FIXTURES=false` and point base URLs in `.env`.
- Mappers are tolerant to multiple JSON shapes; re-capture real samples when APIs return.
