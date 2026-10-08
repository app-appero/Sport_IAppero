# Configurazione Railway — riferimenti reali e proposta BFF

I soli domini disponibili dei motori sono:
- https://soccer-oracle-api-dev.up.railway.app
- https://tennisoracle-backend-dev.up.railway.app

Git sorgenti:
- https://github.com/romy1992/ia_predict_soccer.git
- https://github.com/romy1992/tennis_oracle.git

Non abbiamo ID progetto/ambiente/servizio, link dashboard, URL production o domini privati. Non dedurli dal dominio pubblico. Nessun servizio Railway nuovo è stato creato.

## Config BFF proposta

| Variabile nuova | Valore/default | Utilizzo |
|---|---|---|
| SOCCER_API_BASE_URL | https://soccer-oracle-api-dev.up.railway.app | Solo lato server |
| TENNIS_API_BASE_URL | https://tennisoracle-backend-dev.up.railway.app | Solo lato server |
| TENNIS_API_PREFIX | /api | Verificato OpenAPI distribuita |
| TENNIS_SERVICE_TOKEN | Segreto da configurare | Header X-Service-Token del feed |
| TENNIS_MODEL_VERSION | v4, da confermare per prodotto | Non fallback silenzioso |
| SOCCER_PROVIDER_TIMEZONE | Vuoto finché verificata | Necessaria solo per date naive/filter policy |
| TENNIS_PROVIDER_TIMEZONE | Vuoto finché verificata | Date+time upstream |
| APP_TIMEZONE | Europe/Rome | Query giorno consumer |
| UPSTREAM_CONNECT_TIMEOUT_SECONDS | 3 | Proposto |
| UPSTREAM_READ_TIMEOUT_SECONDS | 8 | Proposto |
| FEED_DEADLINE_SECONDS | 10 | Proposto |
| CACHE_TTL_SECONDS | 60 | Proposto |
| CACHE_STALE_MAX_SECONDS | 300 | Proposto |
| PROVIDER_MAX_ITEMS | 1000 | Budget proposto, incompletezza dichiarata |
| DATABASE_URL | Segreto opzionale foundation | DB nuovo, mai quello dei motori |
| PORT | Iniettata da Railway | Binding 0.0.0.0 |
| LOG_LEVEL | INFO | Log sanificati |

Questi nomi appartengono al BFF proposto. Nel motore Tennis le variabili reali sono SERVICE_API_KEY, SERVICE_API_KEY_PREVIOUS, ALLOW_UNAUTHENTICATED_SERVICE_READS, API_PREFIX e ADMIN_JWT_SECRET. TENNIS_SERVICE_TOKEN deve corrispondere a una chiave servizio autorizzata del motore, ma non va generato o modificato dall'aggregatore senza configurazione concordata.

Mobile: solo EXPO_PUBLIC_API_BASE_URL=https://<dominio-bff-da-creare>. Nessun token in EXPO_PUBLIC_*, frontend config o repository.

## Deployment BFF suggerito, da implementare

Un servizio API nuovo separato. Dockerfile con contesto backend e dipendenze leggere FastAPI/httpx/Pydantic; nessun dataset o artifact pickle. Command: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`. Health /health non interroga provider. Introducendo DB, migrazione Alembic in pre-deploy; cache condivisa se si usano repliche. Dev e production separati con base URL esplicite; non puntare automaticamente produzione verso i due motori dev.

Il Dockerfile Tennis esistente usa contesto repository root e modulo `backend.src.app.main:app`; non copiarlo nel BFF, che ha struttura diversa. Il compose Soccer dichiara DB remoto Railway e scheduler separato: l'aggregatore non deve ereditare config.env o connettersi al DB remoto. Non clonare modelli/training nel container BFF.

## Verifica rilascio futura

Verificare domini e variabili effettive, token feed Tennis, date/timezone, schema, empty/degraded, limiti API, latenza, cache e assenza segreti nel bundle. Registrare commit distribuito BFF/provider e OpenAPI hash. Questo documento prepara il rilascio, non attesta un deployment effettuato.
