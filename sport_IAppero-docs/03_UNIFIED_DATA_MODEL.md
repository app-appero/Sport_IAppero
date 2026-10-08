# Unified Data Model

## Obiettivo

Creare un contratto unico che rappresenti prediction provenienti da sport differenti.

Il frontend deve dipendere esclusivamente da questo schema.

## Naming sport vs provider

| Campo | Valori ammessi MVP |
|-------|--------------------|
| `sport` | `football`, `tennis` |
| `provider.name` | `soccer-oracle`, `tennis-oracle` |

Esempio corretto:

```json
{
  "sport": "football",
  "provider": { "name": "soccer-oracle" }
}
```

Non usare mai `"soccer"` come valore di `sport`.

`prediction.type` deve supportare **tutti i mercati** scoperti dagli upstream, non solo `match_winner`.

## UnifiedPrediction

Esempio:

```json
{
  "id": "soccer_123456_match_winner",
  "sport": "football",
  "event": {
    "id": "123456",
    "name": "Inter vs Juventus",
    "competition": {
      "id": "serie-a",
      "name": "Serie A"
    },
    "start_time": "2026-10-10T20:45:00Z",
    "participants": [
      {
        "id": "inter",
        "name": "Inter",
        "role": "home"
      },
      {
        "id": "juventus",
        "name": "Juventus",
        "role": "away"
      }
    ]
  },
  "prediction": {
    "type": "match_winner",
    "selection": {
      "id": "inter",
      "name": "Inter"
    },
    "confidence": 0.71
  },
  "probabilities": [
    {
      "key": "home",
      "label": "Inter",
      "value": 0.71
    },
    {
      "key": "draw",
      "label": "Draw",
      "value": 0.18
    },
    {
      "key": "away",
      "label": "Juventus",
      "value": 0.11
    }
  ],
  "provider": {
    "name": "soccer-oracle",
    "version": null
  },
  "oracle_score": null,
  "generated_at": "2026-10-07T12:00:00Z"
}
```

## Tennis example

```json
{
  "id": "tennis_98765_match_winner",
  "sport": "tennis",
  "event": {
    "id": "98765",
    "name": "Sinner vs Alcaraz",
    "competition": {
      "id": "shanghai-masters",
      "name": "Shanghai Masters"
    },
    "start_time": "2026-10-11T14:00:00Z",
    "participants": [
      {
        "id": "sinner",
        "name": "Jannik Sinner",
        "role": "player_1"
      },
      {
        "id": "alcaraz",
        "name": "Carlos Alcaraz",
        "role": "player_2"
      }
    ]
  },
  "prediction": {
    "type": "match_winner",
    "selection": {
      "id": "sinner",
      "name": "Jannik Sinner"
    },
    "confidence": 0.64
  },
  "probabilities": [
    {
      "key": "player_1",
      "label": "Jannik Sinner",
      "value": 0.64
    },
    {
      "key": "player_2",
      "label": "Carlos Alcaraz",
      "value": 0.36
    }
  ],
  "provider": {
    "name": "tennis-oracle",
    "version": null
  },
  "oracle_score": null,
  "generated_at": "2026-10-07T12:00:00Z"
}
```

## Pydantic concept

```python
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

class Competition(BaseModel):
    id: str | None = None
    name: str

class Participant(BaseModel):
    id: str | None = None
    name: str
    role: str | None = None

class Event(BaseModel):
    id: str
    name: str
    competition: Competition | None = None
    start_time: datetime | None = None
    participants: list[Participant]

class Selection(BaseModel):
    id: str | None = None
    name: str

class PredictionValue(BaseModel):
    type: str
    selection: Selection
    confidence: float | None = None

class Probability(BaseModel):
    key: str
    label: str
    value: float

class ProviderMetadata(BaseModel):
    name: str
    version: str | None = None

class UnifiedPrediction(BaseModel):
    id: str
    sport: str
    event: Event
    prediction: PredictionValue
    probabilities: list[Probability] = []
    provider: ProviderMetadata
    oracle_score: float | None = None
    generated_at: datetime | None = None
```

## Regole

- `confidence` deve essere normalizzata fra `0` e `1`.
- Le date devono usare ISO 8601 UTC.
- L'ID deve essere stabile.
- Il provider originale deve sempre essere tracciabile.
- Campi opzionali upstream non devono rompere la serializzazione.
- Nessun campo provider-specific deve essere richiesto dal frontend.
