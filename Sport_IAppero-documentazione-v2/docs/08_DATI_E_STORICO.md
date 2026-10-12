# Dati e storico

Prima milestone feed può essere priva di database permanente: cache e fixture bastano a validare integrazione. PostgreSQL diventa necessario per snapshot durevoli, revisioni e storico osservato. Non collegarsi ai database dei motori e non copiare dataset/training.

## Tabelle proposte nella fase persistenza

| Tabella | Chiavi e responsabilità |
|---|---|
| events | id namespace, provider, source_event_id, participants JSON, competition, start_time UTC nullable, source metadata |
| prediction_revisions | logical_id, revision_id/content_hash, event_id, market/line/period/selection, modello, probabilità, quote, source ID/version, published_at nullable, observed_at |
| feed_snapshots | snapshot_id, query_hash, generated_at, expires_at, completezza, lista ordinata revision_id |
| provider_fetch_runs | provider, query, stato, latenza, counts, schema fingerprint; niente segreti |
| prediction_settlements | revision_id, stato pending/won/lost/void/unknown, source_status, settled_at, outcome e rule_version |

Unique event(provider,source_event_id). Unique source publication(provider,source_id,content_version) quando presente. Per snapshot non versionati unique(logical_id,content_hash). Indici start_time/sport, event_id/market, observed_at. Alembic, timestamps timezone-aware. Upsert anagrafiche, append revisioni: mai sovrascrivere una probabilità pubblicata per migliorare a posteriori lo storico.

## Regole storico

Non promettere che abbiamo osservato le predizioni prima del kickoff solo perché oggi esistono. Il ledger Soccer campionato ha captured_at e kickoff_at; Tennis published ha published_at, revisioni e hash. Normalizzare provenienza e verifica temporale. Una predizione tecnica ricalcolata dopo l'evento non entra nella performance pubblicata pre-match.

Mantenere gruppi separati per sport, mercato, modello, versione, periodo e provenienza; null non equivale a sconfitta. Win rate = won/(won+lost), con denominatore, finestra, pending e void dichiarati. Non fare media aritmetica dei win rate dei provider: eventuale aggregazione usa conteggi omogenei e dichiarati. ROI richiede quota/stake/regole settlement comparabili, da escludere dal primo MVP. Calibration/Brier/log-loss possono essere aggiunti solo con esiti compatibili e campioni sufficienti.

Settlements: Soccer campione `settled_loss`→lost, won=false, pnl=-1; censire gli altri enum dal codice/fixture prima della mappa completa. Tennis published stats utilizza pending/won/lost/void; match prediction is_correct non equivale a ufficialità. Ritiri tennis/annullamenti calcio vanno mantenuti secondo le regole del provider, non risolti dal BFF arbitrariamente.

Users, favorites server, push e subscriptions sono migrazioni future; non creare tabelle decorative inutilizzate. Preferiti locali iniziali non richiedono users. Backup e retention da configurare quando si introduce persistenza reale. Stato: la persistenza è attiva su Railway (PostgreSQL), quindi il backup giornaliero del servizio database va attivato dal pannello Railway (scheda Backups) e va provato un ripristino su un database di prova. Le revisioni sono append-only e il ledger dei provider non è ricostruibile retroattivamente per le osservazioni del feed: la perdita del database non si recupera con un ricalcolo.
