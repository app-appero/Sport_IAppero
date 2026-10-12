# Sport IApperò — Mobile

Expo (React Native) app for **Sport IApperò** (never “Oracle Sports”).

Native identity is defined in `app.config.ts`:
- Launcher name: `Sport IApperò`
- Android package: `com.appero.sportiappero`
- Version: `1.1.1` / `versionCode` 4
- Launcher icon: light tile with football + tennis ball + AI orbit (`icon.png`, adaptive icon in `android-icon-*.png`)
- In-app header: text wordmark top-left (`BrandHeader`); `logo-wordmark.png` is the same wordmark for stores/share cards
- Splash: light background + `splash-icon.png`; `BootSplash` repeats it so the hand-off is seamless

Local APK (`npm run apk`) always runs `expo prebuild --clean` so icons/labels are not stuck in a stale `android/` folder. Output: `build-output/sport-iappero.apk`.

If an old APK still shows **Oracle Sports** or the default Expo icon, uninstall it and rebuild from this `main`.

## Tema

Tema chiaro con una palette per sport: la schermata prende il colore dello sport
in cui ti trovi (Calcio verde, Tennis giallo, Basket arancio pronto). Le palette
stanno in `constants/theme.ts` (`sportPalettes`); i componenti le leggono da
`components/SportTheme.tsx` (`useThemedStyles`). Per aggiungere uno sport: una
palette in `sportPalettes` e una voce in `SPORTS` (`components/SportRail.tsx`).

Dimensioni: tutto il testo passa da `fs()` in `constants/theme.ts`; cambia
`TEXT_SCALE` (ora 0.88) per rimpicciolire o ingrandire i testi di tutta l'app.
Spaziature e raggi sono in `spacing` / `radii`.

## Navigazione

- Nessuna tab bar in basso (tema scuro)
- **Partite** → default Calcio, barra sport scorrevole in alto (Calcio, Tennis, ...)
- **Salvati** → preferiti locali (AsyncStorage)

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
