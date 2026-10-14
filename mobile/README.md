# Sport IApperò — Mobile

Expo (React Native) app for **Sport IApperò** (never “Oracle Sports”).

Native identity is defined in `app.config.ts`:
- Launcher name: `Sport IApperò`
- Android package: `com.appero.sportiappero`
- Version: `1.1.1` / `versionCode` 4
- Launcher icon: light tile with football + tennis ball + AI orbit (`icon.png`, adaptive icon in `android-icon-*.png`)
- In-app header: text wordmark top-left (`BrandHeader`); `logo-wordmark.png` is the same wordmark for stores/share cards
- Splash: black background + `splash-icon.png`; `BootSplash` repeats it so the hand-off is seamless

Local APK (`npm run apk`) always runs `expo prebuild --clean` so icons/labels are not stuck in a stale `android/` folder. Output: `build-output/sport-iappero.apk`.

If an old APK still shows **Oracle Sports** or the default Expo icon, uninstall it and rebuild from this `main`.

## Tema

Tema scuro (sfondo nero) con una palette per sport: la schermata prende il colore
dello sport in cui ti trovi (Calcio verde, Tennis giallo, Basket arancio pronto).
Il tema chiaro precedente è nella cronologia git (commit `47dac3d`). Le palette
stanno in `constants/theme.ts` (`sportPalettes`); i componenti le leggono da
`components/SportTheme.tsx` (`useThemedStyles`). Per aggiungere uno sport: una
palette in `sportPalettes` e una voce in `SPORTS` (`components/SportRail.tsx`).

Dimensioni: tutto il testo passa da `fs()` in `constants/theme.ts`; cambia
`TEXT_SCALE` (ora 0.88) per rimpicciolire o ingrandire i testi di tutta l'app.
Spaziature e raggi sono in `spacing` / `radii`.

## Gialli (beta)

Marcatori e gialli probabili stanno affiancati nella card (due colonne) e uno sotto l'altro nel
dettaglio evento. Il modello dei gialli è in addestramento e il BFF non ha ancora la route
`GET /api/v1/events/{id}/bookings` (stessa forma dei marcatori, con `booked` al posto di
`scored`): finché `BOOKINGS_API_READY` (`constants/features.ts`) è falso la colonna mostra
"Modello in addestramento" e l'app non fa richieste. Quando la route è attiva si accende con
`EXPO_PUBLIC_BOOKINGS_API=1` o cambiando il default.

## Navigazione

- Nessuna tab bar in basso (tema scuro)
- **Partite** → default Calcio, barra sport scorrevole in alto (Calcio, Tennis, ...)

## Caricamento, cache e offline

- Caricamento: `EventCardSkeleton` (card segnaposto, ferme con "riduci animazioni").
- Cambio giorno: la lista precedente resta visibile attenuata con una barra di avanzamento (`placeholderData`, solo dello stesso sport).
- Cache React Query persistita su AsyncStorage (24 h, `services/queryClient.ts`). Senza rete si vede l'ultima snapshot con l'avviso "Offline · dati delle HH:MM".
- Il giorno corrente si aggiorna ogni 60 s solo con l'app in primo piano (`AppState` → `focusManager`); gli altri giorni non fanno polling.
- Test delle regole pure: `npm test`; typecheck: `npm run typecheck`.

## Storico

`/storico` si apre sullo sport che stai guardando (Calcio o Tennis) e ha la barra sport per cambiarlo (pulsante "Storico" nell'header e link nel pannello "Statistica giornata"): percentuale = prese / (prese + perse), con il denominatore sempre scritto; annullate, in attesa e non piazzate sono a parte. Legge `GET /api/v1/history/stats` e `/history/predictions` del BFF (solo giocate consigliate, cioè decisione PLAY, ufficiali e registrate prima del calcio d'inizio; il BFF accetta `decision=all` ma l'app non lo usa). L'elenco carica 50 righe per volta mentre scorri; il filtro periodo (sempre, 30 giorni, 7 giorni) vale sul giorno d'inizio partita. Senza database sul BFF mostra "Storico non disponibile". Non è la stessa cosa della "Statistica giornata", che conta tutte le predizioni del giorno.

## Account (facoltativo)

Accesso con Google, solo app nativa (Android per ora). Senza account l'app funziona come prima. Il pulsante tondo del profilo (icona persona, oppure le iniziali dopo l'accesso) usa l'ID client Web di Google Cloud già impostato come predefinito in `services/auth.ts` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `mobile/.env` lo sostituisce; deve coincidere con `GOOGLE_CLIENT_IDS` sul BFF); la sessione è salvata con `expo-secure-store`. Il modulo Google non gira in Expo Go: serve il development build / APK (`npm run apk`). Per iPhone mancano Apple Sign-In e l'`iosUrlScheme` del plugin Google.

## Setup

Run commands **from `mobile/`** (not the repo root). Root has no `package.json`.

1. Start the backend (from repo root):

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # Windows: copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Default `.env` uses `USE_PROVIDER_FIXTURES=true` so the API returns sample
Football/Tennis data even when Railway Soccer/Tennis apps are offline.

2. Configure API URL and start the app:

```bash
cd mobile
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm run web            # static preview on http://localhost:8081
# or: npm start        # Expo Go / simulator (press w for web)
```

Open in this order (same port `8081`):

1. http://localhost:8081/hello.html — must show bright green “VEDI QUESTO?”
2. http://localhost:8081/debug.html — API via proxy
3. http://localhost:8081/football — app

In Cursor Cloud: use the **Ports** panel → forward `8081` → Open in Browser.
If `hello.html` is blank, the port forward is not reaching this VM (not an app bug).

## Notes

- `npm run web` serves `dist/` and **proxies** `/api/*` → `localhost:8000`, so the browser only needs port **8081**.
- The app never calls Soccer/Tennis Oracle directly — only the Sport IApperò BFF.
- With fixtures, Football defaults to a sample date with matches (`2026-09-20`).
- Live Railway: set `USE_PROVIDER_FIXTURES=false` and Tennis credentials in `backend/.env`.
