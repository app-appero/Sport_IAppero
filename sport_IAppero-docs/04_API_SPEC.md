# Oracle Sports API — Draft Specification

Base path:

```text
/api/v1
```

## Health

### GET `/health`

Response:

```json
{
  "status": "ok"
}
```

## Provider health

### GET `/health/providers`

```json
{
  "soccer": {
    "status": "ok"
  },
  "tennis": {
    "status": "ok"
  }
}
```

## Sports

### GET `/sports`

```json
[
  {
    "id": "football",
    "name": "Football",
    "enabled": true
  },
  {
    "id": "tennis",
    "name": "Tennis",
    "enabled": true
  }
]
```

## Feed

### GET `/feed`

Query params:

```text
sport?
date?
limit?
min_confidence?
```

Esempio:

```text
GET /api/v1/feed?limit=20&min_confidence=0.65
```

Response:

```json
{
  "items": [],
  "meta": {
    "count": 0,
    "providers": {
      "soccer": "ok",
      "tennis": "ok"
    }
  }
}
```

### Ordinamento iniziale

Default:

```text
confidence DESC
start_time ASC
```

## Top predictions

### GET `/predictions/top`

Query:

```text
limit=10
sport?
date?
```

## Events

### GET `/events/today`

Restituisce eventi di tutti gli sport disponibili.

### GET `/sports/{sport}/events`

Esempi:

```text
GET /sports/football/events
GET /sports/tennis/events
```

Query:

```text
date?
competition?
```

## Prediction detail

### GET `/predictions/{prediction_id}`

Response: `UnifiedPrediction`

## Event predictions

### GET `/events/{event_id}/predictions`

Utile se in futuro un evento contiene prediction multiple:

- winner;
- over/under;
- exact score;
- set winner;
- ecc.

## Errors

Formato comune:

```json
{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Tennis provider is temporarily unavailable",
    "provider": "tennis"
  }
}
```

## Partial response policy

Il feed NON deve fallire se un singolo provider è offline.

Esempio:

```json
{
  "items": [
    "... soccer predictions ..."
  ],
  "meta": {
    "providers": {
      "soccer": "ok",
      "tennis": "unavailable"
    }
  }
}
```
