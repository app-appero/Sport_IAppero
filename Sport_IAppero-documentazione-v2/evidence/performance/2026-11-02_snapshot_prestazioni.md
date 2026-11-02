# Snapshot prestazioni produzione — 2026-11-02

Scopo: fotografia dei dati veri dei DB di produzione per confrontarla tra qualche periodo (stesse query, stesse definizioni) e capire cosa è da sistemare.
Fonte: sola lettura sui DB Railway. Nessun segreto in questo file.

## Definizioni (tenerle uguali nei confronti futuri)
- ROI: stake 1 piatto, IC95% bootstrap 10.000 resample.
- Baseline bookmaker: probabilità implicita senza margine (Soccer: `p_market_fair`; Tennis: quote "opening", media bookmaker, entrambi i lati).
- Base rate: frequenza storica dell'esito come previsione costante.
- Finestra "30gg": dal 2026-10-03.
- n<100 = campione piccolo. (Soccer: nelle tabelle, quasi tutte le celle sono n<100.)

## SOCCER — cohort `official_paper`, 2026-09-12 → 2026-11-01, n=530 (12 righe escluse: regolate ma senza esito)
Non tracciati nel DB: 1X2, doppia chance.

| Mercato | n | Hit | ROI [IC95%] | LL modello | LL base | LL bookmaker | Giudizio |
|---|---|---|---|---|---|---|---|
| U/O 1.5 | 103 | 72,8% | −10,9% [−21,6; −0,4] | 0,585 | 0,585 | 0,571 | no edge |
| U/O 2.5 | 103 | 57,3% | −11,8% [−27,2; 3,4] | 0,736 | 0,683 | 0,639 | no edge |
| U/O 3.5 | 110 | 63,6% | −0,8% [−15,3; 13,7] | 0,652 | 0,656 | 0,609 | no edge |
| U/O 4.5 | 27 | 74,1% | −5,7% [−28,3; 14,7] | 0,520 | 0,572 | 0,481 | campione piccolo |
| Goal/No goal | 83 | 55,4% | −10,1% [−27,7; 7,4] | 0,697 | 0,687 | 0,653 | no edge |
| Cartellini squadra | 60 | 60,0% | −2,1% [−22,7; 18,1] | 0,688 | 0,673 | 0,636 | piccolo, nessun segnale |
| Corner | 44 | 50,0% | −4,4% [−32,1; 24,0] | 0,737 | 0,693 | 0,698 | piccolo, nessun segnale |

Per decisione (n / hit / ROI): U/O 1.5 PLAY 34/64,7%/−13,4%, NO BET 65/75,4%/−11,5% · U/O 2.5 PLAY 34/61,8%/−7,4%, NO BET 59/54,2%/−14,8% · U/O 3.5 PLAY 49/49,0%/−16,4%, NO BET 54/79,6%/+16,9% · Goal/NG PLAY 16/50,0%/−19,5% · Cartellini PLAY 29/55,2%/−4,6% · Corner PLAY 3/0%/−100% · U/O 4.5 PLAY 27/74,1%/−5,7%.

Calibrazione (pooled, tutti i mercati):
| Fascia | n | Prevista | Osservata |
|---|---|---|---|
| 50-60 | 144 | 53,9% | 52,8% |
| 60-70 | 175 | 64,7% | 58,3% |
| 70-80 | 114 | 74,8% | 66,7% |
| 80+ | 97 (n<100) | 87,7% | 76,3% |

Ultimi 30gg vs tutto (n / hit / ROI / LL):
| Mercato | 30gg | Tutto |
|---|---|---|
| Cartellini | 44 / 59,1% / −7,9% / 0,694 | 60 / 60,0% / −2,1% / 0,688 |
| Corner | = tutto (nessuna predizione prima) | 44 / 50,0% / −4,4% / 0,737 |
| Goal/NG | 75 / 60,0% / −2,8% / 0,655 | 83 / 55,4% / −10,1% / 0,697 |
| U/O 1.5 | 75 / 77,3% / −8,7% / 0,529 | 103 / 72,8% / −10,9% / 0,585 |
| U/O 2.5 | 75 / 56,0% / −14,5% / 0,662 | 103 / 57,3% / −11,8% / 0,736 |
| U/O 3.5 | 81 / 65,4% / −2,2% / 0,634 | 110 / 63,6% / −0,8% / 0,652 |
| U/O 4.5 | nessuna riga | 27 / 74,1% / −5,7% / 0,520 |

Giocatori (ultima revisione per fixture+player; nessuna quota → ROI non disponibile):
| | Predizioni | Partite | Hit | Brier (base) | LL (base) | P@1 | P@3 | P@5 |
|---|---|---|---|---|---|---|---|---|
| Marcatori | 2.284 | 107 | 10,6% | 0,087 (0,094) | 0,303 (0,337) | 31,8% | 27,1% | 23,4% |
| Cartellini gialli | 2.000 | 93 | 13,8% | 0,118 (0,119) | 0,396 (0,400) | 19,4% | 17,9% | 17,6% |
AUC marcatori (riferimento backtest 0,74): non calcolata.

