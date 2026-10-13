# Proposta: vista "Marcatori" (Anytime Goal Scorer)

Stato: PROPOSTA di progetto, solo documento. Nessun codice, test o configurazione viene modificato da questo file. Dove un dettaglio del motore non è noto è scritto "da definire con il motore".

File letti per scrivere questa proposta: `05_CONTRATTO_UNIFICATO.md`, `06_API_BFF.md`, `07_MOBILE.md`, `08_DATI_E_STORICO.md`, `09_ROADMAP_E_TASK.md`, `03_INTEGRAZIONE_SOCCER.md` (prime righe), `backend/app/domain/models.py`, la firma delle route in `backend/app/api/v1/history.py` e l'elenco dei componenti in `mobile/components/`. Il repository del motore (`romy1992/ia_predict_soccer`) non è stato letto: quanto si sa del motore arriva solo dal brief di progetto (eventi per giocatore con `player_id`, formazioni titolari/panchina con ruolo, modello non ancora esistente).

## 1. Perché il contratto attuale non basta

`UnifiedPrediction` (vedi `models.py` e `05_CONTRATTO_UNIFICATO.md`) descrive una predizione di mercato su un evento: un campo `prediction` con una sola `selection` (con `confidence`), una lista `probabilities` di esiti alternativi dello stesso mercato (1X2, over/under), una `decision` (PLAY/BORDERLINE/NO BET) e `pricing`. Il feed raggruppa più predizioni per evento, ma ognuna è "una scelta del modello su un mercato".

Il mercato marcatori ha una forma diversa:

- sono N giocatori (tipicamente 20-30 per partita, titolari più panchina) e ognuno ha una probabilità propria di segnare almeno un gol;
- gli esiti NON sono mutuamente esclusivi: la somma delle probabilità non vale 1 e non va mai normalizzata (più giocatori possono segnare; `05` vieta già di forzare somma=1 tra selezioni non esclusive);
- non esiste una "selezione scelta": il valore per l'utente è la graduatoria e la probabilità di ciascuno;
- la prima versione non ha quote né decisione, quindi `decision`, `pricing` e `confidence` non hanno senso;
- servono attributi di giocatore (ruolo, titolare/panchina, squadra) e uno stato della formazione (ufficiale/probabile/non disponibile) che il contratto attuale non possiede;
- l'identità cambia: la chiave logica è (evento, giocatore, versione modello), non (evento, mercato, linea, selezione).

Cosa serve di diverso: un contratto dedicato con una lista di giocatori, ciascuno con probabilità unitaria 0-1, più metadati di formazione. Non si forza il mercato dentro `UnifiedPrediction` (riempirlo di campi null sarebbe fuorviante e farebbe finire i marcatori nella Home come "card duplicate", contro la regola di `07`). Si riusano invece gli elementi comuni: `meta`, `warnings`, convenzioni di errore, ID evento namespace, tempi UTC.

## 2. Contratto proposto

### 2.1 Endpoint

`GET /api/v1/events/{event_id}/scorers`

- `event_id` namespace come negli altri endpoint, solo `soccer:event:{fixture_id}`. Per un evento tennis: 404 con codice `market_not_supported` (il mercato non esiste, non è "dati mancanti").
- Nessun parametro obbligatorio. Opzionali (fase successiva): `team=home|away` per filtrare, `min_probability`. Allowlist come per gli altri endpoint (`06`).
- Il BFF legge dallo snapshot/cache o da una chiamata al motore con le stesse regole di `06` (base URL da config, nessun refresh forzato). Come il motore espone il dato: da definire con il motore (vedi sezione 6).
- Il feed (`/feed`) NON include i marcatori in prima fase. Nel dettaglio evento si aggiunge solo un indicatore di disponibilità (vedi 2.5) per non fare N chiamate.

### 2.2 Campi

Radice:

