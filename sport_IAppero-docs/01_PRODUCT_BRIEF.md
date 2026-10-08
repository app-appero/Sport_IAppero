# Product Brief — Oracle Sports

## Vision

Creare una sola app mobile capace di raccogliere e presentare predizioni sportive provenienti da più motori ML specializzati.

L'utente non deve sapere che dietro Oracle Sports esistono backend diversi.

Per l'utente esiste un solo prodotto, con una sezione per ogni sport.

## Problema

Attualmente Soccer Oracle e Tennis Oracle sono prodotti separati.

Questo comporta:

- UX frammentata;
- due applicazioni o interfacce separate;
- nessun contenitore comune per preferiti, notifiche o abbonamenti;
- nessuna base condivisa per aggiungere nuovi sport.

## Soluzione

Oracle Sports crea un livello comune sopra i modelli esistenti.

Ogni sport ha il proprio tab. Il tab chiama le API Oracle Sports per ottenere:

- campionati / tornei;
- partite / eventi;
- predizioni;
- mercati.

Il sistema deve consentire di aggiungere nuovi sport con impatto minimo (nuovo tab + nuovo adapter).

Esempi futuri:

- Basketball
- Formula 1
- MotoGP
- NFL
- Baseball

## Core Value Proposition

> Tutte le migliori prediction sportive in una sola app.

## Naming

| Sport in app | Sport id | Provider upstream |
|--------------|----------|-------------------|
| Football | `football` | `soccer-oracle` |
| Tennis | `tennis` | `tennis-oracle` |

## MVP

### Football (tab)

Flusso:

```text
Campionati / competizioni
        ↓
Partite del giorno / selezionate
        ↓
Predizioni + mercati (tutti quelli esposti da Soccer Oracle)
```

### Tennis (tab)

Flusso:

```text
Tornei
        ↓
Partite
        ↓
Predizioni + mercati (tutti quelli esposti da Tennis Oracle)
```

### Prediction / event detail

Dettaglio di:

- evento;
- competizione / torneo;
- partecipanti;
- data/ora;
- prediction;
- probabilità;
- confidence;
- market type;
- provider;
- eventuale metadata.

### Cosa non fare nell'MVP

- Home cross-sport che ordina Football e Tennis insieme per confidence;
- assumere che le confidence dei due provider siano confrontabili.

## Evoluzione prodotto

### Step successivi

- login;
- favoriti;
- squadre seguite;
- giocatori seguiti;
- notifiche push;
- storico prediction;
- performance dei modelli;
- eventuale Home / ranking cross-sport;
- Oracle Score;
- abbonamento Pro.

## Oracle Score

Metric futura che rappresenta l'affidabilità complessiva di una prediction.

Potrà combinare:

- confidence del modello;
- accuratezza recente;
- affidabilità nella competizione;
- quantità/qualità dati;
- performance storica.

Esempio:

```text
Prediction confidence: 74%
Oracle Score: 8.7 / 10
```

Non implementare Oracle Score nella prima iterazione salvo preparare il data model per poterlo aggiungere.
