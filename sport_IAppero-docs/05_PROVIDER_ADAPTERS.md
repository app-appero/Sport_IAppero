# Provider Adapters

## Scopo

Ogni backend sportivo deve essere incapsulato in un provider adapter.

Questo consente di sostituire o modificare le API upstream senza modificare:

- servizi;
- endpoint pubblici;
- frontend.

## Base interface

```python
from abc import ABC, abstractmethod

class SportProvider(ABC):

    @abstractmethod
    async def get_events(self, **filters):
        pass

    @abstractmethod
    async def get_predictions(self, **filters):
        pass

    @abstractmethod
    async def get_prediction(self, prediction_id: str):
        pass

    @abstractmethod
    async def healthcheck(self):
        pass
```

## SoccerProvider

Maps to Oracle Sports sport id: `football`.

Provider id: `soccer-oracle`.

Environment:

```text
SOCCER_ORACLE_BASE_URL=https://soccer-oracle-api-dev.up.railway.app
```

Responsabilità:

1. chiamare Soccer Oracle **così com'è** (path, auth, schema upstream invariati);
2. validare la risposta upstream;
3. convertire nel domain model comune (`sport="football"`);
4. gestire errori e timeout;
5. non esporre direttamente DTO upstream;
6. esporre competizioni, eventi, predizioni e **tutti i mercati** disponibili.

## TennisProvider

Maps to Oracle Sports sport id: `tennis`.

Provider id: `tennis-oracle`.

Environment:

```text
TENNIS_ORACLE_BASE_URL=https://tennisoracle-backend-dev.up.railway.app
```

Stesse responsabilità (senza rinominare/alterare Tennis Oracle).

## Client vs Mapper

Separare sempre:

```text
client.py
```

da:

```text
mapper.py
```

### client.py

Fa HTTP.

```python
response = await client.get(...)
```

### mapper.py

Trasforma:

```text
UpstreamSoccerPrediction
        ↓
UnifiedPrediction
```

## Importantissimo

NON inventare endpoint.

La prima attività deve essere la discovery delle API reali.

Controllare:

```text
/docs
/openapi.json
/redoc
```

oppure documentazione/repository dei progetti.

## Resilience

Ogni provider deve implementare:

- timeout;
- gestione 4xx;
- gestione 5xx;
- payload validation;
- logging;
- errore custom.

Possibili custom exception:

```python
class ProviderUnavailable(Exception):
    pass

class ProviderResponseError(Exception):
    pass
```

## Chiamate per sport (MVP)

Nell'MVP non esiste un aggregatore cross-sport per ranking.

Il tab Football chiama solo `SoccerProvider`.
Il tab Tennis chiama solo `TennisProvider`.

`asyncio.gather` tra provider serve al massimo per health aggregato o job futuri, non per la Home MVP.

Pseudo-code tab Football:

```python
predictions = await soccer_provider.get_predictions(**filters)
# sport is always "football" after mapping
```

## Health adaptation

I provider tengono i propri endpoint health.

Ogni adapter implementa `healthcheck()` mappando il contratto upstream reale verso uno status Oracle Sports (`ok` / `unavailable`), usato da:

```text
GET /api/v1/health/providers
```
