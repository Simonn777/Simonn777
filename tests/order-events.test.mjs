import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  receiveEvent,
  dispatchOutbox,
  inspectInvariants,
  SCENARIOS,
  ORDER,
} from "../site/labs/order-events/engine.mjs";

const checkout = (id = "evt_c") => ({
  id,
  type: "checkout.completed",
  orderId: ORDER.id,
});
const payment = (id = "evt_p") => ({
  id,
  type: "payment.succeeded",
  orderId: ORDER.id,
  amountCents: 4800,
  currency: "USD",
});
const cancel = (id = "evt_x") => ({
  id,
  type: "order.cancelled",
  orderId: ORDER.id,
});
const replay = (events) => events.reduce(receiveEvent, initialState());
const deepFreeze = (object) => {
  Object.freeze(object);
  for (const value of Object.values(object))
    if (value && typeof value === "object" && !Object.isFrozen(value))
      deepFreeze(value);
  return object;
};

test("checkout alone never queues fulfillment", () => {
  const state = receiveEvent(initialState(), checkout());
  assert.equal(state.order.status, "awaiting_payment");
  assert.equal(state.order.paymentConfirmed, false);
  assert.equal(state.outbox.length, 0);
  assert.equal(dispatchOutbox(state).shipments.length, 0);
});

test("duplicate event IDs skip both state changes and new outbox entries", () => {
  const state = replay([checkout(), payment(), payment()]);
  assert.equal(state.duplicates, 1);
  assert.equal(state.deliveries, 3);
  assert.equal(state.order.status, "paid");
  assert.equal(state.outbox.length, 1);
  assert.equal(state.history.at(-1).kind, "duplicate");
});

test("out-of-order payment is deferred once and resumed after checkout", () => {
  let state = replay([payment(), payment()]);
  assert.equal(state.order.status, "created");
  assert.equal(state.deferred.length, 1);
  assert.equal(state.outbox.length, 0);
  state = receiveEvent(state, checkout());
  assert.equal(state.order.status, "paid");
  assert.equal(state.deferred.length, 0);
  assert.equal(state.outbox.length, 1);
  assert.ok(
    state.history.some((item) =>
      item.detail.startsWith("Deferred event resumed."),
    ),
  );
});

test("semantic idempotency survives fresh event IDs", () => {
  const state = replay([
    checkout(),
    payment(),
    payment("evt_p2"),
    checkout("evt_c2"),
  ]);
  assert.equal(state.duplicates, 0);
  assert.equal(state.order.status, "paid");
  assert.equal(state.outbox.length, 1);
  assert.equal(state.history.at(-1).kind, "noop");
});

test("lost acknowledgement followed by retry makes one shipment", () => {
  let state = replay([checkout(), payment()]);
  state = dispatchOutbox(state, { loseAcknowledgement: true });
  assert.equal(state.shipments.length, 1);
  assert.equal(state.order.status, "paid");
  assert.equal(state.outbox[0].status, "pending");
  state = dispatchOutbox(state);
  assert.equal(state.shipments.length, 1);
  assert.equal(state.outbox[0].attempts, 2);
  assert.equal(state.outbox[0].status, "acknowledged");
  assert.equal(state.order.status, "fulfilled");
  assert.match(state.history.at(-1).title, /shipment reused/);
});

test("repeated lost acknowledgements are safe in the retained in-memory model", () => {
  let state = replay([checkout(), payment()]);
  for (let i = 0; i < 20; i++)
    state = dispatchOutbox(state, { loseAcknowledgement: true });
  assert.equal(state.shipments.length, 1);
  assert.equal(state.outbox[0].attempts, 20);
  assert.equal(state.outbox[0].status, "pending");
  state = dispatchOutbox(state);
  assert.equal(state.outbox[0].attempts, 21);
  assert.equal(state.shipments.length, 1);
});

test("acknowledged outbox cannot dispatch again", () => {
  const state = dispatchOutbox(replay([checkout(), payment()]));
  const again = dispatchOutbox(state);
  assert.deepEqual(again.outbox, state.outbox);
  assert.deepEqual(again.shipments, state.shipments);
  assert.equal(again.history.at(-1).kind, "noop");
});

test("cancelled order never reopens when deferred payment and checkout arrive", () => {
  const state = replay([payment(), cancel(), checkout(), payment("evt_p2")]);
  assert.equal(state.order.status, "cancelled");
  assert.equal(state.order.paymentConfirmed, false);
  assert.equal(state.deferred.length, 0);
  assert.equal(state.outbox.length, 0);
  assert.match(state.history.at(-1).detail, /reconciliation/);
});

test("paid and fulfilled orders reject cancellation without moving backwards", () => {
  const paid = replay([checkout(), payment(), cancel()]);
  assert.equal(paid.order.status, "paid");
  assert.equal(paid.history.at(-1).kind, "rejected");
  const fulfilled = receiveEvent(dispatchOutbox(paid), cancel("evt_x2"));
  assert.equal(fulfilled.order.status, "fulfilled");
  assert.equal(fulfilled.shipments.length, 1);
});