| Campo | Tipo | Note |
|---|---|---|
| `schema_version` | string | "1" del contratto marcatori, indipendente dal feed |
| `event_id` | string | `soccer:event:{fixture_id}` |
| `market` | string | costante `anytime_goal_scorer` |
| `lineup` | oggetto | stato formazione, vedi sotto |
| `players` | array | può essere vuoto; ordinato per probabilità decrescente, tie per `player.name` poi `id` (deterministico) |
| `model` | oggetto o null | `{name, version, run_id}` come `Model` in `05`; null se il motore non lo dichiara |
| `generated_at` | ISO 8601 UTC con Z | quando il BFF ha costruito la risposta |
| `meta` | oggetto | stesso schema logico di `FeedMeta`: `status`, `is_complete`, `providers`, `warnings` |

`lineup`:

| Campo | Tipo | Note |
|---|---|---|
| `status` | `official` \| `probable` \| `unavailable` | vedi 2.3 |
| `source_kind` | string o null | es. formazione ufficiale da feed partita o stima del motore; valori da definire con il motore |
| `published_at` | ISO UTC o null | quando la formazione (ufficiale o probabile) è stata acquisita dal motore, se noto |
| `model_updated_at` | ISO UTC o null | ultimo calcolo delle probabilità; distinto da `generated_at` (come "fetched time distinto da model time" in `05`) |

Per giocatore (`players[]`):

| Campo | Tipo | Note |
|---|---|---|
| `id` | string | `soccer:player:{player_id}` namespace; il `player_id` del motore è l'unica fonte, mai ricavato dal nome |
| `name` | string | nome come dal motore, senza normalizzazioni creative |
| `team` | `home` \| `away` | stesso `role` dei `Participant` dell'evento; il nome squadra si legge dall'evento |
| `position` | `GK` \| `DF` \| `MF` \| `FW` \| null | null se il ruolo non è noto. L'enum esatto dei ruoli del motore è da definire con il motore; il BFF mappa solo valori certi e conserva l'originale in `position_source` |
| `position_source` | string o null | valore grezzo del motore |
| `probability` | float [0,1] o null | probabilità stimata che il giocatore segni almeno un gol (autogol esclusi), numero unitario. null = non disponibile |
| `is_starter` | bool o null | true titolare, false panchina, null se la formazione non è ancora nota o non è determinabile |
| `warnings` | string[] | opzionale, avvisi a livello giocatore (es. "Ruolo non disponibile") |

Non ci sono campi `confidence`, `decision`, `pricing`, `odds`: la prima versione non li dichiara. Quando arriveranno quote o decisioni si aggiungeranno come campi opzionali con `schema_version` coerente (campi additivi, vedi Rischi).

### 2.3 Stato formazione e regole

- `official`: formazione ufficiale acquisita; `is_starter` è true/false per ogni giocatore e le probabilità sono quelle del modello della prima versione ("dopo le formazioni ufficiali").
- `probable`: formazione stimata (fase 3, versione anticipata). `is_starter` indica il ruolo previsto; la UI dichiara che è una stima. Non si trasforma mai silenziosamente in `official`: quando esce la ufficiale, il motore ricalcola e `lineup.status` passa a `official`.
- `unavailable`: la formazione non c'è (non ancora uscita, partita senza copertura, dato mancante). `players` è `[]`, 200 con `meta.status = "empty"`; mai un 404 e mai probabilità "di ripiego" costruite dal BFF.
- Il BFF non calcola, non stima e non riordina probabilità: passa i valori del motore dopo la validazione.

Validazione (coerente con "Validazione" di `05`):

- `probability` fuori [0,1], NaN o non numerica: il giocatore resta in lista con `probability = null` e un warning, oppure viene scartato se l'identità è invalida; contatore nei log, senza payload upstream completo. Mai sostituito da 0, 0.5 o dalla media.
- Valori percentuali (71 invece di 0.71): non si convertono mai automaticamente; il contratto sorgente dovrà dichiarare l'unità (da definire con il motore) e il BFF rifiuta valori fuori range.
- `player_id` mancante: record scartato con warning e contatore. Duplicati dello stesso `player_id`: si tiene il primo e si segnala il conflitto.
- Nessuna normalizzazione della somma delle probabilità.

### 2.4 Esempio JSON completo

