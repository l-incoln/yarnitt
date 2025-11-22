# API: Next Big Step (MVP)

## Overview
This document defines the API contract for the "Next Big Step" feature (MVP). Implementations must follow these endpoints and the error shapes below.

---

## POST /api/v1/next
Create a new next-resource (happy path).

Request
- Content-Type: application/json
- Body:
  {
    "cartId": "string",           // optional: existing cart identifier
    "paymentMethod": "string",    // e.g., "card", "stripe"
    "shippingAddress": {
      "line1": "string",
      "line2": "string?",
      "city": "string",
      "postalCode": "string",
      "country": "string"
    },
    "items": [
      { "sku": "string", "quantity": 1, "price": 1000 }
    ],
    "metadata": { "...": "..." }  // optional
  }

Success (200)
{
  "orderId": "string",
  "status": "confirmed",
  "total": 12345,
  "createdAt": "2025-11-20T00:00:00Z"
}

Errors
- 400 Bad Request — validation issues
  {
    "error": "validation_error",
    "details": [{ "field": "shippingAddress.city", "message": "required" }]
  }
- 402 Payment Required — payment declined
  {
    "error": "payment_failed",
    "provider": "stripe",
    "message": "card_declined"
  }
- 500 Internal Server Error — unexpected failure

---

## GET /api/v1/next/:id
Retrieve resource by id.

Success (200)
{
  "orderId": "string",
  "status": "confirmed",
  "items": [...],
  "total": 12345
}

Errors
- 404 Not Found

---

## Webhook callbacks (for external payment providers)
- POST /api/v1/webhooks/payment-provider
  - Validate provider signature header.
  - Accept events: payment_intent.succeeded, payment_intent.failed.
  - Immediately respond 200 to acknowledge, then process asynchronously.

---

## Error shape (consistent across endpoints)
{
  "error": "string",
  "message": "human-friendly message",
  "details": optional_object_or_array
}

---

## Example request / response flow (happy path)
1. Client POST /api/v1/next with cart, items, shipping and paymentMethod.
2. Server validates payload; creates internal order record with status "pending".
3. Server charges via payment provider (or enqueues a charge job).
4. On successful charge, server updates order status to "confirmed" and returns 200 with orderId.
5. On payment failure, server returns 402 and order stays or is set to "payment_failed".

---

## Acceptance criteria (MVP)
- POST /api/v1/next accepts payloads as described and returns 200 with orderId for the happy path.
- On payment failure, POST returns 402 with provider error code and message.
- All validation errors return 400 with field-level messages.
- Unit tests cover the service that creates the order and mock the payment provider.
- Integration test covers the main happy path end-to-end (using test keys or mocked provider).
