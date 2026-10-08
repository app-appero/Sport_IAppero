# Sport_IAppero

Oracle Sports — aggregazione di predizioni sportive (Football + Tennis).

```text
Sport_IAppero/
├── backend/                         # FastAPI BFF
├── mobile/                          # Expo app (Football / Tennis / Saved)
├── Sport_IAppero-documentazione-v2/ # Docs + roadmap
└── sport_IAppero-docs/              # Provider OpenAPI notes
```

- Docs: [`Sport_IAppero-documentazione-v2/`](./Sport_IAppero-documentazione-v2/README.md)
- Backend: [`backend/`](./backend/README.md)
- Mobile: [`mobile/`](./mobile/README.md)

## Quick start (local)

Two terminals. Backend first (fixtures on by default):

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then the app (**from `mobile/`**, not repo root):

```bash
cd mobile
cp .env.example .env
npm install
npm run web
```

Open http://localhost:8081/football — API at http://localhost:8000/docs.

