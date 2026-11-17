# Prestazioni e costi — Railway

**Sintesi per il titolare.** Abbiamo letto l'uso reale di CPU, memoria e disco degli 11 servizi su
Railway negli ultimi 7 giorni. Il carico medio è basso (circa 4,4 GB di RAM e 0,2 vCPU in totale),
ma alcuni servizi hanno picchi di memoria molto più alti della media. Non abbiamo potuto leggere
fatturazione, piano e prezzi: nessun costo in euro è calcolato qui. Le proposte sotto si basano solo
sull'uso misurato.

## Fonte e limiti

- **VERIFICATO**: metriche lette il 15/11/2026 con il connettore Railway in sola lettura
  (strumento `get-service-metrics`), finestra di 168 ore, campionamento orario, 169 campioni per
  serie. CPU in vCPU, RAM e disco in GB. Nessuna variabile né log letti, nessuna modifica su Railway.
  I valori sono riportati per intero nella tabella sotto (il file di lavoro dell'audit,
  `railway_metrics_2026-11-15.json`, non è versionato).
- **BLOCCO**: fatturazione, piano dell'account e prezzi unitari non sono leggibili (nessuno
  strumento del connettore li espone; la pagina prezzi della documentazione non era leggibile).
  Nessun costo in valuta è calcolabile da qui.
- **BLOCCO**: l'unità delle serie di rete non è verificata; non sono usate per stime di traffico.
- **VERIFICATO**: ogni progetto ha un solo ambiente, chiamato `dev`.

## Uso per servizio (VERIFICATO, 7 giorni)

| Progetto | Servizio | CPU media | CPU picco | RAM media (GB) | RAM picco (GB) | Disco (GB) |
|---|---|---|---|---|---|---|
| Soccer-Oracle | api | 0,050 | 2,700 | 1,226 | 4,347 | — |
| Soccer-Oracle | scheduler | 0,003 | 0,256 | 0,466 | 1,699 | — |
| Soccer-Oracle | web | 0,000003 | 0,000078 | 0,041 | 0,086 | — |
| Soccer-Oracle | Postgres | 0,006 | 0,018 | 0,571 | 2,313 | 2,028 |
| Oracle-Tennis | backend | 0,044 | 0,821 | 0,459 | 1,133 | — |
| Oracle-Tennis | scheduler-dev | 0,018 | 2,665 | 0,215 | 3,476 | — |
| Oracle-Tennis | telegram-bot | 0,0002 | 0,0008 | 0,079 | 0,169 | — |
| Oracle-Tennis | frontend | 0,000003 | 0,000061 | 0,039 | 0,078 | — |
| Oracle-Tennis | Postgres | 0,071 | 0,141 | 0,961 | 2,337 | 1,722 |
| sport_IApperò | bff | 0,007 | 0,024 | 0,115 | 0,242 | — |
| sport_IApperò | Postgres | 0,006 | 0,009 | 0,197 | 0,364 | 0,358 |

Totali per progetto (calcolati con `python3 -I` sul file delle metriche, somma delle medie):

| Progetto | RAM media (GB) | CPU media (vCPU) | Disco (GB) |
|---|---|---|---|
| Soccer-Oracle | 2,30 | 0,058 | 2,03 |
| Oracle-Tennis | 1,75 | 0,133 | 1,72 |
| sport_IApperò | 0,31 | 0,013 | 0,36 |
| **Totale** | **4,37** | **0,204** | **4,11** |

## Osservazioni (VERIFICATO sui numeri sopra)

- Il servizio più pesante è Soccer `api`: RAM media 1,23 GB con picco 4,35 GB (3,5 volte la media)
  e CPU di picco 2,70 vCPU.
- Tennis `scheduler-dev` ha la RAM media più bassa fra i servizi applicativi (0,21 GB) ma un picco
  di 3,48 GB (16 volte la media) e 2,67 vCPU: carico a raffiche, compatibile con job periodici.
  Quale job lo causi non è stato verificato (log non letti).
