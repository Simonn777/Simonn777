import {
  initialState,
  receiveEvent,
  dispatchOutbox,
  inspectInvariants,
  SCENARIOS,
} from "./engine.mjs";

const $ = (id) => document.getElementById(id);
let state = initialState();
let scenario = SCENARIOS[0];
let cursor = 0;
const names = {
  created: "Created",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};
const stateNotes = {
  created: "Checkout must arrive before payment can be applied.",
  awaiting_payment:
    "Checkout is recorded. A matching payment is still required.",
  paid: "Payment is confirmed. The outbox worker is allowed to fulfill this order.",
  fulfilled:
    "The worker received acknowledgement. A shipment exists under one stable key.",
  cancelled:
    "Cancelled orders cannot reopen in this model. Late payments need reconciliation.",
};

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

for (const item of SCENARIOS) {
  const option = element("option", "", item.title);
  option.value = item.id;
  $("scenario").append(option);
}

function render(message) {
  $("scenario-note").textContent = scenario.note;
  $("queue-count").textContent =
    `${cursor} / ${scenario.events.length} delivered`;
  $("queue").replaceChildren();
  scenario.events.forEach((event, index) => {
    const item = element(
      "li",
      index < cursor
        ? "event delivered"
        : index === cursor
          ? "event current"
          : "event",
    );
    if (index === cursor) item.setAttribute("aria-current", "step");
    const number = element(
      "span",
      "event-number",
      String(index + 1).padStart(2, "0"),
    );
    const body = element("div", "event-body");
    body.append(
      element("strong", "", event.type),
      element("code", "", event.id),
    );
    const mark = element(
      "span",
      "event-mark",
      index < cursor ? "Delivered" : index === cursor ? "Next" : "Queued",
    );
    item.append(number, body, mark);
    $("queue").append(item);
  });
  $("next").disabled = $("all").disabled = cursor >= scenario.events.length;
  $("order-status").textContent = names[state.order.status];
  $("order-status").dataset.state = state.order.status;
  document.querySelectorAll("[data-state]").forEach((node) => {
    if (node.tagName === "LI") {
      node.classList.toggle(
        "active",
        node.dataset.state === state.order.status,
      );
      if (node.dataset.state === state.order.status)
        node.setAttribute("aria-current", "step");
      else node.removeAttribute("aria-current");
    }
  });
  $("state-note").textContent = stateNotes[state.order.status];
  $("deliveries").textContent = state.deliveries;
  $("duplicates").textContent = state.duplicates;
  $("deferred").textContent = state.deferred.length;
  $("deferred-list").textContent = state.deferred.length
    ? state.deferred.map((event) => event.id).join(", ")
    : "No events waiting.";
  const outbox = state.outbox[0];
  $("outbox-status").textContent = outbox
    ? outbox.status === "acknowledged"
      ? "Acknowledged"
      : "Pending"
    : "Not queued";
  $("outbox-status").dataset.status = outbox?.status || "empty";
  $("outbox-key").textContent = outbox?.key || "—";
  $("attempts").textContent = outbox?.attempts || 0;
  $("shipments").textContent = state.shipments.length;
  $("dispatch").disabled = $("lose-ack").disabled =
    !outbox || outbox.status !== "pending";
  $("worker-note").textContent = !outbox
    ? "A confirmed payment queues one fulfillment message."
    : outbox.status === "acknowledged"
      ? "Message acknowledged. The worker has no pending work."
      : state.shipments.length
        ? "Shipment exists, acknowledgement is missing. Retry with the same key."
        : "Message pending. A worker attempt has not created a shipment yet.";
  $("journal").replaceChildren();
  if (!state.history.length)
    $("journal").append(
      element(
        "li",
        "empty",
        "No decisions yet. Every delivery and worker attempt will leave a record here.",
      ),
    );
  for (const entry of [...state.history].reverse()) {
    const item = element("li", `journal-entry ${entry.kind}`);
    const top = element("div", "journal-top");
    top.append(
      element(
        "span",
        "journal-number",
        String(entry.sequence).padStart(2, "0"),
      ),
      element("strong", "", entry.title),
      element("span", "kind", entry.kind),
    );
    item.append(top);
    if (entry.eventId)
      item.append(element("code", "journal-id", entry.eventId));
    item.append(element("p", "", entry.detail));
    $("journal").append(item);
  }
  $("checks").replaceChildren();
  for (const check of inspectInvariants(state).checks) {
    const item = element("li", check.ok ? "pass" : "fail");
    const mark = element("span", "check-mark", check.ok ? "✓" : "!");
    mark.setAttribute("aria-label", check.ok ? "Pass" : "Fail");
    item.append(mark, element("span", "", check.label));
    $("checks").append(item);
  }
  if (message) $("announcement").textContent = message;
}

function lastDecision() {
  const entry = state.history.at(-1);
  return `${entry.title}. Order: ${names[state.order.status]}. Shipments: ${state.shipments.length}.`;
}

function reset() {
  scenario =
    SCENARIOS.find((item) => item.id === $("scenario").value) || SCENARIOS[0];
  state = initialState();
  cursor = 0;
  render(`Loaded: ${scenario.title}. Order and all in-memory records reset.`);
}

$("load").addEventListener("click", reset);
$("reset").addEventListener("click", () => {
  $("scenario").value = scenario.id;
  reset();
});
$("next").addEventListener("click", () => {
  if (cursor < scenario.events.length)
    state = receiveEvent(state, scenario.events[cursor++]);
  render(lastDecision());
});
$("all").addEventListener("click", () => {
  while (cursor < scenario.events.length)
    state = receiveEvent(state, scenario.events[cursor++]);
  render(lastDecision());
});
$("dispatch").addEventListener("click", () => {
  state = dispatchOutbox(state);
  render(lastDecision());
});
$("lose-ack").addEventListener("click", () => {
  state = dispatchOutbox(state, { loseAcknowledgement: true });
  render(lastDecision());
});
$("send").addEventListener("click", () => {
  let event;
  try {
    event = JSON.parse($("payload").value);
  } catch {
    $("announcement").textContent =
      "JSON could not be parsed. No event was delivered. Check the quotes and commas.";
    $("payload").setAttribute("aria-invalid", "true");
    return;
  }
  $("payload").removeAttribute("aria-invalid");
  state = receiveEvent(state, event);
  render(lastDecision());
});
render();