Esempio illustrativo: i nomi e i valori sono segnaposto per mostrare la forma, NON dati reali né output del motore.

```json
{
  "schema_version": "1",
  "event_id": "soccer:event:1234567",
  "market": "anytime_goal_scorer",
  "lineup": {
    "status": "official",
    "source_kind": null,
    "published_at": "2026-10-17T15:42:00Z",
    "model_updated_at": "2026-10-17T15:50:00Z"
  },
  "players": [
    {
      "id": "soccer:player:1001",
      "name": "Giocatore Esempio A",
      "team": "home",
      "position": "FW",
      "position_source": "Attacker",
      "probability": 0.41,
      "is_starter": true,
      "warnings": []
    },
    {
      "id": "soccer:player:2002",
      "name": "Giocatore Esempio B",
      "team": "away",
      "position": "MF",
      "position_source": "Midfielder",
      "probability": 0.18,
      "is_starter": true,
      "warnings": []
    },
    {
      "id": "soccer:player:3003",
      "name": "Giocatore Esempio C",
      "team": "home",
      "position": null,
      "position_source": null,
      "probability": 0.07,
      "is_starter": false,
      "warnings": ["Ruolo non disponibile"]
    },
    {
      "id": "soccer:player:4004",
      "name": "Giocatore Esempio D",
      "team": "away",
      "position": "DF",
      "position_source": "Defender",
      "probability": null,
      "is_starter": true,
      "warnings": ["Probabilità non disponibile"]
    }
  ],
  "model": {"name": "da definire con il motore", "version": null, "run_id": null},
  "generated_at": "2026-10-17T15:51:10Z",
  "meta": {
    "status": "ok",
    "is_complete": true,
    "providers": [
      {"provider": "soccer", "status": "ok", "item_count": 4, "truncated": false}
    ],
    "warnings": []
  }
}
```

In lista l'ordine è per probabilità decrescente con i `null` in fondo (regola di ranking di `05`). L'esempio ha solo 4 giocatori per brevità; la lista reale è completa (titolari più panchina) o dichiarata incompleta tramite `meta.is_complete = false` e `truncated`.

### 2.5 Casi limite

| Caso | Risposta | Mostrato nell'app |
|---|---|---|
| Formazione non ancora uscita | 200, `lineup.status = "unavailable"`, `players = []`, `meta.status = "empty"`, warning "Formazioni non ancora disponibili" | "Formazioni non ancora disponibili. La stima compare dopo le formazioni ufficiali." Nessun elenco, nessuna percentuale |
| Giocatore senza ruolo | resta in lista, `position = null`, warning per giocatore | ruolo omesso o "Ruolo non disponibile"; non si assume un ruolo |
| Probabilità mancante per un giocatore | `probability = null` | "Non disponibile"; mai 0, mai 0.5, mai media |
| Probabilità mancanti per tutti | 200, `players` con tutti null oppure `[]` con warning del provider | stato vuoto con spiegazione |
| `is_starter` non noto | null | nessuna etichetta Titolare/Panchina |
| Motore non raggiungibile / 401 / timeout | 200 con `meta.status = "degraded"` solo se esiste una snapshot in cache marcata obsoleta; altrimenti 503 con `{code, message, request_id}`; 401 del provider non diventa 401 del consumer (`06`) | stato errore con "Riprova"; con cache: dati precedenti marcati obsoleti |
| Evento sconosciuto / `fixture:null` | 404 `event_not_found` | errore "Partita non trovata" |
| Evento non calcio | 404 `market_not_supported` | la voce non compare |
| Partita già iniziata/finita | 200 con i valori pubblicati e `event.status` dall'evento; non si ricalcolano né si aggiornano le probabilità dopo il calcio d'inizio | etichetta "Pubblicata prima del calcio d'inizio" oppure vuoto; da decidere se mostrare dopo la fine (domanda 6) |
| Rinvio/cancellazione | probabilità non più valide: il motore dovrebbe ritirarle (`withdrawn`, come nello status di predizione di `05`); da definire con il motore | "Non disponibile" con motivo |
| Formazione cambiata dopo la pubblicazione | nuova revisione, la precedente resta in storico (append-only) | si mostra l'ultima, con orario di aggiornamento |

