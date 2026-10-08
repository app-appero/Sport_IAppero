# Prodotto e risposta a Cursor

## Risposta pronta alle sei domande

1. Obiettivo: prodotto per utenti finali, app mobile iOS/Android con BFF/API proprietario. Prima validiamo il feed, poi aggiungiamo personalizzazione e monetizzazione.
2. Sport: calcio e tennis. I mercati derivano dai motori esistenti, non vengono inventati. Il tennis espone match winner, first set winner e over/under games; Soccer è multi-mercato, con availability variabile per evento.
3. Fonti: API proprietarie Soccer Oracle e Tennis Oracle su Railway, collegate ai repository indicati nel documento riferimenti. Il BFF non interroga direttamente provider dati o bookmaker.
4. Unione: aggregazione e normalizzazione delle predizioni di sport diversi. Nessuna media, weighted vote o consenso aggiuntivo tra modelli nell'MVP. Gli ensemble già presenti dentro i motori restano responsabilità dei motori.
5. Output: app solo mobile React Native/Expo/TypeScript; backend FastAPI/Python con adapter isolati. Nessuna dashboard web nell'MVP.
6. Vincoli: italiano, pre-match, timeout/caching/feed parziale, segreti solo server, nessuna modifica ai motori durante l'implementazione dell'aggregatore. Login consumer, push, abbonamenti, live e schedine sono fasi successive.

## MVP

Home multi-sport, filtri calcio/tennis, giorno, competizione e mercato, elenco eventi, dettaglio predizione. Preferiti locali opzionali. Supportare eventi senza predizione e stati dati assenti, feed vuoto, provider non disponibile.

L'app mostra probabilità stimata del singolo esito; non la presenta come accuratezza storica o garanzia. Le quote e le decisioni del motore sono dati informativi opzionali. Il primo ranking è per orario. Una vista “probabilità più alte” può essere aggiunta dichiarando il criterio; non chiamarla “più affidabili” senza validazione comparativa dei modelli.

Oracle Score è rinviato: non inventare un punteggio 8.7/10 o pesi arbitrari. Nessuna promessa di successo o rendimento. Il core è rendere accessibili i motori già esistenti con un'esperienza unica.
