/** A deterministic, in-memory teaching model. No network, payment, or storage. */
export const ORDER = Object.freeze({
  id: "ord_demo_1042",
  amountCents: 4800,
  currency: "USD",
});
export const STATES = Object.freeze([
  "created",
  "awaiting_payment",
  "paid",
  "fulfilled",
  "cancelled",
]);

export function initialState() {
  return {
    order: {
      ...ORDER,
      status: "created",
      checkoutConfirmed: false,
      paymentConfirmed: false,
    },
    receipts: {},
    deferred: [],
    outbox: [],
    shipments: [],
    history: [],
    deliveries: 0,
    duplicates: 0,
    sequence: 0,
  };
}

function copy(state) {
  return {
    ...state,
    order: { ...state.order },
    receipts: { ...state.receipts },
    deferred: state.deferred.map((event) => ({ ...event })),
    outbox: state.outbox.map((message) => ({ ...message })),
    shipments: state.shipments.map((shipment) => ({ ...shipment })),
    history: [...state.history],
  };
}

function record(state, kind, title, detail, eventId = "") {
  state.sequence += 1;
  state.history.push({
    sequence: state.sequence,
    kind,
    title,
    detail,
    eventId,
  });
}

function normalize(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("An event must be a JSON object.");
  if (
    typeof input.id !== "string" ||
    !/^evt_[A-Za-z0-9_-]{1,64}$/.test(input.id)
  )
    throw new Error(
      "Event IDs must start with evt_ and contain up to 64 letters, digits, underscores or hyphens after it.",
    );
  if (
    !["checkout.completed", "payment.succeeded", "order.cancelled"].includes(
      input.type,
    )
  )
    throw new Error(
      "Unsupported event type. Use checkout.completed, payment.succeeded, or order.cancelled.",
    );
  if (typeof input.orderId !== "string")
    throw new Error("orderId must be a string.");
  const payment = input.type === "payment.succeeded";
  const keys = payment
    ? ["id", "type", "orderId", "amountCents", "currency"]
    : ["id", "type", "orderId"];
  if (Object.keys(input).some((key) => !keys.includes(key)))
    throw new Error(
      "This simplified event schema does not accept extra fields.",
    );
  const event = { id: input.id, type: input.type, orderId: input.orderId };
  if (payment) {
    if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 1)
      throw new Error("amountCents must be a positive safe integer.");
    if (
      typeof input.currency !== "string" ||
      !/^[A-Z]{3}$/.test(input.currency)
    )
      throw new Error("currency must be a three-letter uppercase code.");
    event.amountCents = input.amountCents;
    event.currency = input.currency;
  }
  return event;
}

function applyEvent(state, event, deferred = false) {
  const order = state.order;
  const origin = deferred ? "Deferred event resumed. " : "";
  if (
    event.type === "payment.succeeded" &&
    (event.amountCents !== order.amountCents ||
      event.currency !== order.currency)
  ) {
    record(
      state,
      "rejected",
      "Payment does not match the order",
      `${origin}Expected ${order.amountCents} cents ${order.currency}. No state change or fulfillment.`,
      event.id,
    );
    return;
  }
  if (event.type === "order.cancelled") {
    if (order.status === "cancelled") {
      record(
        state,
        "noop",
        "Cancellation already applied",
        "A new event ID does not repeat the state change.",
        event.id,
      );
    } else if (["paid", "fulfilled"].includes(order.status)) {
      record(
        state,
        "rejected",
        "Cancellation needs reconciliation",
        "This lab only cancels unpaid orders. Refunds and shipment reversal are outside its model.",
        event.id,
      );
    } else {
      order.status = "cancelled";
      record(
        state,
        "accepted",
        "Order cancelled",
        "The unpaid order is terminal. A late payment must be reconciled; it cannot silently reopen the order.",
        event.id,
      );
    }
    return;
  }
  if (order.status === "cancelled") {
    record(
      state,
      "rejected",
      "Late event cannot reopen a cancelled order",
      `${origin}Manual reconciliation is required. No fulfillment is queued.`,
      event.id,
    );
    return;
  }
  if (event.type === "checkout.completed") {
    if (order.checkoutConfirmed) {
      record(
        state,
        "noop",
        "Checkout already recorded",
        "The order keeps its current state; no backwards transition.",
        event.id,
      );
    } else {
      order.checkoutConfirmed = true;
      order.status = "awaiting_payment";
      record(
        state,
        "accepted",
        "Checkout recorded; awaiting payment",
        "Checkout completion alone does not authorize fulfillment in this model.",
        event.id,
      );
    }
    return;
  }
  if (!order.checkoutConfirmed) {
    state.deferred.push(event);
    record(
      state,
      "deferred",
      "Payment held until checkout arrives",
      "Its event ID is recorded now. A duplicate delivery will not add another deferred copy.",
      event.id,
    );
    return;
  }
  if (order.paymentConfirmed) {
    record(
      state,
      "noop",
      "Payment already applied",
      `${origin}A different event ID cannot create a second fulfillment for this order.`,
      event.id,
    );
    return;
  }
  order.paymentConfirmed = true;
  order.status = "paid";
  const key = `fulfill:${order.id}`;
  if (!state.outbox.some((message) => message.key === key)) {
    state.outbox.push({
      key,
      orderId: order.id,
      status: "pending",
      attempts: 0,
    });
  }
  record(
    state,
    "accepted",
    "Payment applied; fulfillment queued",
    `${origin}One deterministic outbox key: ${key}.`,
    event.id,
  );
}

