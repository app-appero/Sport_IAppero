# Product Brief — Oracle Sports

## Vision

Creare una sola app mobile capace di raccogliere e presentare predizioni sportive provenienti da più motori ML specializzati.

L'utente non deve sapere che dietro Oracle Sports esistono backend diversi.

Per l'utente esiste un solo prodotto.

## Problema

Attualmente Soccer Oracle e Tennis Oracle sono prodotti separati.

Questo comporta:

- UX frammentata;
- due applicazioni o interfacce separate;
- nessun feed cross-sport;
- nessun ranking globale delle prediction;
- nessun livello comune per preferiti, notifiche o abbonamenti.

## Soluzione

Oracle Sports crea un livello comune sopra i modelli esistenti.

Il sistema deve consentire di aggiungere nuovi sport con impatto minimo sull'applicazione.

Esempi futuri:

- Basketball
- Formula 1
- MotoGP
- NFL
- Baseball

## Core Value Proposition

> Tutte le migliori prediction sportive in una sola app.

## MVP

### Home

Feed cross-sport con le migliori prediction disponibili.

Esempio:

```text
TOP PREDICTIONS

Football
Inter vs Juventus
Prediction: Inter
Confidence: 81%

Tennis
Sinner vs Alcaraz
Prediction: Sinner
Confidence: 76%
```

### Football

Lista eventi e prediction Soccer Oracle.

### Tennis

Lista eventi e prediction Tennis Oracle.

### Prediction detail

Dettaglio di:

- evento;
- competizione;
- partecipanti;
- data/ora;
- prediction;
- probabilità;
- confidence;
- provider;
- eventuale metadata.

## Evoluzione prodotto

### Step successivi

- login;
- favoriti;
- squadre seguite;
- giocatori seguiti;
- notifiche push;
- storico prediction;
- performance dei modelli;
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
