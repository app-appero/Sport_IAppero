# Sport IApperò — Mobile

Expo (React Native) app for **Sport IApperò** (never “Oracle Sports”).

Native identity is defined in `app.config.ts`:
- Launcher name: `Sport IApperò`
- Android package: `com.appero.sportiappero`
- Version: `1.1.1` / `versionCode` 4
- Launcher icon: square mark (`logo-mark.png` → `icon.png`)
- In-app header: horizontal wordmark top-left (`logo-wordmark.png`)

Local APK (`npm run apk`) always runs `expo prebuild --clean` so icons/labels are not stuck in a stale `android/` folder. Output: `build-output/sport-iappero.apk`.

If an old APK still shows **Oracle Sports** or the default Expo icon, uninstall it and rebuild from this `main`.

## Navigazione

- Nessuna tab bar in basso (tema scuro)
- **Partite** → default Calcio, menù a tendina per Tennis; pulsante Salvati in header
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
