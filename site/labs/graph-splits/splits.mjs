/** Educational synthetic data only: these are not PolyTSL records or results. */

function integer(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${name} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return value;
}

function fraction(value) {
  if (!Number.isFinite(value) || value <= 0 || value >= 1) {
    throw new RangeError("trainFraction must be between 0 and 1, exclusive");
  }
  return value;
}

/** Mulberry32: repeatable toy shuffling, not cryptographic randomness. */
function generator(seed) {
  let state = integer(seed, "seed", 0, 0xffffffff) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded(items, seed) {
  const random = generator(seed);
  const shuffled = [...items];
  for (let last = shuffled.length - 1; last > 0; last -= 1) {
    const other = Math.floor(random() * (last + 1));
    [shuffled[last], shuffled[other]] = [shuffled[other], shuffled[last]];
  }
  return shuffled;
}

export function makeSyntheticDataset({ groups = 8, recordsPerGroup = 4 } = {}) {
  integer(groups, "groups", 2, 12);
  integer(recordsPerGroup, "recordsPerGroup", 1, 8);
  const graphs = [];
  const rows = [];
  for (let index = 0; index < groups; index += 1) {
    const id = `G${String(index + 1).padStart(2, "0")}`;
    // Distinct node counts deliberately give each toy graph a unique identity.
    const nodeCount = index + 3;
    const edges = Array.from({ length: nodeCount - 1 }, (_, node) => [
      node,
      node + 1,
    ]);
    const shape = index % 2 === 0 ? "path" : "cycle";
    if (shape === "cycle") edges.push([nodeCount - 1, 0]);
    graphs.push({ id, nodeCount, edges, shape });
    for (let record = 0; record < recordsPerGroup; record += 1) {
      const variant = record + 1;
      const versions = [
        `Graph ${id} has ${nodeCount} toy nodes connected as a ${shape}.`,
        `A synthetic ${shape} with ${nodeCount} nodes and ${edges.length} edges: ${id}.`,
        `${id} is the toy network with ${nodeCount} nodes; its shape is a ${shape}.`,
      ];
      rows.push({
        id: `${id}-R${String(variant).padStart(2, "0")}`,
        graphId: id,
        text: `${versions[record % versions.length]} Synthetic wording ${variant}.`,
      });
    }
  }
  return { graphs, rows };
}

function validateRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2)
    throw new RangeError("At least two rows are required");
  const ids = new Set();
  for (const row of rows) {
    if (
      !row ||
      typeof row.id !== "string" ||
      row.id.length === 0 ||
      typeof row.graphId !== "string" ||
      row.graphId.length === 0
    ) {
      throw new TypeError("Every row requires a nonempty id and graphId");
    }
    if (ids.has(row.id)) throw new RangeError("Row ids must be unique");
    ids.add(row.id);
  }
}

function trainCount(length, trainFraction) {
  return Math.max(
    1,
    Math.min(length - 1, Math.floor(length * fraction(trainFraction))),
  );
}

export function splitRows(rows, { seed = 17, trainFraction = 0.75 } = {}) {
  validateRows(rows);
  const shuffled = shuffleSeeded(rows, seed);
  const count = trainCount(rows.length, trainFraction);
  return { train: shuffled.slice(0, count), test: shuffled.slice(count) };
}

export function splitGroups(rows, { seed = 17, trainFraction = 0.75 } = {}) {
  validateRows(rows);
  // Sort identities first so group assignment does not depend on row order.
  const groups = [...new Set(rows.map((row) => row.graphId))].sort();
  if (groups.length < 2)
    throw new RangeError("At least two graph groups are required");
  const shuffled = shuffleSeeded(groups, seed);
  const trainGroups = new Set(
    shuffled.slice(0, trainCount(groups.length, trainFraction)),
  );
  return {
    train: rows.filter((row) => trainGroups.has(row.graphId)),
    test: rows.filter((row) => !trainGroups.has(row.graphId)),
  };
}

export function describeSplit({ train, test }) {
  const trainGroups = new Set(train.map((row) => row.graphId));
  const testGroups = new Set(test.map((row) => row.graphId));
  return {
    trainRows: train.length,
    testRows: test.length,
    trainGroups: [...trainGroups].sort(),
    testGroups: [...testGroups].sort(),
    overlapGroups: [...trainGroups].filter((id) => testGroups.has(id)).sort(),
  };
}
