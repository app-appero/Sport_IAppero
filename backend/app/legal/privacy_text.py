"""Testo dell'informativa privacy (Markdown).

Copia identica di Sport_IAppero-documentazione-v2/docs/legal/PRIVACY_POLICY.md:
un test ne verifica l'allineamento. Il Dockerfile copia solo backend/app, quindi il testo vive qui.
"""

PRIVACY_POLICY_MD = """# Informativa sulla privacy di Sport IApperò

Ultimo aggiornamento: 13 ottobre 2026

Questa informativa spiega quali dati personali tratta l'app Sport IApperò (di seguito "l'app") e come puoi controllarli, ai sensi del Regolamento (UE) 2016/679 (GDPR).

## 1. Titolare del trattamento

Il titolare del trattamento è:

- [NOME E INDIRIZZO DEL TITOLARE]
- Contatto per questioni di privacy: [EMAIL DI CONTATTO]

## 2. Quali dati trattiamo

### Se usi l'app senza account

L'accesso è facoltativo. Senza account l'app funziona e noi non raccogliamo dati personali che ti identificano. L'app mostra dati pubblici su partite e predizioni sportive, forniti dal nostro server. Per mostrarti i contenuti anche con connessione debole, l'app conserva sul tuo telefono una copia temporanea di questi dati pubblici (cache locale), che puoi eliminare cancellando i dati dell'app dalle impostazioni del telefono.

Come ogni servizio online, il fornitore di hosting del nostro server registra automaticamente dati tecnici di connessione (per esempio indirizzo IP, data e ora, percorso richiesto ed esito) per garantire sicurezza e funzionamento. Non usiamo questi dati per identificarti e non li colleghiamo ai dati del tuo account.

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

Dopo l'accesso il nostro server rilascia un token di sessione firmato, valido 30 giorni. Il token è salvato sul tuo telefono nell'archivio protetto del sistema e viene inviato al nostro server per riconoscerti. Se esci dall'account il token viene rimosso dal telefono.

### Cosa non facciamo

L'app e il server non contengono pubblicità, strumenti di analisi statistica (analytics), tracciamento a fini di marketing né pagamenti. Non usiamo i tuoi dati per profilazione o decisioni automatizzate. Se questo cambierà, aggiorneremo questa informativa prima dell'attivazione.

## 3. Finalità e base giuridica

| Finalità | Dati | Base giuridica |
| --- | --- | --- |
| Creare e gestire il tuo account facoltativo e riconoscerti negli accessi successivi | Dati del paragrafo "Se accedi con Google", token di sessione | Esecuzione del servizio che hai richiesto (art. 6.1.b GDPR) |
| Sicurezza e funzionamento del servizio (verifica del token, prevenzione degli abusi) | Dati tecnici di connessione | Legittimo interesse (art. 6.1.f GDPR) |
| Rispondere alle tue richieste in materia di privacy | Email di contatto e contenuto della richiesta | Obbligo legale (art. 6.1.c GDPR) |

## 4. Conservazione

- I dati dell'account restano conservati finché non elimini l'account. Oggi non cancelliamo automaticamente gli account inattivi; se introdurremo questa regola, la indicheremo qui.
- Quando elimini l'account, l'utente e le identità collegate vengono rimossi dal nostro database e il token di sessione smette di funzionare subito.
- Il database può essere incluso nelle copie di sicurezza del fornitore di hosting: i dati eliminati possono restare nelle copie fino alla loro scadenza naturale, e non vengono ripristinati nell'uso normale del servizio.
- I dati tecnici di connessione sono conservati dal fornitore di hosting per il tempo previsto dalle sue impostazioni di conservazione.

## 5. Destinatari dei dati

- **Google**: fornisce l'accesso con Google. Google agisce come titolare autonomo per i dati del tuo account Google, secondo la propria informativa: https://policies.google.com/privacy
- **Railway**: fornitore di hosting su cui girano il nostro server e il database che contiene i dati dell'account. Agisce per nostro conto come responsabile del trattamento.

Non vendiamo i tuoi dati e non li condividiamo con terzi per finalità di marketing.

## 6. Trasferimenti extra UE

I fornitori indicati possono trattare dati fuori dallo Spazio Economico Europeo, in particolare negli Stati Uniti. In tal caso il trasferimento avviene sulla base delle garanzie previste dal GDPR, come una decisione di adeguatezza della Commissione europea o le clausole contrattuali standard.

## 7. I tuoi diritti

Hai diritto di accedere ai tuoi dati, rettificarli, cancellarli, limitarne il trattamento, opporti al trattamento, ottenerne la portabilità e proporre reclamo all'autorità di controllo (in Italia, il Garante per la protezione dei dati personali: https://www.garanteprivacy.it).

Per esercitarli scrivi a [EMAIL DI CONTATTO]. Per verificare la tua identità potremmo chiederti di scrivere dall'indirizzo email associato all'account. Rispondiamo di norma entro un mese dalla richiesta.

## 8. Come cancellare il tuo account

Puoi eliminare l'account in qualsiasi momento dall'app: apri il profilo e premi "Elimina account", poi conferma con "Elimina definitivamente". L'operazione elimina dal nostro database il tuo utente e l'identità Google collegata. L'eliminazione non cancella il tuo account Google. Se non riesci a usare l'app, scrivi a [EMAIL DI CONTATTO].

Puoi inoltre revocare l'accesso di Sport IApperò dalle impostazioni di sicurezza del tuo account Google.

## 9. Minori

L'app è destinata a persone maggiorenni e non è pensata per i minori. Se ritieni che un minore ci abbia fornito dati personali, scrivici e provvederemo a cancellarli.

## 10. Modifiche a questa informativa

Possiamo aggiornare questa informativa, per esempio se aggiungiamo funzioni o fornitori. La data in alto indica l'ultima versione, pubblicata a questo indirizzo.

## 11. Contatti

[EMAIL DI CONTATTO] - [NOME E INDIRIZZO DEL TITOLARE]
"""
