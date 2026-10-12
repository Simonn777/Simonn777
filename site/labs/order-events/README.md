# Order event replay

A standalone browser teaching lab created in October 2026 with substantial
AI-assisted implementation and review. This is **not Blue Orchard's production
payment system**, a Stripe integration, or a record of prior production work.
All orders, events and shipments are synthetic. No payment API is called.

## Run

Serve the profile repository's `site/` directory and open
`/labs/order-events/`. The lab uses ES modules and the portfolio's existing
self-hosted fonts; no package install is needed.

```sh
python3 -m http.server 8765 --directory site
node --test tests/order-events.test.mjs
```

`engine.mjs` contains deterministic pure reducers; `app.mjs` handles DOM state.
Tests sit outside the Pages artifact and use Node's built-in test runner.

## Model

The normal order path is `created → awaiting_payment → paid → fulfilled`.
Unpaid orders may become `cancelled`. Payment received before checkout waits
in a deferred inbox. Checkout completion alone never authorizes fulfillment.
Every supported event has an ID and one order ID; payment events also have
an integer amount and currency that must match the order.

The first receipt records a normalized supported payload. Another delivery
with the same ID and payload is skipped; conflicting content under that ID is
rejected. State guards also make repeated business events with different IDs
no-ops. Payment queues one deterministic `fulfill:<order-id>` outbox message.

The worker can simulate losing acknowledgement after its side effect. The
synthetic receiver remembers the same fulfillment key and returns its existing
shipment on retry. Only acknowledgement marks the order fulfilled. This shows
why event deduplication, guarded transitions, an outbox, and receiver-side
idempotency address different failure cases.

## Limits

Everything is in memory, in one process. Resetting or refreshing loses all
records, including deduplication and receiver keys. The “lost ACK” is a model
transition, not a real process crash. Production implementations require
durable transactions, unique constraints, concurrency control, webhook
authenticity checks, receiver idempotency and reconciliation.

The event names and schema are simplified and do not match Stripe payloads.
No secrets, signatures, database, network worker, refund handling, stock
management, partial payments, timeouts or dispute lifecycle are included.
An outbox alone does not guarantee exactly-once external side effects.
