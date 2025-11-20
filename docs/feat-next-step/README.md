# WIP: Next big step

Goal
- Implement the Next Big Step feature: short description of feature goal and expected user flow.

Scope (MVP)
- Backend endpoints:
  - POST /api/v1/next — create order
  - GET /api/v1/next/:id — fetch order
  - POST /api/v1/webhooks/payment-provider — webhook handler for payment events
- DB: orders table (basic fields: id, status, total, items JSON, payment_provider_id, created_at)
- Payment: integrate with provider adapter; for CI/tests use mocked provider or test keys
- Tests: unit + one integration test covering the happy path

Acceptance criteria (MVP)
- API: POST /api/v1/next creates an order and returns orderId + status.
- Payment: integration with payment provider simulated in CI; failures return 402.
- DB: migrations for orders table added and run locally.
- Tests: unit + one integration test for the main happy path.

How to review this spec
- Check endpoints, request/response shapes, and error codes.
- Confirm acceptance criteria cover the minimal user journey.
- Suggest additions to error cases or fields needed for UI.

Next steps
- Create `feat/next-big-step/db-migrations` to add orders table.
- Create `feat/next-big-step/backend-api` to implement route handlers and services.
- Add unit tests and one integration test that runs against docker-compose test environment.
