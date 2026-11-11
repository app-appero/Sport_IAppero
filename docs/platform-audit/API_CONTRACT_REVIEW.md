# API Contract Review — Sport IApperò ↔ motori

## Contratto unificato (IMPLEMENTATO, additivo)

Campi **nuovi opzionali** su `UnifiedPrediction` (stesso significato calcio/tennis):

- `model {name, version}`
- `availability {status, reason}` — `available|limited|unavailable`
- `data_freshness {predicted_at, event_data_updated_at, live_updated_at, odds_captured_at, timezone_explicit}`
- `provenance {engine, source, data_quality}`
- `anomalies: string[]`

Su `Event`: `unavailable_markets[{market, reason}]`.

Su `FeedMeta`: `snapshot_age_seconds`, `is_stale`.

Campi legacy invariati (`id`, `sport`, `event`, `prediction`, `probabilities`, `provider`, `generated_at`, `pricing`, `decision`, …). App già distribuite: parsing JSON senza schema runtime → **retrocompatibili**.

## Mapping motori

| Campo | Soccer | Tennis |
|---|---|---|
| model.name | `model_name` da prediction/card | `model_name` |
| model.version / provider.version | `run_id` | `model_version` |
| generated_at | `computed_at` se presente, altrimenti null | `predicted_at` / `published_at` |
| data_quality | `odds/team_statistics/xg_available` | `features_available`, warnings |
| decision | da `value_label` engine | da engine se presente; altrimenti derivata BFF + anomaly `decision_derived_by_bff` |

## Test contratto

`backend/tests/unit/test_transparency_contract.py`: legacy keys presenti; parità top-level football/tennis; unavailable markets; decision derived.

## PROPOSTA

Versioning esplicito `schema_version: "1.1"` già presente come `"1"` — lasciato a `"1"` per non rompere client che lo controllano letteralmente; documentare estensione additiva qui.
