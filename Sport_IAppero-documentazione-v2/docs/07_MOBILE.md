# App mobile proposta

React Native, Expo, TypeScript, Expo Router. Verificare SDK e dipendenze correnti nella fase scaffold; questa documentazione non prescrive versioni non controllate. Nessuna app web o pannello admin da costruire nel primo sprint.

## Schermate

1. Home: giorno selezionato, chip Tutti/Calcio/Tennis + mercato + competizione, eventi ordinati per orario, card con predizioni disponibili. Banner discreto per feed parziale/degraded/empty e CTA azzera filtri.
2. Calcio: stesso feed filtrato, campionato e mercato, stato pre-match, scelta esito e probabilità. Evitare card duplicate per ogni outcome.
3. Tennis: filtri torneo e mercato quando disponibili; nomi giocatori, superficie, match winner e extra markets separati.
4. Dettaglio: evento, esiti, probability, modello, decisione e quote se disponibili, timestamp e warning. Distinguere dati tecnici da pubblicazioni ufficiali.

Bottom tabs Home/Sport/Salvati opzionale. Preferiti locali in AsyncStorage o equivalente; nessun account necessario nell'MVP. ID namespace impediscono collisioni tra sport. Non includere schermi pagamento o login finti.

## Comportamento

API client conosce solo EXPO_PUBLIC_API_BASE_URL del BFF. Tipi TypeScript generati dal contratto BFF. Query cache e pull-to-refresh; polling solo quando app in foreground, niente loop sulle API dei motori. Preservare dati precedenti durante refresh. Skeleton iniziale, empty state per nessun evento, errore per indisponibilità completa, banner per provider singolo guasto. Non mostrare spinner infinito su 401 provider.

Percentuali formattate da float unitario, senza moltiplicazioni ripetute. Per dati null mostrare “Non disponibile”. Etichetta “Probabilità stimata”, non “Precisione”. Quote decimali leggibili, timestamp locale Europe/Rome per utente italiano; orario ignoto dichiarato.

Mobile da verificare a 360/390/430 px e con font di sistema ingranditi; target tattili almeno 44 px, contrasto e screen reader. Nessun asset logo squadre/giocatori inventato o preso senza fonte; iniziare con nomi e icone sport. Offline: ultima snapshot marcata obsoleta, senza fingere aggiornamento live.

Accettazione: navigazione senza dead end, stesso contratto per entrambi gli sport, nessun segreto nel bundle, nessuna chiamata diretta a domini Railway dei motori. Test su dispositivo/simulatore iOS e Android quando disponibile, almeno verifica compilazione TypeScript e flussi cache/errori nella fase MVP.
