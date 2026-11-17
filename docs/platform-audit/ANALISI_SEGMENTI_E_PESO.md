# Analisi segmenti e peso modello/mercato (proposte 5.3 e 5.4)

Data: 17/11/2026. Analisi offline, sola lettura: nessuna chiamata ai provider, nessun file dei motori modificato.
Sorgenti: `git archive origin/main` di tennis_oracle (`f446092`) e ia_predict_soccer (`b01ac26`). Le predizioni out-of-fold rigenerate riproducono il log loss dei report di benchmark committati a 5 decimali (19 modelli Tennis, 12 modelli Calcio 1X2).

## In breve (per il titolare)
- **Tennis:** il modello (con le feature ATP dichiarate mancanti, la configurazione attiva in produzione dal 17/11) prevede meglio del mercato, ma **solo sui favoriti forti** (probabilità del favorito ≥ 0,70). Nelle partite equilibrate il vantaggio è zero. **Nessun segmento dà un ROI positivo affidabile:** il margine medio dei bookmaker (7,5%) è più grande dell'errore del mercato che il modello corregge. VERIFICATO.
- **Calcio 1X2:** nessun segmento in cui un modello batte il mercato (0 test significativi su 264); il miglior modello è peggiore del mercato. Nessun ROI positivo affidabile. VERIFICATO.
- **Peso modello/mercato nel Tennis vincente:** con la configurazione attuale (`impute`) il peso ottimo è **w = 1,0** (IC95 [0,90; 1,00]); w = 0,5 è sbagliato in entrambe le configurazioni. In pratica però cambia pochissimo: nel 2026Q2 i PLAY passerebbero da 5 a 7 (w = 0,9) su 8.014 partite, tutti con ROI stimato negativo. VERIFICATO (offline); applicarlo è una PROPOSTA.
- **Effetto della correzione del 17/11 (`impute`):** con la vecchia configurazione (`zero`) e w = 0,5 il benchmark produce 478 PLAY nel 2026Q2 (6,0% delle partite) con ROI −7,7% [−12,2%; −3,1%] sugli 8 trimestri. Con `impute` i PLAY del vincente scendono a pochi per trimestre. VERIFICATO (offline).

## Metodo
- Delta = log loss(modello) − log loss(mercato senza margine) sulle stesse partite; negativo = modello migliore. IC95 bootstrap appaiato (2000 ricampionamenti); p-value con approssimazione normale.
- Confronti multipli: Holm al 5% dentro ogni famiglia di test dichiarata prima di guardare i segmenti. Segmenti guardati in totale: Tennis 50 livelli × 18 modelli + ROI su 3 soglie; Calcio 24 livelli × 11 modelli + ROI su 3 soglie.
- ROI: stake 1 sul lato con p_modello − p_mercato ≥ X (X = 0,02 / 0,05 / 0,10) alla quota media dei bookmaker; un livello entra nel test solo con almeno 30 scommesse.
- **Limite principale:** le quote storiche sono medie e probabilmente di chiusura, quindi i ROI sono ottimistici. Il modello è riaddestrato in ogni fold e non è l'artefatto di produzione: i risultati sono un limite superiore e vanno confermati sul ledger di produzione.

## Tennis (8 fold trimestrali, 2023-07-01..2026-06-21, n = 87.504)
Modello: `v4_like__enrichment_as_missing` contro mercato senza margine.

| segmento | n | delta log loss [IC95] | p Holm |
|---|---|---|---|
| Totale | 87.504 | −0,00241 [−0,00282; −0,00197] | — |
| favorito 0,50–0,60 | 24.851 | +0,00021 [−0,00020; +0,00063] | 1 |
| favorito 0,60–0,70 | 23.690 | −0,00009 [−0,00065; +0,00045] | 1 |
| favorito 0,70–0,80 | 20.433 | −0,00180 [−0,00254; −0,00103] | 0,00015 |
| favorito 0,80–0,90 | 14.961 | −0,00717 [−0,00879; −0,00552] | < 1e-15 |
| favorito 0,90+ | 3.569 | −0,01952 [−0,02433; −0,01424] | < 1e-12 |
| ATP tour principale | 1.038 | −0,00040 [−0,00406; +0,00325] | 1 |
| ATP Challenger e qualificazioni | 3.044 | −0,00112 [−0,00262; +0,00036] | 1 |
| ITF 15/25 | 6.035 | −0,00492 [−0,00650; −0,00334] | < 1e-7 |