- Soccer `web` e Tennis `frontend` sono quasi inattivi (circa 0,04 GB di RAM, CPU vicina a zero);
  Tennis `telegram-bot` usa 0,08 GB.
- Il BFF è leggero (0,12 GB medi, picco 0,24 GB): la cache in memoria non pesa.
- I Postgres dei motori hanno picchi di RAM di circa 2,3 GB contro medie di 0,57 (Soccer) e
  0,96 GB (Tennis).

## Controlli di consumo già nel codice (IMPLEMENTATO)

| Controllo | Effetto | Commit |
|---|---|---|
| Pausa automatica a quota API-Sports esaurita, nello scheduler | i 6 job che consumano quota non partono a quota esaurita; nessuna chiamata a pagamento per leggere la quota | `ia_predict_soccer@226d03c`, `fc0444d` |
| Settlement senza import a quota esaurita | il job orario riconcilia dal DB senza chiamare il provider | `226d03c`, `3643636` |
| Circuit breaker su API-Sports, API-Tennis e nel BFF | a provider giù le chiamate falliscono subito invece di attendere un timeout ciascuna | `226d03c`; `tennis_oracle@8d9ca20`, `5515aec`; `Sport_IAppero@516241c`, `f77a88b` |
| Budget di tempo per chiamata API-Tennis (60 s) | un timeout pieno non viene ritentato | `tennis_oracle@5515aec` |
| Cache del feed BFF 60 s, ripiego stantio fino a 300 s | meno chiamate ai motori; dati vecchi sempre segnalati | `Sport_IAppero@516241c`, `84ffef1`, `caae6e1` |

Il risparmio di chiamate a pagamento non è stato misurato (nessun accesso ai contatori dei
provider né ai log di produzione).

## Proposte di riduzione costi (PROPOSTA, solo sull'uso misurato)

| # | Proposta | Base misurata | Rischio | Cambia la produzione |
|---|---|---|---|---|
| 1 | Verificare se Soccer `web` e Tennis `frontend` servono ancora; se sì, valutare di servirli come file statici o di accorparli | ~0,04 GB e CPU ~0 in 7 giorni | basso: se qualcuno li usa, va prima confermato | sì (rimozione o spostamento di un servizio) |
| 2 | Prima di fissare limiti di memoria, identificare cosa causa i picchi di Soccer `api` (4,35 GB) e Tennis `scheduler-dev` (3,48 GB) leggendo i log nelle ore di picco | rapporto picco/media 3,5 e 16 | medio: un limite troppo basso fa riavviare il servizio | no (solo analisi) |
| 3 | Se il picco di Tennis `scheduler-dev` viene da job periodici (addestramento, aggiornamento globale), valutare di eseguirli come job a tempo invece che in un servizio sempre acceso | media 0,21 GB, CPU media 0,018 | medio: cambia come girano i job | sì |
| 4 | Valutare la consolidazione di Tennis `telegram-bot` con un altro servizio | 0,08 GB, CPU ~0 | basso | sì |
| 5 | Leggere fatturazione e piano dalla dashboard Railway (accesso del titolare) e solo dopo stimare il risparmio delle proposte 1-4 | **BLOCCO** attuale | nessuno | no |

Non fatto e non proposto senza dati: riduzioni di risorse dei Postgres (i picchi di circa 2,3 GB non
sono spiegati) e stime di traffico di rete.

## Altre osservazioni utili ai costi (VERIFICATO)

- Ogni progetto ha solo l'ambiente `dev`: **PROPOSTA** chiarire se è l'ambiente di produzione e, se
  sì, rinominarlo o affiancargli uno staging, per evitare modifiche "di prova" in produzione.
- `ia_predict_soccer/backend/src/backup_db` (434.438.069 byte di dump tracciati) appesantisce
  ogni clone del repository: **PROPOSTA** spostarli fuori dal repository (vedi [ROADMAP.md](./ROADMAP.md)).