test("late checkout and payment after fulfillment are no-ops", () => {
  let state = dispatchOutbox(replay([checkout(), payment()]));
  state = receiveEvent(state, checkout("evt_c2"));
  state = receiveEvent(state, payment("evt_p2"));
  assert.equal(state.order.status, "fulfilled");
  assert.equal(state.outbox.length, 1);
  assert.equal(state.shipments.length, 1);
});

for (const change of [{ amountCents: 4700 }, { currency: "EUR" }]) {
  test(`mismatched payment is rejected: ${JSON.stringify(change)}`, () => {
    let state = replay([checkout(), { ...payment(), ...change }]);
    assert.equal(state.order.status, "awaiting_payment");
    assert.equal(state.outbox.length, 0);
    assert.equal(state.history.at(-1).kind, "rejected");
    state = receiveEvent(state, payment("evt_corrected"));
    assert.equal(state.order.status, "paid");
  });
}

test("reusing an event ID with changed payload is a conflict, not a duplicate", () => {
  const state = replay([
    checkout(),
    payment(),
    { ...payment(), amountCents: 4900 },
  ]);
  assert.equal(state.duplicates, 0);
  assert.equal(state.history.at(-1).kind, "rejected");
  assert.match(state.history.at(-1).title, /different payload/);
  assert.equal(state.outbox.length, 1);
});

test("object field order does not change event identity", () => {
  const event = payment();
  const reversed = Object.fromEntries(Object.entries(event).reverse());
  const state = replay([event, reversed]);
  assert.equal(state.duplicates, 1);
  assert.equal(state.deferred.length, 1);
});

test("invalid input never queues work or corrupts the event ledger", () => {
  const cases = [
    null,
    [],
    "oops",
    {},
    { ...payment(), id: "__proto__" },
    { ...payment(), type: "charge.refunded" },
    { ...payment(), amountCents: 48.01 },
    { ...payment(), amountCents: Number.MAX_SAFE_INTEGER + 1 },
    { ...payment(), currency: "usd" },
    { ...payment(), extra: true },
  ];
  for (const event of cases) {
    const state = receiveEvent(initialState(), event);
    assert.equal(state.history.at(-1).kind, "rejected");
    assert.equal(state.order.status, "created");
    assert.deepEqual(state.receipts, {});
    assert.equal(state.outbox.length, 0);
  }
});

test("unknown order is rejected before deduplication tracking", () => {
  const state = receiveEvent(initialState(), {
    ...payment(),
    orderId: "ord_other",
  });
  assert.equal(state.history.at(-1).kind, "rejected");
  assert.deepEqual(state.receipts, {});
});

test("reducers do not mutate caller-owned state or event objects", () => {
  const original = deepFreeze(initialState());
  const event = deepFreeze(checkout());
  const awaiting = deepFreeze(receiveEvent(original, event));
  const paid = deepFreeze(receiveEvent(awaiting, deepFreeze(payment())));
  const attempted = deepFreeze(
    dispatchOutbox(paid, { loseAcknowledgement: true }),
  );
  const done = dispatchOutbox(attempted);
  assert.equal(original.history.length, 0);
  assert.equal(awaiting.order.status, "awaiting_payment");
  assert.equal(paid.shipments.length, 0);
  assert.equal(attempted.outbox[0].status, "pending");
  assert.equal(done.order.status, "fulfilled");
});

function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

test("all delivery permutations preserve one fulfillment across duplicate and fresh IDs", () => {
  const events = [checkout(), payment(), payment(), payment("evt_p2")];
  for (const ordering of permutations(events)) {
    let state = initialState();
    for (const event of ordering) {
      state = receiveEvent(state, event);
      assert.equal(inspectInvariants(state).ok, true);
    }
    assert.equal(state.order.status, "paid");
    state = dispatchOutbox(state, { loseAcknowledgement: true });
    state = dispatchOutbox(state);
    assert.equal(inspectInvariants(state).ok, true);
    assert.equal(state.shipments.length, 1);
  }
});

test("all built-in scenarios maintain invariants after each action", () => {
  for (const scenario of SCENARIOS) {
    let state = initialState();
    for (const event of scenario.events) {
      state = receiveEvent(state, event);
      assert.equal(inspectInvariants(state).ok, true, scenario.id);
    }
    state = dispatchOutbox(state, { loseAcknowledgement: true });
    assert.equal(inspectInvariants(state).ok, true, scenario.id);
    state = dispatchOutbox(state);
    assert.equal(inspectInvariants(state).ok, true, scenario.id);
  }
});

test("reset is a fresh empty model, not persistence across sessions", () => {
  const completed = dispatchOutbox(replay([checkout(), payment()]));
  const fresh = initialState();
  assert.equal(completed.shipments.length, 1);
  assert.equal(fresh.shipments.length, 0);
  assert.equal(fresh.order.status, "created");
  assert.deepEqual(fresh.receipts, {});
});
