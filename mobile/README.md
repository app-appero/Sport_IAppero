# Oracle Sports — Mobile

Expo (React Native) app for Sport_IAppero.

## Tabs

- **Football** → `/api/v1/sports/football/predictions`
- **Tennis** → `/api/v1/sports/tennis/predictions`
- **Saved** → placeholder

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

Open `http://localhost:8081/football` (or `/debug.html` first).

## Notes

- The app never calls Soccer/Tennis Oracle directly — only the Oracle Sports BFF.
- With fixtures, Football defaults to a sample date that has matches (`2025-09-20` / chip in UI).
- Live Railway: set `USE_PROVIDER_FIXTURES=false` and Tennis credentials in `backend/.env`.
- Backend must be on port 8000; mobile `.env` defaults to `EXPO_PUBLIC_API_URL=http://localhost:8000`.
