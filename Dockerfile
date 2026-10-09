# Monorepo-friendly Dockerfile (build context = repository root).
# Use when Railway Root Directory is "/" / unset.
# If Root Directory is "backend", Railway uses backend/Dockerfile instead.

FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY backend/pyproject.toml backend/README.md ./
COPY backend/app ./app

RUN pip install --no-cache-dir .

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
