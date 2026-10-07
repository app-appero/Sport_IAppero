# Database Design

## Filosofia

Oracle Sports NON deve copiare integralmente i database dei provider.

Il DB centrale serve per funzionalità proprie dell'aggregatore.

## MVP

Il backend può inizialmente funzionare anche senza persistere tutte le prediction.

Tuttavia conviene predisporre il database per:

- storico prediction;
- risultati;
- utenti;
- favoriti;
- notifiche.

## Tabelle future

### users

```text
id
email
created_at
```

### sports

```text
id
slug
name
enabled
```

### events

```text
id
external_id
sport
provider
competition
start_time
status
created_at
```

### predictions

```text
id
external_id
event_id
provider
prediction_type
selection
confidence
oracle_score
generated_at
raw_payload_json
```

### prediction_probabilities

```text
id
prediction_id
key
label
value
```

### prediction_results

```text
id
prediction_id
result
is_correct
resolved_at
```

### favorites

```text
id
user_id
entity_type
entity_id
created_at
```

### notification_preferences

```text
id
user_id
sport
min_confidence
enabled
```

## Raw payload

Valutare salvataggio del payload upstream in JSONB.

Motivi:

- debugging;
- auditing;
- ricalcolo mapper;
- analisi dati.

Non usarlo come source primaria del frontend.
