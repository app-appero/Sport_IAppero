# Sport IApperò — Backend

FastAPI BFF for Sport IApperò.

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
- http://localhost:8000/privacy (bozza di informativa privacy, da completare e far verificare; testo in `app/legal/privacy_text.py`, copia in `Sport_IAppero-documentazione-v2/docs/legal/PRIVACY_POLICY_BOZZA.md`, da tenere allineate)
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
   - `SOCCER_ORACLE_USERNAME`, `SOCCER_ORACLE_PASSWORD` (login `POST /auth/login`)
   - `TENNIS_ORACLE_USERNAME`, `TENNIS_ORACLE_PASSWORD`
   - `LOG_LEVEL=INFO`
   (`PORT` è impostata da Railway; il container fa bind su `${PORT}`.)
4. **Settings → Networking → Generate Domain**, poi verifica `https://<dominio>/api/v1/health`.
5. Nel mobile imposta `EXPO_PUBLIC_API_URL=https://<dominio>`.


## Persistenza e storico (Sprint 3)

- `DATABASE_URL` (PostgreSQL; `postgres://` e `postgresql://` vengono convertiti per asyncpg). Se assente, nessun database: feed e API come prima.
- All'avvio il BFF applica le migrazioni Alembic (`app/db/migrations`). Se il DB non risponde, la persistenza resta spenta e il feed continua a funzionare (`/ready` mostra `persistence`).
- Le predizioni viste nel feed sono salvate append-only (`source=feed_observed`, mai ufficiali). Il ledger ufficiale Soccer viene letto ogni `LEDGER_SYNC_INTERVAL_SECONDS` (default 900).
- `GET /api/v1/history/stats` e `GET /api/v1/history/predictions`: win rate = won/(won+lost), con void, pending e non piazzate dichiarati a parte. Entrano solo pubblicazioni ufficiali con `captured_at` precedente al calcio d'inizio e, per default, solo la decisione `PLAY` (`?decision=all|NO BET|BORDERLINE` per il resto). I nomi delle partite di calcio vengono recuperati dal provider giorno per giorno e mai inventati.
- Test locali: `pip install -e ".[dev]" && pytest` (SQLite in memoria/file temporaneo, nessun Postgres richiesto).

### Ledger Tennis

Il BFF legge `/api/published-predictions` (solo `official_only`, ultima versione) e gli esiti da `/api/live-beta-dashboard`, giorno per giorno e mercato per mercato: l'esito lo decide Tennis Oracle, il BFF non lo calcola. Il router published è protetto da `require_admin`, quindi servono `TENNIS_ORACLE_USERNAME` e `TENNIS_ORACLE_PASSWORD` (già usati per il feed). Il provider rifiuta di pubblicare o correggere dopo l'inizio della partita; l'orario d'inizio è data/ora locale Europe/Rome, e senza `event_time` la riga resta fuori dalle statistiche (dichiarata come esclusa).


## Accesso con Google (facoltativo)

- `POST /api/v1/auth/google` (body `{"id_token": "..."}`): verifica il token con le chiavi pubbliche di Google (audience = `GOOGLE_CLIENT_IDS`), crea o ritrova l'utente e risponde con una sessione del BFF (`SESSION_SECRET`, `SESSION_TTL_DAYS`). `GET /api/v1/me` e `DELETE /api/v1/me` richiedono `Authorization: Bearer <sessione>`.
- Serve la persistenza. Senza `GOOGLE_CLIENT_IDS` o `SESSION_SECRET` rispondono `503 auth_disabled` e il resto dell'API non cambia.
- Salviamo nome, email (solo se verificata da Google) e foto. Cancellando l'account si eliminano utente e identità e il token smette di valere subito.
