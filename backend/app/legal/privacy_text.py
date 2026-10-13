"""Testo della bozza di informativa privacy (Markdown).

Copia identica di Sport_IAppero-documentazione-v2/docs/legal/PRIVACY_POLICY_BOZZA.md:
un test ne verifica l'allineamento. Il Dockerfile copia solo backend/app, quindi il testo vive qui.
"""

PRIVACY_POLICY_MD = """# Informativa sulla privacy di Sport IApperò

> **ATTENZIONE: BOZZA NON REVISIONATA DA UN LEGALE.** Questo testo è una bozza tecnica, da completare e far verificare da un professionista prima della pubblicazione. Non va considerato legalmente valido. Le parti tra parentesi quadre `[...]` sono segnaposto o punti `[DA CONFERMARE]`.

Ultimo aggiornamento: [DATA DI AGGIORNAMENTO]

## 1. Titolare del trattamento

Il titolare del trattamento dei dati personali raccolti tramite l'app Sport IApperò (di seguito "l'app") è:

- [NOME E INDIRIZZO DEL TITOLARE]
- Contatto per questioni di privacy: [EMAIL DI CONTATTO]

## 2. Quali dati trattiamo

### Se usi l'app senza account

L'accesso è facoltativo. Senza account l'app funziona e noi non raccogliamo dati personali che ti identificano. L'app mostra dati pubblici su partite e predizioni sportive, forniti dal nostro server (BFF). Per mostrarti i contenuti anche con connessione debole, l'app conserva sul tuo telefono una copia temporanea di questi dati pubblici (cache locale). [DA CONFERMARE: eventuali log tecnici del server, per esempio indirizzo IP e richieste, tenuti dall'infrastruttura di hosting e relativi tempi di conservazione.]

### Se accedi con Google

Quando scegli "Accedi con Google", il nostro server verifica il token di identità rilasciato da Google e salva:

- l'identificativo Google dell'account (`sub`), un codice stabile assegnato da Google;
- il nome visualizzato, se fornito da Google;
- l'indirizzo email, solo se Google lo indica come verificato;
- l'indirizzo (URL) della tua foto profilo, se fornito da Google; non salviamo l'immagine, solo il collegamento;
- un identificativo interno casuale dell'account;
- la data di creazione dell'account e la data dell'ultimo accesso.

Non riceviamo né salviamo la tua password Google.

### Sessione sul dispositivo

Dopo l'accesso il nostro server rilascia un token di sessione firmato, valido 30 giorni. Il token è salvato sul tuo telefono nell'archivio protetto del sistema (expo-secure-store) e viene inviato al nostro server per riconoscerti. Se esci dall'account il token viene rimosso dal telefono.

### Cosa non facciamo

Alla data di questa bozza, l'app e il server non contengono pubblicità, strumenti di analisi statistica (analytics), tracciamento a fini di marketing né pagamenti. Se questo cambierà, aggiorneremo questa informativa prima dell'attivazione.

## 3. Finalità e base giuridica

| Finalità | Dati | Base giuridica |
| --- | --- | --- |
| Creare e gestire il tuo account facoltativo, riconoscerti negli accessi successivi | Dati del paragrafo "Se accedi con Google", token di sessione | Esecuzione del servizio richiesto (art. 6.1.b GDPR) [DA CONFERMARE] |
| Sicurezza e funzionamento del servizio (verifica del token, prevenzione abusi) | Dati tecnici di connessione [DA CONFERMARE] | Legittimo interesse (art. 6.1.f GDPR) [DA CONFERMARE] |
| Rispondere alle tue richieste di privacy | Email di contatto e contenuto della richiesta | Obbligo legale (art. 6.1.c GDPR) [DA CONFERMARE] |

Non usiamo i tuoi dati per profilazione, pubblicità o decisioni automatizzate.

## 4. Conservazione

- I dati dell'account restano conservati finché non elimini l'account. [DA CONFERMARE: eventuale cancellazione per inattività.]
- Quando elimini l'account, l'utente e le identità collegate vengono rimossi dal database e il token di sessione smette di funzionare subito.
- Copie di sicurezza (backup) del database: [DA CONFERMARE: se e per quanto tempo il fornitore di hosting le conserva].
- Log tecnici del server: [DA CONFERMARE].

## 5. Destinatari dei dati

- **Google**: fornisce l'accesso con Google. Google agisce come titolare autonomo per i dati del tuo account Google, secondo la propria informativa: https://policies.google.com/privacy
- **Railway**: fornitore di hosting su cui girano il nostro server e il database PostgreSQL che contiene i dati dell'account. Agisce come nostro responsabile del trattamento. [DA CONFERMARE: accordo di trattamento dati (DPA) e regione di hosting.]

Non vendiamo i tuoi dati e non li condividiamo con terzi per finalità di marketing.

## 6. Trasferimenti extra UE

I fornitori indicati possono trattare dati fuori dallo Spazio Economico Europeo, in particolare negli Stati Uniti. [DA CONFERMARE: regione effettiva del database e del server su Railway, garanzie adottate (per esempio clausole contrattuali standard o decisione di adeguatezza) per Railway e Google.]

## 7. I tuoi diritti

Ai sensi del GDPR hai diritto di accedere ai tuoi dati, rettificarli, cancellarli, limitarne il trattamento, opporti al trattamento, ottenerne la portabilità e proporre reclamo all'autorità di controllo (in Italia, il Garante per la protezione dei dati personali: https://www.garanteprivacy.it).

Per esercitarli scrivi a [EMAIL DI CONTATTO]. Per verificare la tua identità potremmo chiederti di scrivere dall'indirizzo email associato all'account. [DA CONFERMARE: tempi di risposta, di norma entro un mese.]

## 8. Come cancellare il tuo account

Puoi eliminare l'account in qualsiasi momento dall'app: apri il profilo e premi "Elimina account", poi conferma con "Elimina definitivamente". L'operazione elimina dal nostro database il tuo utente e l'identità Google collegata. L'eliminazione non cancella il tuo account Google. Se non riesci a usare l'app, scrivi a [EMAIL DI CONTATTO].

Puoi inoltre revocare l'accesso di Sport IApperò dalle impostazioni di sicurezza del tuo account Google.

## 9. Minori

L'app non è pensata per bambini. [DA CONFERMARE: età minima per l'accesso con account (in Italia il consenso digitale è valido dai 14 anni) e indicazioni per le schede degli store.]

## 10. Modifiche a questa informativa

Possiamo aggiornare questa informativa, per esempio se aggiungiamo funzioni o fornitori. La data di aggiornamento in alto indica l'ultima versione. [DA CONFERMARE: modalità con cui avvisiamo gli utenti di modifiche rilevanti.]

## 11. Contatti

[EMAIL DI CONTATTO] - [NOME E INDIRIZZO DEL TITOLARE]
"""