## TENNIS — DB Oracle-Tennis (unico ambiente "dev")
| Mercato | Periodo | n | Hit | ROI [IC95%] | LL modello | LL mercato | Giudizio |
|---|---|---|---|---|---|---|---|
| Vincitore partita (solo PLAY) | 2026-07-22 → 08-29 | 140 | 45,7% | −19,6% [−34,0; −5,0] | 0,732 | 0,695 | no edge, perde |
| 1° set, tutte | 2026-08-13 → 11-02 | 8.975 | 66,3% | −4,3% [−5,8; −2,8] | 0,609 | 0,608 | no edge |
| 1° set, PLAY | idem | 1.127 | 63,3% | +2,0% [−2,7; 6,7] | 0,650 | 0,652 | non dimostrabile |
| 1° set, BORDERLINE | idem | 1.359 | 67,1% | −3,9% [−7,7; −0,1] | 0,588 | 0,588 | no edge |
| 1° set, NO BET | idem | 6.249 | 66,9% | −5,5% [−7,2; −3,8] | 0,604 | 0,603 | no edge |
| O/U games, tutte | idem | 6.588 | 54,6% | −7,1% [−9,3; −5,0] | 0,686 | 0,684 | no edge |
| O/U games, PLAY | idem | 960 | 50,3% | −7,0% [−12,8; −1,3] | 0,702 | 0,692 | no edge, perde |
| O/U games, BORDERLINE | idem | 413 | 52,8% | −5,1% [−13,8; 3,4] | 0,691 | 0,689 | no edge |

Note: vincitore partita fermo da fine agosto (0 pubblicazioni negli ultimi 30gg). Vincitore v4 (PLAY, n=52): accuratezza 44,2% [30,8; 57,7], LL 0,755, LL mercato 0,723 — il backtest dichiarava 71,2% / 0,550.

Ultimi 30gg vs tutto:
| Mercato | 30gg (n / hit / ROI / LL) | Tutto |
|---|---|---|
| Vincitore | 0 | 140 / 45,7% / −19,6% / 0,732 |
| 1° set | 3.675 / 66,5% / −4,6% / 0,606 | 8.975 / 66,3% / −4,3% / 0,609 |
| O/U games | 2.714 / 55,6% / −5,5% / 0,684 | 6.588 / 54,6% / −7,1% / 0,686 |

Spaccati (n≥50):
| Mercato | Superficie | n | Hit | ROI |
|---|---|---|---|---|
| 1° set | Clay / Hard / Hard Indoor | 2.305 / 3.949 / 569 | 67,3 / 65,5 / 64,3% | −4,2 / −4,4 / −3,2% |
| O/U games | Clay / Hard / Hard Indoor | 1.661 / 2.969 / 433 | 52,4 / 55,1 / 60,5% | −7,7 / −7,2 / −5,4% |

| Mercato | Livello | n | Hit | ROI |
|---|---|---|---|---|
| 1° set | ATP / Chall M / Chall W / ITF M / ITF W / WTA | 872 / 2.143 / 569 / 2.426 / 2.158 / 807 | 63,3 / 63,5 / 63,8 / 68,4 / 68,3 / 67,2% | −2,8 / −4,4 / −6,3 / −5,4 / −4,6 / +0,5% |
| O/U games | ATP / Chall M / Chall W / ITF M / ITF W / WTA | 639 / 1.616 / 549 / 1.523 / 1.447 / 814 | 62,9 / 55,3 / 53,9 / 52,9 / 51,6 / 55,3% | −7,6 / −8,1 / −7,1 / −6,7 / −7,2 / −5,6% |

| Mercato | Quota | n | Hit | ROI |
|---|---|---|---|---|
| 1° set | <1,50 / 1,50-2,00 / 2,00-3,00 | 4.480 / 4.135 / 120 | 75,4 / 57,2 / 51,7% | −4,2 / −4,6 / +5,1% (n piccolo) |
| O/U games | <1,50 / 1,50-2,00 / 2,00-3,00 | 658 / 5.552 / 259 | 65,3 / 53,6 / 44,0% | −9,1 / −6,8 / −9,3% |
Vincitore: tutti gli spaccati n<100.

Calibrazione (prevista → osservata):
| Mercato | 50-60 | 60-70 | 70-80 | 80+ |
|---|---|---|---|---|
| 1° set | 54,9 → 54,8% | 64,8 → 64,7% | 74,6 → 74,8% | 87,6 → 85,6% |
| O/U games | 53,8 → 53,1% | 63,7 → 60,4% | 72,8 → 67,6% (n=108) | n=7 |
| Vincitore | n=89 54,5 → 41,6% | n=31 | n=18 73,7 → 33,3% | n=2 |

## Da sistemare (stato al 2026-11-02, da ricontrollare)
1. Nessun mercato Soccer o Tennis ha un edge dimostrato sul ROI; il bookmaker batte il modello in log-loss su tutti i 7 mercati Soccer.
2. Probabilità Soccer troppo sicure sopra il 60%; O/U games Tennis sopra il 60%.
3. Backtest ≠ produzione (Tennis vincitore 71,2% vs 44,2%; Soccer O/U log-loss più alti in produzione): da capire (fuga di dati, split non temporale, cohort diverso).
4. Tennis vincitore partita fermo da fine agosto.
5. Soccer: 1X2 e doppia chance non tracciati; 12 righe regolate senza esito; corner senza storico oltre 30gg; marcatori/cartellini giocatori senza quote.
6. Tennis: snapshot di pubblicazione con solo il lato scelto (niente no-vig); solo ambiente "dev".

## Come ripetere il confronto
Rieseguire le stesse query (stesse definizioni sopra) tra ~30-60 giorni, salvare come `AAAA-MM-GG_snapshot_prestazioni.md` nella stessa cartella e confrontare per mercato: n, ROI+IC, log-loss modello vs bookmaker, calibrazione.
