import {
  makeSyntheticDataset,
  splitRows,
  splitGroups,
  describeSplit,
} from "./splits.mjs";

const element = (id) => document.getElementById(id);
const svgNS = "http://www.w3.org/2000/svg";

function makeElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function graphDrawing(graph) {
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 80 60");
  svg.setAttribute("aria-hidden", "true");
  const positions = Array.from({ length: graph.nodeCount }, (_, index) => {
    const angle = (index / graph.nodeCount) * Math.PI * 2 - Math.PI / 2;
    return [40 + Math.cos(angle) * 24, 30 + Math.sin(angle) * 24];
  });
  for (const [from, to] of graph.edges) {
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", positions[from][0]);
    line.setAttribute("y1", positions[from][1]);
    line.setAttribute("x2", positions[to][0]);
    line.setAttribute("y2", positions[to][1]);
    svg.append(line);
  }
  for (const [x, y] of positions) {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 3);
    svg.append(circle);
  }
  return svg;
}

function renderPanel(prefix, data, split) {
  const summary = describeSplit(split);
  element(`${prefix}-train`).textContent = summary.trainRows;
  element(`${prefix}-test`).textContent = summary.testRows;
  element(`${prefix}-overlap`).textContent =
    `${summary.overlapGroups.length} / ${data.graphs.length}`;
  const overlap = new Set(summary.overlapGroups);
  const trainIds = new Set(split.train.map((row) => row.id));
  element(`${prefix}-detail`).textContent = overlap.size
    ? `Present in both splits: ${summary.overlapGroups.join(", ")}.`
    : "No graph identity appears in both training and test.";
  const cards = data.graphs.map((graph) => {
    const card = makeElement(
      "section",
      `graph-card${overlap.has(graph.id) ? " shared" : ""}`,
    );
    const heading = makeElement("div", "graph-heading");
    heading.append(makeElement("h3", "", graph.id), graphDrawing(graph));
    card.append(
      heading,
      makeElement(
        "p",
        "graph-meta",
        `${graph.nodeCount} nodes · ${graph.edges.length} edges`,
      ),
    );
    const markers = makeElement("ol", "markers");
    markers.setAttribute("aria-label", `${graph.id} text-row assignments`);
    for (const row of data.rows.filter(
      (record) => record.graphId === graph.id,
    )) {
      const isTrain = trainIds.has(row.id);
      const marker = makeElement(
        "li",
        `marker ${isTrain ? "train" : "test"}`,
        isTrain ? "TR" : "TE",
      );
      marker.setAttribute(
        "aria-label",
        `${row.id}: ${isTrain ? "training" : "test"}`,
      );
      marker.title = `${row.id}: ${isTrain ? "training" : "test"} — ${row.text}`;
      markers.append(marker);
    }
    card.append(
      markers,
      makeElement(
        "p",
        "assignment",
        overlap.has(graph.id)
          ? "Shared across train / test"
          : trainIds.has(data.rows.find((row) => row.graphId === graph.id).id)
            ? "Training only"
            : "Test only",
      ),
    );
    return card;
  });
  element(`${prefix}-cards`).replaceChildren(...cards);
  return summary;
}

function render() {
  try {
    const recordsPerGroup = Number(element("records").value);
    const seed = Number(element("seed").value);
    if (element("seed").value.trim() === "")
      throw new RangeError("Enter a seed from 0 to 4294967295.");
    const data = makeSyntheticDataset({ recordsPerGroup });
    const rowSummary = renderPanel("row", data, splitRows(data.rows, { seed }));
    const groupSummary = renderPanel(
      "group",
      data,
      splitGroups(data.rows, { seed }),
    );
    const tableRows = data.rows.map((row) => {
      const tr = makeElement("tr");
      const id = makeElement("th", "", row.id);
      id.scope = "row";
      tr.append(
        id,
        makeElement("td", "", row.graphId),
        makeElement("td", "", row.text),
      );
      return tr;
    });
    element("dataset-body").replaceChildren(...tableRows);
    element("dataset-caption").textContent =
      `${data.rows.length} synthetic text rows across ${data.graphs.length} graph identities`;
    element("status").textContent =
      `Seed ${seed} · ${data.rows.length} rows · ${recordsPerGroup} per graph. Random row split: ${rowSummary.overlapGroups.length} overlapping graphs. Group split: ${groupSummary.overlapGroups.length}.`;
    element("error").hidden = true;
  } catch (error) {
    element("error").textContent = error.message;
    element("error").hidden = false;
  }
}

element("records").addEventListener("input", () => {
  element("records-value").value = element("records").value;
});
element("split-form").addEventListener("submit", (event) => {
  event.preventDefault();
  render();
});
render();
element("controls").disabled = false;
