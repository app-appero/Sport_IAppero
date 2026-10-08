# Contratto unificato proposto — v1

Questo è il contratto del nuovo BFF, non un endpoint esistente dei motori. Implementare in Pydantic e generare JSON Schema/TypeScript prima dell'app.

## Entità

| Entità | Campi principali | Vincoli |
|---|---|---|
| UnifiedEvent | id, provider, sport, source_event_id, participants, competition, start_time, status, metadata, unavailable_markets | ID namespace; start_time UTC aware o null; nessun fallback “adesso” |
| Participant | role, name, source_id | home/away per calcio, player_1/player_2 per tennis; source_id nullable |
| UnifiedPrediction | id, event_id, market, selection, probability, outcomes, confidence, decision, pricing, model, provenance, quality, settlement | Più predizioni per evento; non una predizione unica per sport |
| Market | key, source_key, period, line, line_source | Linea e periodo parte dell'identità; unknown preservato |
| Selection | key, label, participant_role, source_value | Label italiana solo quando il mapping è certo |
| Model | name, version, run_id | Nullable; run_id diverso da version |
| Provenance | provider, source_kind, source_prediction_id, content_version, is_official, retrieved_at, published_at | fetched time distinto da model time |
| Quality | warnings, features_available, timestamp_verified | Non inventare completezza o score numerico |

Sport enum iniziale football/tennis. Provider soccer/tennis. Status evento scheduled/live/finished/postponed/cancelled/unknown, mantenendo source_status. Prediction status available/unavailable/withdrawn; non usare PLAY come status di lifecycle.

Probability nullable float [0,1], mai conversione automatica da 71 a .71 senza contratto sorgente. Confidence oggetto `{raw, meaning}`: Soccer assente nel feed deciso; Tennis meaning `max_binary_outcome_probability`. Decision oggetto `{code, reason, policy_version}`: code PLAY/BORDERLINE/NO BET/null, solo dati provider. Pricing separa odds_decimal, fair_odds_market, break_even_odds_model, probability_edge, expected_value, bookmaker_count; null se mancanti. Fair odds bookmaker e break-even del modello non sono equivalenti.

## Identità

Evento: `soccer:event:{fixture_id}` e `tennis:event:{event_key}`. Predizione published con ID stabile: provider/source_kind/source_id/content_version. Snapshot senza ID: hash canonico di provider, source_kind, source_event_id, market.source_key, period, line, selection.source_value, model.name/version/run_id. Usare SHA-256 deterministico; non Python hash(). Non includere retrieved_at nel logical ID.

Per snapshot non versionati l'ID identifica una selezione logica, non uno storico immutabile. Se probability/odds cambiano, creare content_hash e una revision separata quando si persiste. Una selezione di 2.5 e una di 3.5 devono avere ID diversi. Non deduplicare soltanto per event_id. Provenienze ufficiale e tecnica non vanno fuse senza conservare entrambe.

## Tempo

Output API: ISO 8601 UTC con Z. Query giorno: calendar date nella timezone Europe/Rome, convertita in [inizio, fine) UTC. Nei provider occorre verificare come target_date/from/to filtrano le rispettive date; non assumere che coincidano con Europe/Rome. Se necessario chiedere giorni adiacenti e filtrare solo su timestamp verificati, rispettando limiti/costo. Tennis date/time senza offset: mantenere metadata e start_time=null finché la timezone upstream non è confermata. Config provider timezone obbligatoria per la combinazione; nessun default silenzioso. Una fixture senza orario non può essere dichiarata certamente pre-match tramite confronto orario.

## Ranking

Default: start_time asc, poi sport/event_id/prediction_id deterministici; null in fondo. Vista probability_desc ordina solo probabilità della selezione valide, tie per orario/ID; null in fondo. Non confrontare confidence grezza e p_model come sinonimi. Non aggregare in un Oracle Score né creare probabilità cross-sport “calibrate” senza evidenza. Home raggruppa predizioni dello stesso evento per evitare venti card duplicate.

## Validazione

Outcome mancanti restano mancanti. Non forzare somma=1 tra tutte le selezioni di mercati differenti o doppia chance sovrapposta. Per tennis match-winner binario p e 1-p sono legittimi; annullamento/ritiro richiede regola distinta. Classi numeriche dei modelli non sono label universalmente trasferibili. Scartare record strutturalmente invalidi con warning e contatore; niente payload upstream completo nei log pubblici.

`contracts/example-unified-prediction.json` è illustrativo, derivato dal campione ledger Soccer reale; non contiene anagrafiche inventate e non è una response del BFF già disponibile.
