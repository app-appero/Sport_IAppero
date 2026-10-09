# Configurazione Railway — riferimenti reali e BFF

## Domini

| Servizio | URL |
|---|---|
| **BFF Sport_IAppero (dev)** | https://bff-sport-iappero-dev.up.railway.app |
| Soccer Oracle (dev) | https://soccer-oracle-api-dev.up.railway.app |
| Tennis Oracle (dev) | https://tennisoracle-backend-dev.up.railway.app |

Git sorgenti motori:
- https://github.com/romy1992/ia_predict_soccer.git
- https://github.com/romy1992/tennis_oracle.git

Il BFF è un servizio API separato (repo Sport_IAppero, contesto `backend/`). Health liveness: `GET /health` (non interroga i provider). Readiness: `GET /ready`. Feed unificato: `GET /api/v1/feed`. Docs: `/docs`.

## Config BFF

| Variabile | Valore/default | Utilizzo |
|---|---|---|
| SOCCER_ORACLE_BASE_URL | https://soccer-oracle-api-dev.up.railway.app | Solo lato server |
| TENNIS_ORACLE_BASE_URL | https://tennisoracle-backend-dev.up.railway.app | Solo lato server |
| TENNIS_ORACLE_USERNAME / PASSWORD | Segreti | Login Tennis upstream |
| TENNIS_ORACLE_BEARER_TOKEN | Opzionale | Alternativa al login |
| SOCCER_ORACLE_USERNAME / PASSWORD | Segreti | Login Soccer `POST /auth/login` (dashboard protetto) |
| SOCCER_ORACLE_API_KEY | Opzionale | Solo se upstream accetta `X-API-Key` al posto del login |
| USE_PROVIDER_FIXTURES | false in Railway | true solo locale/test |
| APP_TIMEZONE | Europe/Rome | Query giorno consumer |
| PROVIDER_CONNECT_TIMEOUT | 3 | |
| PROVIDER_READ_TIMEOUT | 15 | |
| FEED_DEADLINE_SECONDS | 10 | Budget per sport nel feed |
| CACHE_TTL_SECONDS | 60 | Fresh cache feed |
| CACHE_STALE_MAX_SECONDS | 300 | Serve stale se rebuild fallisce |
| SNAPSHOT_TTL_SECONDS | 300 | Cursor/snapshot pagination |
| PROVIDER_MAX_ITEMS | 1000 | Truncation dichiarata |
| PORT | Iniettata da Railway | Binding 0.0.0.0 |
| LOG_LEVEL | INFO | Log sanificati |

Mobile: `EXPO_PUBLIC_API_URL=https://bff-sport-iappero-dev.up.railway.app`. Nessun token in `EXPO_PUBLIC_*`.

## Deployment

Dockerfile con contesto `backend/`, dipendenze FastAPI/httpx/Pydantic; nessun dataset o artifact pickle. Command: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Dev e production separati con base URL esplicite; non puntare automaticamente produzione verso i due motori dev.

Config in repo: `backend/railway.json` (builder Dockerfile, healthcheck `/api/v1/health`).

## Auto-deploy da GitHub (`main`)

Impostazione **solo dalla dashboard Railway** (richiede account owner del progetto). Non è configurabile dal codice del repo senza token Railway.

1. Apri il servizio BFF → **Settings** → **Source**
2. **Connect GitHub Repo** → `app-appero/Sport_IAppero` (autorizza l’org se richiesto)
3. **Branch**: `main`
4. Scegli **una** delle due config (non mischiarle):

   | Opzione | Root Directory | Dockerfile |
   |---|---|---|
   | A (consigliata) | `backend` | `backend/Dockerfile` |
   | B (root monorepo) | `/` (vuoto) | `Dockerfile` in root del repo |

   Errore tipico di build: `COPY pyproject.toml` / `"/app": not found` → Root Directory non allineato al Dockerfile.
5. **Wait for CI** / checks: off (salvo CI obbligatori)
6. Assicurati che **Deploy Triggers** / deploy on push sia attivo sul branch `main`
7. Opzionale: **Watch Paths** → `backend/**` (evita redeploy per sole modifiche mobile/docs)
8. Se il deploy fallisce: apri **Build Logs** e verifica che stia usando il Dockerfile giusto

Verifica: un commit su `main` che tocca `backend/` deve creare un deployment automatico; poi:

```bash
curl -sS https://bff-sport-iappero-dev.up.railway.app/health
curl -sS 'https://bff-sport-iappero-dev.up.railway.app/api/v1/feed?limit=1'
```

Se Source è già collegato ma non redeploya: controlla branch watched = `main`, root = `backend`, e che il merge sia arrivato su GitHub.

## Verifica rilascio

- [x] Dominio BFF dev pubblicato
- [x] SHA commit deployato registrato (`/ready` → `git_sha`; `unknown` se Railway non inietta il commit)
- [ ] Variabili effettive verificate (fixtures off in Railway)
- [ ] Feed live: ok / degraded / empty collaudati
- [ ] Token Tennis e Soccer day popolato
- [ ] Assenza segreti nel bundle mobile

Dopo ogni deploy: `curl -sS https://bff-sport-iappero-dev.up.railway.app/ready` e confrontare `git_sha` con `git rev-parse HEAD` su `main`.
