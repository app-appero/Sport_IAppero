# Riferimenti e verifiche

Data audit: 2026-10-07. Solo letture; nessun training, import, refresh forzato o deployment.

## Repository reali

| Motore | Repository | Clone HTTPS | Branch e commit esaminato |
|---|---|---|---|
| Calcio | https://github.com/romy1992/ia_predict_soccer | https://github.com/romy1992/ia_predict_soccer.git | main, `6bab8e3f8ba7ce38775a32f0082e8c01457f2eb4` |
| Tennis | https://github.com/romy1992/tennis_oracle | https://github.com/romy1992/tennis_oracle.git | main, `48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a` |
| Aggregatore | Sport_IAppero, `https://bff-sport-iappero-dev.up.railway.app` | Impostato | Verificato: `/ready` con `persistence: true`, feed e storico rispondono |

Entrambi i repository sorgente risultano pubblici. L'accesso disponibile è di lettura. Il commit effettivamente distribuito su Railway non è stato verificato: un commit GitHub non prova la versione del deployment.

## Tutti i riferimenti Railway disponibili

| Motore | Base URL fornita dall'utente | Swagger atteso | OpenAPI verificata |
|---|---|---|---|
| Calcio | https://soccer-oracle-api-dev.up.railway.app | https://soccer-oracle-api-dev.up.railway.app/docs | https://soccer-oracle-api-dev.up.railway.app/openapi.json |
| Tennis | https://tennisoracle-backend-dev.up.railway.app | https://tennisoracle-backend-dev.up.railway.app/docs | https://tennisoracle-backend-dev.up.railway.app/openapi.json |

Entrambe le OpenAPI restituiscono HTTP 200. Titoli: Soccer ML Platform API e Tennis Oracle API, entrambe version `0.1.0`. Swagger è il percorso predefinito atteso dal codice FastAPI, non è stata verificata l'interfaccia in browser.

Non sono disponibili URL della dashboard Railway, project ID, environment ID, service ID, URL produzione, domini privati, nomi degli scheduler o credenziali database. I domini contengono `dev`; non sono una promessa di stabilità o configurazione produttiva. Non inventare riferimenti mancanti.

## Richieste effettivamente osservate

| Richiesta | Risultato | Conseguenza |
|---|---|---|
| Soccer `/openapi.json` | 200 | Snapshot incluso |
| Tennis `/openapi.json` | 200 | Snapshot incluso; prefisso distribuito `/api` |
| Soccer `/dashboard/day?target_date=2026-10-07&limit=1&with_predictions=true&force_refresh=false` | 200, total=0, rows=[] | Feed vuoto valido; nessun esempio completo di riga ottenuto |
| Soccer `/predictions/official/plays?limit=1` | 200, una riga storica conclusa | Payload reale incluso; non prova disponibilità di eventi futuri |
| Tennis `/api/next-fixtures/predictions?limit=1` senza token | 401 | Necessario accesso autorizzato per test payload |
| Tennis `/api/published-predictions?limit=1` senza token | 401 dopo un primo timeout | Registro protetto da admin JWT |
| Soccer `/markets` | timeout della singola prova | Route presente in codice/OpenAPI, payload non acquisito |

La response day dichiara i mercati attivi `cards_line_3_5`, `cards_line_4_5`, `cards_line_5_5`, `cards_line_6_5`, `dc`, `goal_no_goal`, `h2h`, `under_over_1_5`, `under_over_2_5`, `under_over_3_5`. È una fotografia del deployment, non un elenco immutabile.

## Fonti da rileggere quando cambia il codice

Calcio, link ancorati al commit:
- https://github.com/romy1992/ia_predict_soccer/blob/6bab8e3f8ba7ce38775a32f0082e8c01457f2eb4/backend/src/api/main.py
- https://github.com/romy1992/ia_predict_soccer/blob/6bab8e3f8ba7ce38775a32f0082e8c01457f2eb4/backend/src/api/schemas.py
- https://github.com/romy1992/ia_predict_soccer/blob/6bab8e3f8ba7ce38775a32f0082e8c01457f2eb4/backend/src/api/dashboard_service.py
- https://github.com/romy1992/ia_predict_soccer/blob/6bab8e3f8ba7ce38775a32f0082e8c01457f2eb4/docker-compose.yml

Tennis:
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/main.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/api/routes/predictions.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/schemas/prediction.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/services/predictions.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/api/deps.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/schemas/published_prediction.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/api/routes/published_predictions.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/src/app/core/config.py
- https://github.com/romy1992/tennis_oracle/blob/48a7f1040d018ae8a8b79e1b0b84e5e5dcb3d50a/backend/Dockerfile

Il mapping delle righe Soccer usa il serializer del servizio: OpenAPI descrive `rows` come dizionari generici e non basta da sola a tipizzarli. Tennis ha schemi Pydantic espliciti; il payload autenticato non è stato letto. Vedi `evidence/manifest.json` per integrità degli snapshot.

## Sprint 0 residuali — chiusura 2026-10-09

### D02 — SHA deploy

Il BFF espone `git_sha` su `/`, `/health` e `/ready`. Sorgente: `GIT_SHA` oppure `RAILWAY_GIT_COMMIT_SHA` (iniezione Railway se Source GitHub collegato). Se assente → `"unknown"` esplicito (non inventato).

Verifica: `curl -sS https://bff-sport-iappero-dev.up.railway.app/ready | jq .git_sha`

Aggregatore: repository `https://github.com/app-appero/Sport_IAppero` (branch `main`). Il SHA runtime è autoritativo rispetto al commit GitHub locale.

### D05 — Timezone e filtri data

| Aspetto | Policy MVP | Stato |
|---|---|---|
| Query feed `timezone` | Solo `Europe/Rome` (default `APP_TIMEZONE`) | Enforce in `feed_service` |
| Giorno calendario | Helper `rome_day_bounds` → `[start,end)` UTC; test unit mezzanotte + DST | Verificato in codice |
| Soccer `target_date` | Passato al provider come YYYY-MM-DD; nessun rebase silenzioso | OK |
| Tennis `event_date`+`event_time` | **Nessun offset confermato** → `start_time=null` (non UTC inventato) | Chiuso in mapper |
| Timestamp aware | Conservati e normalizzati a UTC in output/sort | OK |
| Naive in sort feed | Solo stabilità d'ordine; non dichiarato come TZ sorgente | Documentato |

Limite residuo: orari Tennis restano null finché l'upstream non pubblica offset o timezone ufficiale.

### D06 — Mapping selection / linee / status / modelli

| Sport | Market key | Selection | Linea | Note |
|---|---|---|---|---|
| football | `h2h` | home/away/draw → nomi squadre | — | Codici 1/2/0/X |
| football | `under_over_*` | over/under + linea dal key | da `under_over_{n}_{d}` | |
| football | `goal_no_goal` | goal / no_goal | — | |
| football | `dc` | 1X / 12 / X2 | — | Codici 1/2/0 |
| football | `cards_line_*` | direction da signal o over/under | da key | mapping incompleto → label sorgente |
| tennis | `match_winner` | player_1 / player_2 (First/Second Player) | — | Label sconosciuta → source string, non “corretta” |
| tennis | `first_set_winner` | come match_winner | period first_set | da extra_markets |
| tennis | `over_under_games` / `total_games` | selection sorgente | linea null se non parsabile | nessun numero inventato |

Sconosciuti: `Selection(id=str(code), name=str(code))` o label raw; market key preservato. Status evento: stringa provider o null. Modello: `ProviderMetadata.name` + `version` se presente; assente → null, mai placeholder finto.