/** Receive one synthetic event without changing the supplied state or event. */
export function receiveEvent(previous, input) {
  const state = copy(previous);
  state.deliveries += 1;
  let event;
  try {
    event = normalize(input);
  } catch (error) {
    record(state, "rejected", "Invalid event", error.message);
    return state;
  }
  if (event.orderId !== state.order.id) {
    record(
      state,
      "rejected",
      "Unknown order",
      "Only the synthetic order ord_demo_1042 exists in this lab.",
      event.id,
    );
    return state;
  }
  const fingerprint = JSON.stringify(event);
  if (Object.hasOwn(state.receipts, event.id)) {
    if (state.receipts[event.id] === fingerprint) {
      state.duplicates += 1;
      record(
        state,
        "duplicate",
        "Duplicate delivery skipped",
        "The same event ID and payload were already received. No business action is repeated.",
        event.id,
      );
    } else {
      record(
        state,
        "rejected",
        "Event ID reused with a different payload",
        "Conflicting content is rejected, not treated as a harmless retry.",
        event.id,
      );
    }
    return state;
  }
  state.receipts[event.id] = fingerprint;
  const priorStatus = state.order.status;
  applyEvent(state, event);
  if (state.order.status !== priorStatus && state.deferred.length) {
    const pending = state.deferred;
    state.deferred = [];
    for (const held of pending) applyEvent(state, held, true);
  }
  return state;
}

/** Simulate the outbox worker and an idempotent fulfillment receiver. */
export function dispatchOutbox(previous, { loseAcknowledgement = false } = {}) {
  const state = copy(previous);
  const message = state.outbox.find((item) => item.status === "pending");
  if (!message) {
    record(
      state,
      "noop",
      "No pending fulfillment",
      "A paid order is required. Acknowledged messages are not dispatched again.",
    );
    return state;
  }
  message.attempts += 1;
  const existing = state.shipments.find(
    (shipment) => shipment.key === message.key,
  );
  if (!existing) {
    state.shipments.push({
      key: message.key,
      orderId: message.orderId,
      reference: "ship_demo_001",
    });
  }
  if (loseAcknowledgement) {
    record(
      state,
      "retry",
      "Side effect succeeded; acknowledgement lost",
      `${existing ? "The receiver reused" : "The receiver created"} shipment ship_demo_001. The outbox stays pending, so retry with the same key. No real crash or persistent storage is involved.`,
    );
  } else {
    message.status = "acknowledged";
    state.order.status = "fulfilled";
    record(
      state,
      "dispatched",
      existing
        ? "Retry acknowledged; shipment reused"
        : "Fulfillment acknowledged",
      `${existing ? "No second shipment was created." : "One synthetic shipment was created."} Attempt ${message.attempts}; key ${message.key}.`,
    );
  }
  return state;
}

/** Inspect the model's safety properties; these are not production guarantees. */
export function inspectInvariants(state) {
  const checks = [
    { label: "Legal order state", ok: STATES.includes(state.order.status) },
    {
      label: "At most one outbox message per order",
      ok:
        state.outbox.length <= 1 &&
        new Set(state.outbox.map((x) => x.key)).size === state.outbox.length,
    },
    {
      label: "At most one shipment per fulfillment key",
      ok:
        state.shipments.length <= 1 &&
        new Set(state.shipments.map((x) => x.key)).size ===
          state.shipments.length,
    },
    {
      label: "Fulfillment requires confirmed payment",
      ok:
        (!state.outbox.length && !state.shipments.length) ||
        state.order.paymentConfirmed,
    },
    {
      label: "Fulfilled state requires an acknowledged outbox",
      ok:
        state.order.status !== "fulfilled" ||
        state.outbox.some((x) => x.status === "acknowledged"),
    },
    {
      label: "Deferred event IDs are unique",
      ok:
        new Set(state.deferred.map((x) => x.id)).size === state.deferred.length,
    },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

const checkout = (id) => ({
  id,
  type: "checkout.completed",
  orderId: ORDER.id,
});
const payment = (id) => ({
  id,
  type: "payment.succeeded",
  orderId: ORDER.id,
  amountCents: 4800,
  currency: "USD",
});
const cancellation = (id) => ({
  id,
  type: "order.cancelled",
  orderId: ORDER.id,
});

export const SCENARIOS = Object.freeze([
  {
    id: "duplicates",
    title: "Duplicate payment",
    note: "Deliver all three events, then dispatch fulfillment. Repeated event IDs should leave one outbox message.",
    events: [
      checkout("evt_checkout_01"),
      payment("evt_payment_01"),
      payment("evt_payment_01"),
    ],
  },
  {
    id: "reordered",
    title: "Payment before checkout",
    note: "The first payment waits. Its retry is skipped. Checkout then releases the original deferred payment.",
    events: [
      payment("evt_payment_02"),
      payment("evt_payment_02"),
      checkout("evt_checkout_02"),
    ],
  },
  {
    id: "semantic",
    title: "Different IDs, same payment",
    note: "Event-ID deduplication is only one layer. The order state also prevents duplicate fulfillment across different IDs.",
    events: [
      checkout("evt_checkout_03"),
      payment("evt_payment_03"),
      payment("evt_payment_04"),
      checkout("evt_checkout_04"),
    ],
  },
  {
    id: "cancelled",
    title: "Cancellation and a late payment",
    note: "The payment waits, then cancellation wins. The late payment is flagged for reconciliation rather than silently reopening the order.",
    events: [
      payment("evt_payment_05"),
      cancellation("evt_cancel_01"),
      checkout("evt_checkout_05"),
    ],
  },
  {
    id: "mismatch",
    title: "Wrong amount, then correct payment",
    note: "A payment for the wrong amount cannot authorize fulfillment. A distinct valid event can still be applied.",
    events: [
      checkout("evt_checkout_06"),
      { ...payment("evt_payment_06"), amountCents: 4700 },
      payment("evt_payment_07"),
    ],
  },
]);
