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

## Verifica rilascio

- [x] Dominio BFF dev pubblicato
- [ ] SHA commit deployato registrato
- [ ] Variabili effettive verificate (fixtures off in Railway)
- [ ] Feed live: ok / degraded / empty collaudati
- [ ] Token Tennis e Soccer day popolato
- [ ] Assenza segreti nel bundle mobile
