# Sport_IAppero — AI project pack V2

Documentazione preparata il 7 ottobre 2026 per Cursor e Claude Code. Sostituisce il precedente pack generico Oracle Sports. Nome progetto: Sport_IAppero; nome commerciale ancora da decidere.

Obiettivo: app mobile iOS/Android, inizialmente in italiano, che aggrega le predizioni calcio e tennis dei due motori esistenti tramite un BFF proprietario. I motori restano indipendenti. Nessun ensemble aggiuntivo, training o scraping nel nuovo progetto.

## Come utilizzarla

1. Estrarre il pacchetto nel nuovo repository. Se esistono già documenti V1, archiviarli e indicare questa V2 come riferimento corrente, evitando contratti discordanti.
2. Leggere `docs/00_RIFERIMENTI_E_VERIFICHE.md`, poi architettura, integrazioni e contratto comune.
3. Dare a Cursor/Claude `docs/10_PROMPT_MASTER.md`.
4. Iniziare dai task discovery/fixture e BFF, poi realizzare l'app Expo.

Non è stato creato o modificato alcun repository remoto. Il link del repository nuovo non è stato fornito: non assumere che appartenga a romy1992 o app-appero.

## Contenuto

- `docs/00_RIFERIMENTI_E_VERIFICHE.md`: GitHub, Railway, commit esaminati, verifiche e limiti.
- `docs/01_PRODOTTO_E_RISPOSTA_CURSOR.md`: perimetro e risposta alle sei domande.
- `docs/02_ARCHITETTURA.md`: componenti e struttura repository.
- `docs/03_INTEGRAZIONE_SOCCER.md`: endpoint e mapping calcio.
- `docs/04_INTEGRAZIONE_TENNIS.md`: endpoint, autenticazione e mapping tennis.
- `docs/05_CONTRATTO_UNIFICATO.md`: modello proposto e regole semantiche.
- `docs/06_API_BFF.md`: contratto API nuovo, errori e paginazione.
- `docs/07_MOBILE.md`: schermate e comportamento mobile.
- `docs/08_DATI_E_STORICO.md`: persistenza e performance.
- `docs/09_ROADMAP_E_TASK.md`: backlog con criteri di accettazione.
- `docs/10_PROMPT_MASTER.md`: istruzioni da assegnare all'agente.
- `docs/11_CONFIGURAZIONE_RAILWAY.md`: variabili e deployment proposto.
- `docs/12_INVENTARIO_OPENAPI.md`: inventario automatico delle route pubblicate, non una allowlist.
- `evidence/`: OpenAPI reali, risposta calcio reale e manifest delle fonti.
- `contracts/`: esempio normalizzato illustrativo, non response del BFF esistente.

Le route dei provider sono verificate nel codice e/o nelle specifiche distribuite. Le API BFF e il modello unificato sono una proposta da implementare. Nessuna credenziale è inclusa. Il pacchetto non contiene i file `.env` dei progetti sorgente.
