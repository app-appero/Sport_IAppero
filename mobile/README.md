# Oracle Sports — Mobile

Expo (React Native) app for Sport_IAppero.

## Tabs

- **Football** → `/api/v1/sports/football/predictions`
- **Tennis** → `/api/v1/sports/tennis/predictions`
- **Saved** → placeholder

## Setup

1. Start the backend (from repo root):

```bash
cd backend
source .venv/bin/activate
USE_PROVIDER_FIXTURES=false uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

2. Configure API URL:

```bash
cd mobile
cp .env.example .env
# edit EXPO_PUBLIC_API_URL if needed
```

3. Run the app:

```bash
npm install
npm run web      # quick browser preview
# or
npm start       # Expo Go / simulator
```

## Notes

- The app never calls Soccer/Tennis Oracle directly — only the Oracle Sports BFF.
- Football may show an empty list on days without fixtures (expected).
- Tennis requires backend env credentials (`TENNIS_ORACLE_USERNAME` / `PASSWORD`).
