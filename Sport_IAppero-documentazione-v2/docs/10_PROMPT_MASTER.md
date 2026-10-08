# Prompt master per Cursor / Claude Code

Agisci come sviluppatore del nuovo progetto Sport_IAppero. Prima leggi README e tutti i documenti docs/00..11, poi le OpenAPI in evidence. Questa V2 sostituisce le ipotesi del precedente pack Oracle Sports.

Obiettivo: app solo mobile iOS/Android in italiano che aggrega predizioni Soccer Oracle e Tennis Oracle tramite un nuovo BFF FastAPI. Non costruire un ensemble cross-modello, un motore ML, un bookmaker, una dashboard web o un nuovo sistema training. I motori indipendenti sono fonti HTTP, non package da importare.

Riferimenti certi:
- Soccer Git: https://github.com/romy1992/ia_predict_soccer.git
- Soccer Railway: https://soccer-oracle-api-dev.up.railway.app
- Tennis Git: https://github.com/romy1992/tennis_oracle.git
- Tennis Railway: https://tennisoracle-backend-dev.up.railway.app
- Repository nuovo: quello in cui stai lavorando; non inventare URL remoti.

Procedi prima con discovery e foundation BFF. Inizia riportando cosa esiste nel repository corrente e quali contratti V1 vanno aggiornati, poi implementa B01..B06 usando fixture e fonti verificate. Prosegui con le attività indipendenti anche se il token Tennis manca. Non chiedere accesso admin per costruire la foundation.

Soccer feed: GET /dashboard/day con target_date, with_predictions=true, force_refresh=false. Response rows generiche: tipizzare con serializer reale e fixture. Decision_cards.predicted_probability è già probability della selezione; prediction.probability grezza può essere P(classe 1). Nessun N+1 di dettaglio: il dettaglio può calcolare o chiamare provider. Nessun endpoint inventato /api/v1/predictions sui motori.

Tennis feed: GET /api/next-fixtures/predictions, X-Service-Token server, status=upcoming, date from/to, limit/offset. Response items[].prediction match winner e extra_markets[] separati. First Player/Second Player sono label reali, mappare correttamente. Confidence è max(p,1-p) nel codice, non accuratezza. Published-predictions richiede admin JWT: non presumere che service token basti.

Il modello unificato è una proposta: formalizzalo in Pydantic e genera JSON Schema e tipi TypeScript. Probability/confidence/decision/quote/provenienza devono essere separati. ID deterministici includono provider, evento, mercato, linea, periodo, esito e modello. Non introdurre score inventati, dati di esempio presentati come reali o fallback 0.5. Timezone naive sconosciuta → null e warning, non UTC arbitrario.

Implementa feed aggregato con deadline, cache, stato provider e snapshot per paginazione. Default sort per orario; probability_desc opzionale e dichiarato. 200 parziale se almeno una fonte funziona, anche vuota; 503 se nessuna disponibile/cache utilizzabile. 401 upstream non è errore credenziali dell'utente mobile. Documenta truncation e budget.

Non aprire o copiare `.env`/config.env reali dai repository sorgente. Non inviare token in chat o log. Usa solo nomi e placeholder .env.example; le credenziali vanno configurate tramite ambiente. Non modificare i motori, né chiamare import/refresh/train/recompute/settings/payments. Nessun deploy o commit remoto richiesto dal presente prompt. Configurazione Railway del BFF va preparata e documentata localmente.

Esegui i test significativi di docs/09, aggiorna discovery manifest quando acquisisci dati reali, segnala limiti e task bloccati. Nel riepilogo distingui test mock da test provider live. Dopo il feed foundation verificato, passa all'app Expo secondo docs/07; non costruire UI sopra uno schema alternativo.

Primo risultato richiesto: BFF eseguibile localmente, /health, /api/v1/sports, /api/v1/feed, schema normalizzato, adapter Soccer/Tennis isolati, fixture/test e README di esecuzione. Se manca token Tennis, risultato deve dichiarare integrazione live non ancora verificata e usare stato unauthorized o modalità mock esplicita.