- 32 livelli su 50 migliori del mercato dopo Holm (27 con errore standard per settimana), nessuno peggiore.
- Contro il mercato ricalibrato il vantaggio totale scende a −0,00054: il modello corregge soprattutto la sottostima dei favoriti da parte del mercato (es. 0,850 previsto, 0,887 osservato).
- Il livello torneo è noto solo per 10.117 righe (2023Q3, 2024Q4); non esiste una colonna sesso/WTA.

ROI della regola "gioca se il modello stima almeno X punti più del mercato":

| X | scommesse | quota media | ROI [IC95] |
|---|---|---|---|
| 0,02 | 36.740 | 1,41 | −3,11% [−3,82%; −2,44%] |
| 0,05 | 3.585 | 1,40 | −2,37% [−4,34%; −0,24%] |
| 0,10 | 66 | 5,15 | +2,95% [−39,70%; +48,14%] |

0 ROI positivi significativi su 101 test, 29 negativi.

## Calcio 1X2 (20 fold trimestrali, 2021-08-08..2026-05-26, n = 8.118)
Modello migliore `rf_with_odds` contro mercato senza margine.

| segmento | n | delta log loss [IC95] | p Holm |
|---|---|---|---|
| Totale | 8.118 | +0,00525 [+0,00258; +0,00789] | — |
| Premier League | 1.823 | +0,01106 [+0,00550; +0,01669] | 0,0018 (peggio) |
| Serie A | 1.798 | +0,00344 [−0,00208; +0,00929] | 1 |
| La Liga | 1.786 | +0,00137 [−0,00393; +0,00706] | 1 |
| Bundesliga | 1.486 | +0,00295 [−0,00389; +0,00972] | 1 |
| Ligue 1 | 1.225 | +0,00773 [+0,00016; +0,01480] | 0,59 |
| favorito ≥ 0,75 | 438 | +0,02372 [+0,01104; +0,03682] | 0,005 (peggio) |
| ultime 10 giornate | 1.998 | +0,00950 [+0,00408; +0,01510] | 0,015 (peggio) |

- 0 livelli migliori del mercato, 6 peggiori; 0 test significativi su 264 nella famiglia di tutti i modelli.
- ROI `rf_with_odds` con X = 0,02: 6.446 scommesse, −3,97% [−7,40%; −0,54%]. Le quote sono ricostruite dalle probabilità con un overround medio del 4,32% (approssimazione). Ligue 1 2022 assente nel dump.

## Peso w nel Tennis vincente (p_adj = w·p_modello + (1−w)·p_mercato)
Griglia w = 0..1 a passo 0,05; validazione annidata (w scelto solo sui fold precedenti, valutato sul fold corrente; n = 75.127 senza il primo fold).

| configurazione | w ottimo (8 fold) | IC95 sulle partite | log loss w = 0 / 0,5 / ottimo |
|---|---|---|---|
| `impute`, feature ATP dichiarate mancanti (attiva dal 17/11) | **1,00** | [0,90; 1,00] | 0,55906 / 0,55733 / 0,55666 |
| `zero`, feature ATP a 0 (prima del 17/11) | **0,15** | [0,10; 0,20] | 0,55906 / 0,55965 / 0,55894 |

- Con `impute` il w scelto sui fold precedenti va da 0,65 a 1,0 e si stabilizza a 1,0 dal 2025Q4. Rispetto a w = 0,5 il log loss migliora di 0,00052 [0,00031; 0,00074].
- PLAY nel 2026Q2 (8.014 partite, soglia 2%): con `impute` 5 (w = 0,5), 7 (w = 0,9), 15 (w = 1,0); con `zero` 478 (w = 0,5) e 2 (w = 0,15).
- ROI dei PLAY sugli 8 fold (ottimistico): `impute` w = 1,0: 322 PLAY, −8,81% [−17,33%; +0,40%]; `zero` w = 0,5: 2.050 PLAY, −7,71% [−12,20%; −3,10%].

## Proposte (non applicate)
1. PROPOSTA — Tennis vincente: portare w da 0,5 a 0,9 solo dopo aver verificato sul ledger di produzione (con `impute` attivo da qualche settimana) che la calibrazione regge. L'effetto pratico sui PLAY è piccolo.
2. PROPOSTA — Usare il CLV (ora misurato nei due motori) come criterio principale per decidere se mostrare i PLAY: con questi risultati il ROI atteso dei PLAY è negativo in tutti i segmenti.
3. PROPOSTA — Valorizzare nell'app l'accuratezza delle probabilità (soprattutto sui favoriti nel Tennis) più che il "valore" della giocata.

Script, predizioni out-of-fold e risultati completi sono stati prodotti nello scratchpad della sessione (non versionati).
