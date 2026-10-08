# Oracle Sports API — Draft Specification

Base path:

```text
/api/v1
```

Tutti gli endpoint prodotto vivono sotto `/api/v1`.

I provider upstream **non** vengono modificati: gli adapter si adattano ai loro path reali.

## Health

### GET `/api/v1/health`

Liveness di Oracle Sports (processo up).

Response:

```json
{
  "status": "ok"
}
```

### GET `/api/v1/health/providers`

Stato aggregato dei provider. Ogni adapter sonda il provider con il contratto upstream esistente (es. Soccer `/health`, Tennis quanto disponibile) e normalizza il risultato.

```json
{
  "football": {
    "provider": "soccer-oracle",
    "status": "ok"
  },
  "tennis": {
    "provider": "tennis-oracle",
    "status": "ok"
  }
}
```

## Sports

### GET `/api/v1/sports`

```json
[
  {
    "id": "football",
    "name": "Football",
    "provider": "soccer-oracle",
    "enabled": true
  },
  {
    "id": "tennis",
    "name": "Tennis",
    "provider": "tennis-oracle",
    "enabled": true
  }
]
```

## Competitions / tournaments (per sport)

### GET `/api/v1/sports/{sport}/competitions`

Esempi:

```text
GET /api/v1/sports/football/competitions
GET /api/v1/sports/tennis/competitions
```

Per tennis rappresenta i tornei.

Query (da raffinare in Phase 0):

```text
date?
status?
```

## Events (per sport)

### GET `/api/v1/sports/{sport}/events`

```text
GET /api/v1/sports/football/events
GET /api/v1/sports/tennis/events
```

Query:

```text
date?
competition_id?
```

Response items usano il domain model comune (`Event` + predizioni/mercati collegati secondo quanto scoperto upstream).

## Markets (per sport / evento)

### GET `/api/v1/sports/{sport}/markets`

Elenco mercati supportati per quello sport (derivato dall'upstream).

### GET `/api/v1/events/{event_id}/markets`

Mercati disponibili per un evento.

MVP: includere **tutti** i mercati esposti da Soccer Oracle e Tennis Oracle.

## Predictions

### GET `/api/v1/sports/{sport}/predictions`

Predizioni filtrate per sport (usato dal tab Football / Tennis).

Query:

```text
date?
competition_id?
event_id?
market?
min_confidence?
limit?
```

Ordinamento **solo dentro lo stesso sport** (es. confidence DESC, start_time ASC). Non esiste ranking cross-sport nell'MVP.

### GET `/api/v1/events/{event_id}/predictions`

Tutte le prediction/mercati di un evento.

### GET `/api/v1/predictions/{prediction_id}`

Response: `UnifiedPrediction`

Risoluzione MVP senza DB:

1. parse dell'id composito stabile (provider + upstream ids + market);
2. chiamata upstream con gli id originali;
3. remap a `UnifiedPrediction`.

## Fuori scope MVP (deprioritized)

Non richiesti per Phase 1:

```text
GET /api/v1/feed              # cross-sport
GET /api/v1/predictions/top   # ranking dedicato
```

Potranno tornare in fasi successive (Home / Oracle Score).

## Errors

Formato comune:

```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Tennis provider is temporarily unavailable",
    "provider": "tennis-oracle",
    "sport": "tennis"
  }
}
```

## Partial failure policy

Una failure di Tennis non deve influenzare le response Football e viceversa.

Nei payload multi-fonte (es. health providers) lo stato per sport rimane esplicito.