Indicatore di disponibilità nel dettaglio evento: `unavailable_markets` esiste già in `UnifiedEvent`; per i marcatori il dettaglio evento mostra la voce "Marcatori" solo se il motore dichiara il mercato per quella lega (le prime 5 leghe). Nome e forma del campo di capability: da definire; ipotesi, voce in `GET /api/v1/sports` (capability e mercati).

## 3. Regole di prodotto già in vigore da rispettare

Dalla documentazione letta:

- Etichetta "Probabilità stimata", mai "Precisione" né "sicurezza" (`07`). Titolo suggerito della sezione: "Probabilità stimata di segnare". Niente linguaggio da scommessa: nessuna quota, nessun "consigliato" finché il motore non dichiara una decisione (`05`: decisione solo da dati provider).
- Niente dati inventati: dati mancanti = "Non disponibile"; mai 0.5 o 0 al posto di null (`05`, `07`, test significativi in `09`: "NaN/out of range: warning ed esclusione, non 0.5"). Niente foto o loghi di giocatori senza fonte (`07`): solo nome, ruolo, squadra.
- Percentuali formattate da float unitario, una sola moltiplicazione per 100 in presentazione, nessuna conversione automatica 71 -> 0.71 (`05`, `07`).
- Orari Europe/Rome per l'utente italiano, API in UTC con Z; orario ignoto dichiarato (`05`, `07`).
- Nessun Oracle Score, nessuna aggregazione cross-sport; il ranking per probabilità vale solo dentro l'evento (`05`).
- Nessuna chiamata diretta dell'app ai domini dei motori; solo il BFF (`06`, `07`).
- Dati tecnici e pubblicazioni ufficiali tenuti distinti (`05`, `07`): le probabilità marcatori della v1 sono "pubblicate dal motore dopo le formazioni ufficiali"; la versione con formazione probabile è un'altra fonte e va etichettata come tale.
- Non confrontare "Statistica giornata" e Storico (nota in `09`): lo stesso vale per un'eventuale statistica marcatori, che avrà denominatore proprio.

## 4. Schermata mobile

### 4.1 Dove si apre

