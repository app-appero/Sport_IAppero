# Oracle Sports Backend

FastAPI BFF for Sport_IAppero / Oracle Sports.

Aggregates:

- Soccer Oracle → sport `football` / provider `soccer-oracle`
- Tennis Oracle → sport `tennis` / provider `tennis-oracle`

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env

# Demo mode (local fixtures — use when upstream Railway apps are down)
export USE_PROVIDER_FIXTURES=true

uvicorn app.main:app --reload --port 8000
```

Without activating the venv:

```bash
cd backend
USE_PROVIDER_FIXTURES=true .venv/bin/uvicorn app.main:app --reload --port 8000
```

Open:

- http://localhost:8000/docs
- http://localhost:8000/health · http://localhost:8000/ready
- http://localhost:8000/api/v1/feed
- http://localhost:8000/api/v1/sports/football/predictions
- http://localhost:8000/api/v1/sports/tennis/predictions

Deployed dev BFF: https://bff-sport-iappero-dev.up.railway.app

### Railway auto-deploy

Collega il servizio a GitHub (`main`, root directory `backend`) dalla dashboard Railway — vedi `Sport_IAppero-documentazione-v2/docs/11_CONFIGURAZIONE_RAILWAY.md`. Ogni push/merge su `main` (con path `backend/`) deve triggerare un deploy.

## Tests

```bash
cd backend
USE_PROVIDER_FIXTURES=true python3 -m pytest -q
```

## Live upstream

```bash
cd backend
source .venv/bin/activate
cp .env.example .env
# set TENNIS_ORACLE_USERNAME / TENNIS_ORACLE_PASSWORD in .env
export USE_PROVIDER_FIXTURES=false
uvicorn app.main:app --reload --port 8000
```

- Soccer day filter uses upstream `target_date`.
- Tennis login is performed automatically by the adapter.
- Never commit `.env` (passwords).

## Notes

- Upstream OpenAPI discovery docs: `../sport_IAppero-docs/provider-soccer-api.md` and `provider-tennis-api.md`.
- Fixture mode remains available for offline/dev.

## Deploy su Railway

1. Railway → **New Project** → nome `sport_IAppero` → **Deploy from GitHub repo** → `app-appero/Sport_IAppero`.
2. Nel servizio: **Settings → Root Directory** = `backend` (legge `railway.json` + `Dockerfile`).
3. **Variables**:
   - `USE_PROVIDER_FIXTURES=false`
   - `SOCCER_ORACLE_BASE_URL`, `TENNIS_ORACLE_BASE_URL` (default in `.env.example`)
   - `TENNIS_ORACLE_USERNAME`, `TENNIS_ORACLE_PASSWORD`
   - `LOG_LEVEL=INFO`
   (`PORT` è impostata da Railway; il container fa bind su `${PORT}`.)
4. **Settings → Networking → Generate Domain**, poi verifica `https://<dominio>/api/v1/health`.
5. Nel mobile imposta `EXPO_PUBLIC_API_URL=https://<dominio>`.
