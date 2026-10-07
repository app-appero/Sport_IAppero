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

Environment:

```text
SOCCER_ORACLE_BASE_URL=https://soccer-oracle-api-dev.up.railway.app
```

Responsabilità:

1. chiamare Soccer Oracle;
2. validare la risposta upstream;
3. convertire nel domain model comune;
4. gestire errori e timeout;
5. non esporre direttamente DTO upstream.

## TennisProvider

Environment:

```text
TENNIS_ORACLE_BASE_URL=https://tennisoracle-backend-dev.up.railway.app
```

Stesse responsabilità.

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

## Aggregazione

Il FeedService deve interrogare Soccer e Tennis in parallelo.

Pseudo-code:

```python
results = await asyncio.gather(
    soccer_provider.get_predictions(),
    tennis_provider.get_predictions(),
    return_exceptions=True
)
```

Le prediction valide vengono unite.

Le failure vengono registrate in `meta.providers`.
