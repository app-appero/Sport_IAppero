# Architectural Decisions & Constraints

## ADR-001 — Existing ML APIs remain independent

Status: Accepted.

Reason:

- avoid regression;
- preserve existing products;
- independent deployment;
- independent ML lifecycle.

## ADR-002 — Introduce BFF

Status: Accepted.

Oracle Sports Backend acts as a Backend for Frontend.

## ADR-003 — Unified Prediction model

Status: Accepted.

The mobile frontend is provider-agnostic.

## ADR-004 — React Native + Expo

Status: Proposed / preferred.

Reason:

- mobile-only;
- single iOS/Android codebase;
- fast MVP.

## ADR-005 — FastAPI

Status: Proposed / preferred.

Reason:

- Python ecosystem;
- good fit with existing ML services;
- async;
- Pydantic contracts.

## Constraints

- Existing APIs live on Railway.
- Do not introduce new ML training in MVP.
- Do not duplicate provider databases.
- MVP supports Football + Tennis.
- Architecture must support more sports later.
