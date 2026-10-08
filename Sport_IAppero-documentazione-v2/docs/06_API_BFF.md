# API proposta del BFF

Prefisso nuovo `/api/v1`. Versione schema `1`. Nessuna di queste route è già distribuita.

| Metodo/path | Funzione |
|---|---|
| GET `/health` | Liveness processo senza chiamare i motori |
| GET `/ready` | Readiness configurazione/cache; non bloccare liveness su Tennis |
| GET `/api/v1/sports` | Capability sport, mercati e availability |
| GET `/api/v1/feed` | Eventi con predizioni raggruppate e stato provider |
| GET `/api/v1/events/{event_id}` | Dettaglio da snapshot cache |
| GET `/api/v1/predictions/{prediction_id}` | Predizione normalizzata da snapshot |

Filtri feed: date (YYYY-MM-DD), timezone inizialmente solo Europe/Rome, sports CSV football/tennis, market opzionale, competition opzionale (ID unificato se disponibile), sort start_time_asc/probability_desc, limit 1..100 default 30, cursor opaco. Non aggiungere endpoint top ridondante nella prima fase; usare sort.

## Response proposta

```json
{
  "schema_version": "1",
  "snapshot_id": "opaque-id",
  "generated_at": "2026-10-07T13:00:00Z",
  "query": {"date":"2026-10-07","timezone":"Europe/Rome"},
  "items": [],
  "page": {"limit":30,"next_cursor":null},
  "meta": {
    "status":"degraded",
    "is_complete":false,
    "providers":[
      {"provider":"soccer","status":"ok","item_count":0,"truncated":false},
      {"provider":"tennis","status":"unauthorized","item_count":0,"truncated":false}
    ],
    "warnings":["Tennis temporaneamente non disponibile"]
  }
}
```

items contiene `{event: UnifiedEvent, predictions: UnifiedPrediction[]}`. Una giornata vuota con tutti i provider funzionanti ha status empty e is_complete=true. 401 del provider non è 401 del consumer; usare stato provider unauthorized senza dettagli sensibili. Count è relativo a eventi normalizzati; upstream_total può essere distinto.

## Paginazione coerente

Scaricare e normalizzare la finestra provider entro limiti, creare snapshot ordinato e restituire cursor con snapshot_id + posizione + hash filtri. Non fondere offset Soccer/Tennis come se fossero un unico ordinamento. Cursor invalido 400; snapshot scaduto 410, client riparte dalla prima pagina. TTL proposto snapshot 5 minuti. Se i dati sono troncati, is_complete=false anche se una pagina locale sembra piena. Non promettere totale globale esatto senza acquisizione completa.

## Errori

422 filtri invalidi. 404 ID non trovato nello snapshot consultabile; Soccer fixture:null deve diventare evento non trovato, non card senza nomi. 503 nessun provider/cache disponibile. 200 per feed parziale con meta degraded. Schema error `{code,message,request_id}`; niente stack trace, URL con token o response database. 429 BFF se superato rate limit pubblico.

Il BFF non è un proxy libero: parametri allowlist, base URL da config, nessuna route per training, imports, refresh, settings o pagamenti dei motori. Dettagli nuovi non presenti nello snapshot si possono introdurre solo dopo audit degli effetti upstream.