Dal dettaglio partita di calcio (`07`: il dettaglio mostra evento, esiti, probabilità, timestamp e warning). Il dettaglio evento esistente ha una nuova voce/sezione "Marcatori" visibile solo per eventi di calcio con il mercato dichiarato. Si apre una schermata dedicata (stack, con ritorno al dettaglio), non una nuova tab (l'app non ha tab bar per scelta di prodotto) e non una card nella Home (evita card duplicate). Percorso suggerito: sotto l'evento, es. `/evento/[id]/marcatori`; nome esatto e struttura di Expo Router da definire in implementazione (nessun componente scritto qui).

### 4.2 Cosa mostra

- Intestazione: partita (squadre, orario Europe/Rome), titolo "Marcatori", sottotitolo "Probabilità stimata di segnare almeno un gol (autogol esclusi)".
- Riga di stato formazione: "Formazione ufficiale, aggiornata alle 17:42" oppure "Formazione probabile: può cambiare" oppure "Formazioni non ancora disponibili".
- Elenco giocatori con filtro/segmento Tutti | Casa | Trasferta (stesso pattern dei chip esistenti), ordinato per probabilità decrescente.
- Riga giocatore: nome, squadra, ruolo (se noto), etichetta Titolare/Panchina (se nota), probabilità in percentuale, con barra come l'attuale `ConfidenceBar` solo se rispetta l'etichetta "Probabilità stimata" (la barra non deve essere letta come "sicurezza").
- Pie di pagina: avvertenza breve ("Stime statistiche, non garantiscono l'esito"), orario di aggiornamento del modello, warning del provider se presenti.
- Nessuna quota, nessun badge PLAY/BORDERLINE/NO BET in prima versione.

Schema testuale (non vincolante):

```
< Partita                        [Casa | Trasferta]
Inter - Milan      sab 17 ott, 20:45
MARCATORI
Probabilità stimata di segnare (autogol esclusi)
[ Formazione ufficiale · agg. 17:50 ]
[ Tutti ] [ Casa ] [ Trasferta ]
--------------------------------------------
 1  Giocatore A   Casa · Attaccante · Titolare   41%
 2  Giocatore B   Trasf. · Centrocampista · Tit. 18%
 3  Giocatore C   Casa · Ruolo n.d. · Panchina    7%
 4  Giocatore D   Trasf. · Difensore · Titolare  Non disponibile
--------------------------------------------
Stime statistiche. Aggiornato alle 17:50.
```

(Nomi e numeri sono segnaposto.)

### 4.3 Stati (riuso di quelli esistenti)

- Skeleton iniziale: righe scheletro in stile `EventCardSkeleton`, ferme con "riduci animazioni" (M04).
- Vuoto: `EmptyState` con "Formazioni non ancora disponibili" quando `lineup.status = unavailable`; testo diverso da "nessun evento".
- Errore completo: `EmptyState`/errore con pulsante "Riprova"; mai spinner infinito su 401/provider guasto (`07`).
- Provider degradato: `FeedBanner`/`ProviderWarning` con messaggio dal `meta.warnings`.
- Offline: dati dell'ultima snapshot marcati obsoleti con l'ora (`OfflineBanner`, M06); non si finge aggiornamento live. La cache persistita (AsyncStorage 24 h) si applica anche qui; i marcatori obsoleti dopo l'inizio partita restano indicati come "pubblicati prima del calcio d'inizio".
- Aggiornamento: pull-to-refresh; polling solo in primo piano e solo finché la partita non è iniziata e la formazione non è `official`; i dati precedenti restano visibili durante il refresh (M05). Cambio da `probable` a `official` mostrato con la riga di stato aggiornata, senza animazioni invasive.

### 4.4 Accessibilità

- Target tattili almeno 44 px; righe leggibili con font di sistema ingranditi (verifica a 360/390/430 px, già richiesta in `07` e M08, ancora non svolta per iOS).
- Etichette per screen reader per riga: "Giocatore A, squadra di casa, attaccante, titolare, probabilità stimata 41 per cento". "Non disponibile" parlato per null, non "zero".
- Lo stato formazione è anche testo (non solo colore/icona); la barra di probabilità non è l'unico veicolo del dato; contrasto in tema chiaro e scuro.
- Ordine di lettura: intestazione, stato formazione, filtri, righe in ordine di probabilità.

## 5. Storico e settlement

### 5.1 Cosa si misura

Per ogni giocatore con probabilità pubblicata, esito binario: ha segnato almeno un gol nella partita, sì/no. Il risultato si ricava dagli eventi per giocatore salvati dal motore (gol con `player_id`), con regole da fissare e dichiarare (rule_version):

- gol validi: gol su azione e rigore in gara; gol di autorete (autogol) esclusi dal "ha segnato" del giocatore che lo commette; il tipo di evento che identifica l'autogol e i rigori dei tiri di rigore finali è da definire con il motore;
- supplementari: da decidere (domanda aperta 5); raccomandazione: solo tempo regolamentare più recupero, salvo diversa convenzione dichiarata;
- giocatore che non scende in campo (titolare poi sostituito prima del calcio d'inizio, panchinaro non entrato): stato `void` o `not_played`, escluso dal denominatore e conteggiato a parte. Il modello è calcolato dopo le formazioni ufficiali, ma un cambio in extremis o una panchina non utilizzata sono casi reali: serve distinguerli da `lost`. Se il motore non permette di sapere se il giocatore è sceso in campo, da definire con il motore; finché non è noto, `unknown`, non `lost`;
- partita rinviata/sospesa/cancellata: `void` secondo la regola del provider, non decisa dal BFF (`08`);
- dati eventi incompleti o partita non ancora conclusa: `pending`/`unknown`, mai `lost` per default (`08`: "null non equivale a sconfitta").

Il BFF non decide gli esiti con euristiche: li legge dal motore se li espone già risolti, o li calcola da eventi esposti con regola versionata e tracciabile (scelta da fare con il motore, vedi sezione 6).

### 5.2 Coerenza con `08_DATI_E_STORICO.md`

- Pubblicazione prima del calcio d'inizio: conta solo una revisione con orario di acquisizione/pubblicazione verificato prima del kickoff, come per Soccer (`captured_at` < kickoff). Una probabilità ricalcolata dopo l'inizio o dopo la fine non entra nella performance pubblicata (`08`). Una fixture senza orario certo non è dichiarata pre-match.
- Append-only: ogni cambio di formazione o ricalcolo crea una nuova revisione; non si sovrascrive mai una probabilità pubblicata. Per l'esito si usa la revisione pubblicata più recente prima del kickoff (regola da dichiarare) e si conserva il resto. La versione `probable` e quella `official` sono pubblicazioni diverse e vanno mantenute in gruppi separati (provenienza diversa, `08`).
- Persistenza: oggi `prediction_revisions` ha una riga per (evento, mercato, linea, selezione). Un evento ha 20-30 giocatori: o si usano le stesse tabelle con una selezione per giocatore e `market = anytime_goal_scorer`, oppure si introduce una tabella dedicata (es. revisioni per giocatore). Scelta da fare in fase 2 con un confronto di costo; nessuna tabella è creata qui. Le tabelle esistenti non vanno inflazionate senza necessità (`08`: nessuna tabella decorativa).
- Denominatori dichiarati: ogni statistica mostra finestra, numero di giocatori-partita valutati, `won`, `lost`, `void/non sceso in campo`, `pending`. Nessuna media aritmetica di percentuali tra gruppi: l'aggregazione usa conteggi omogenei (`08`).
- Gruppi separati per sport (solo calcio), mercato, modello, versione, periodo e provenienza (official vs probable).

### 5.3 Metriche proposte

Nel mercato giocatori il "win rate" non è la metrica giusta: non esiste una scelta PLAY, e la maggior parte dei giocatori ha probabilità bassa e non segna, quindi un tasso di successo globale sarebbe fuorviante. Metriche proposte, tutte con conteggi:

1. Calibrazione per fascia: i giocatori sono raggruppati in fasce di probabilità dichiarata (es. 0-10%, 10-20%, ...). Per ogni fascia: numero di giocatori valutati, quanti hanno segnato, frequenza osservata. È la lettura più onesta del "Probabilità stimata". Fasce con campione sotto una soglia minima (da fissare) sono mostrate ma segnalate come "campione insufficiente".
2. Brier score e log-loss, solo con campioni sufficienti e esiti compatibili (`08`), per versione di modello; non in MVP dello storico.
3. Opzionale, solo descrittiva: "tra i 3 giocatori con probabilità più alta della partita, quanti hanno segnato" (hit del top-N), sempre con denominatore. Non è un win rate di scommessa.

Niente ROI (nessuna quota; `08` lo esclude già dal primo MVP).

### 5.4 Integrazione con `/api/v1/history`

L'attuale `/history/stats` e `/history/predictions` hanno filtro `decision` con default `PLAY` (P08), win rate = won/(won+lost) e settlement per una selezione per partita. Per i marcatori: i record non hanno `decision`, quindi con il default `PLAY` sparirebbero, e un win rate globale non è la metrica giusta. Raccomandazione: nuovi endpoint dedicati, senza toccare quelli esistenti nella prima versione:

- `GET /api/v1/history/scorers/stats` con `from`, `to`, `lineup_status` (default `official`), `model_name`; risposta con fasce di calibrazione e denominatori;
- `GET /api/v1/history/scorers/players` (o per partita) per l'elenco paginato come in P11.

Forma, nomi e parametri da rifinire in fase 2. Nell'app `/storico` si aggiunge, a fase 2 completata, un selettore "Marcatori" accanto a Calcio/Tennis, con testo che spiega che è una misura di calibrazione e non una percentuale di giocate vincenti. Lo storico parte dalla data della prima registrazione dei marcatori e non promette osservazioni anteriori (come avviene per Calcio dal 12 settembre e Tennis dal 22 luglio in `09`).

## 6. Dipendenze dal motore Soccer

Cosa il motore dovrebbe esporre (tutto da concordare; nessuna di queste cose è assunta come esistente):

1. Un endpoint per partita (o per giorno) di sola lettura, senza calcoli on-demand lato BFF: il BFF non deve attivare calcolo costoso né fare N chiamate per evento (stessa cautela di `03` per `/dashboard/match`, che può attivare calcolo). Path e parametri: da definire con il motore.
2. Probabilità per giocatore come float unitario [0,1] con unità dichiarata nel contratto (non percentuali).
3. Stato formazione esplicito (`official`/`probable`/`unavailable`) e orario di acquisizione della formazione e del calcolo, con timestamp verificabile (per rispettare la regola pre-match di `08`).
4. Identificativo stabile del giocatore (`player_id`), ruolo, squadra, titolare/panchina.
5. Versione del modello (`name`, `version`, `run_id`) e `content_version` per revisioni.
6. Per lo storico: gol per giocatore con tipo evento (gol, rigore, autogol), minuti, e un indicatore di presenza in campo; oppure l'esito già risolto dal motore con la regola dichiarata.
7. Comportamento su rinvio/cancellazione e su formazione che cambia (ritiro, nuova revisione).

Payload atteso (ipotesi di lavoro per discutere con il motore, NON il formato reale; i nomi dei campi sono da definire):

```json
{
  "fixture_id": 1234567,
  "market": "anytime_goal_scorer",
  "lineup_status": "official",
  "lineup_captured_at": "2026-10-17T15:42:00+00:00",
  "computed_at": "2026-10-17T15:50:00+00:00",
  "model": {"name": "da definire", "version": "da definire", "run_id": null},
  "players": [
    {"player_id": 1001, "name": "Giocatore Esempio A", "team": "home",
     "position": "Attacker", "is_starter": true, "p_score": 0.41}
  ]
}
```

Il BFF mapperà questo nel contratto della sezione 2 con le stesse regole di mapping di `03` (id namespace, niente ID inventati, sconosciuto resta sorgente).

### 6.1 Sequenza di lavoro in fasi

| Fase | Contenuto | Criteri di accettazione |
|---|---|---|
| 0. Accordo sul contratto | Review di questo documento; con il motore: payload, unità, ruoli, timestamp, tipi di evento gol, comportamento su rinvii | Contratto dati sorgente scritto e condiviso; domande 1-8 risolte o marcate come rinviate; nessun endpoint inventato |
| 1. Vista live v1 (dopo formazioni ufficiali) | BFF: client, mapper, route `GET /events/{id}/scorers`, test con fixture; mobile: schermata, stati, accessibilità; solo le prime 5 leghe | Fixture reali o schemi del motore (non mock presentati come reali); test: probabilità null non diventa 0.5, fuori range scartata, formazione assente = 200 `unavailable`, id duplicati, tennis = 404; typecheck mobile pulito; verifica a 360/390/430 px e font ingranditi; nessuna chiamata diretta al motore dall'app; dato mancante mostra "Non disponibile"; etichetta "Probabilità stimata"; orari Europe/Rome; nessun segreto nel bundle |
| 2. Persistenza e storico | Revisioni append-only per giocatore con orario di pubblicazione, settlement da eventi (regole sezione 5.1), endpoint storico dedicati, selettore in `/storico` | Solo revisioni pre-kickoff contate; test su autogol, giocatore non sceso in campo, rinvio, supplementari secondo regola scelta; denominatori e conteggi mostrati; nessuna media di percentuali; backup PostgreSQL configurato (P13) prima di contare sullo storico |
| 3. Formazione probabile | Il motore pubblica stime anticipate; BFF e app gestiscono `probable`, passaggio a `official`, etichetta chiara | Le due provenienze restano separate nello storico; l'app non presenta mai una probabile come ufficiale; transizione verificata con fixture; avviso "può cambiare" |
| 4. Estensioni (da valutare, fuori da questa proposta) | Altre leghe, quote e decisione se il motore le dichiara, indicatore in Home | Solo con evidenza di uso e dati del motore; da riscrivere come proposta separata |

## 7. Rischi

- Modello inesistente: la vista dipende da una consegna esterna; senza il contratto del motore si rischia un BFF costruito su ipotesi. Mitigazione: fase 0.
- Lettura scorretta della probabilità: 41% per un giocatore può sembrare alta o bassa; l'utente può leggerla come certezza o come consiglio di scommessa. Mitigazione: testo, nessuna quota, avvertenza.
- Campione dello storico piccolo all'inizio: fasce di calibrazione instabili per settimane. Mitigazione: soglia minima e "campione insufficiente".
- Formazione cambiata dopo la pubblicazione o giocatore non sceso in campo: gonfia o falsa lo storico se contato come `lost`. Mitigazione: stato `void/not_played` dichiarato.
- Aggiornamento tardivo: le formazioni escono circa un'ora prima del calcio d'inizio (da verificare con il motore); la finestra utile è breve e il polling a 60 s può essere in ritardo. Mitigazione: refresh mirato e orario di aggiornamento sempre visibile.
- Aspetti legali e di store (gioco/scommesse): stime di marcatori sono vicine al mondo scommesse. Servono verifica delle policy degli store e dell'informativa; nessuna quota o rimando a bookmaker in v1.
- Volume: 20-30 righe per partita e molte partite per giorno; storico per giocatore cresce rapidamente. Mitigazione: scelta di tabella e retention in fase 2.
- Licenza/diritti sui dati giocatore (nomi, eventi): provenienza dei dati del motore da confermare.

## 8. Domande aperte per l'utente (max 8)

1. Leghe iniziali: quali sono le prime 5 e come coincidono con quelle già coperte dal feed Calcio? Raccomandazione: le 5 con formazioni ufficiali più affidabili nei dati del motore, dichiarate in `/sports`; le altre mostrano "Marcatori non disponibili per questa competizione".
2. La prima versione compare solo dopo le formazioni ufficiali (circa 1 ora prima del calcio d'inizio): va bene un periodo in cui la voce è visibile ma vuota ("non ancora disponibile")? Raccomandazione: sì, con il messaggio esplicito e senza notifiche in v1.
3. Chi risolve l'esito "ha segnato sì/no": il motore (con regola dichiarata) o il BFF dagli eventi? Raccomandazione: il motore espone eventi grezzi con tipo e `player_id`, il BFF applica una regola versionata e tracciabile; se il motore ha già un settlement, il BFF lo legge.
4. Giocatore non sceso in campo: escluso dal denominatore (`void`) o contato come non segnato? Raccomandazione: escluso e conteggiato a parte, perché la probabilità dopo le formazioni ufficiali è condizionata a giocare.
5. Supplementari e rigori finali: contano? Raccomandazione: solo tempo regolamentare con recupero (rigori dei tiri finali esclusi), da scrivere nelle note della metrica.
6. Dopo il fischio finale la vista resta visibile con la stima pubblicata e l'esito (segnato sì/no)? Raccomandazione: sì, mostrando l'esito accanto alla probabilità solo dopo la chiusura e a parte rispetto alla stima, perché serve fiducia e verifica.
7. Storico: pubblicare subito le fasce di calibrazione o attendere una soglia minima di campione? Raccomandazione: raccogliere dal primo giorno, pubblicare in app solo dopo la soglia (es. alcune centinaia di giocatori-partita per fascia, valore da concordare) e nel frattempo mostrare i soli conteggi.
8. Posizionamento e quote: la vista resta separata dalle decisioni PLAY/BORDERLINE/NO BET, senza quote, anche quando il motore le avrà? Raccomandazione: sì in v1 e v2; quote e decisioni solo con una proposta separata dopo aver misurato la calibrazione.

## 9. Fuori scope

Quote, decisioni, ROI, notifiche push, preferiti, tennis, marcatori nella Home o nel feed, Oracle Score, qualunque codice o migrazione: nessuno di questi è previsto da questa proposta.
