import test from "node:test";
import assert from "node:assert/strict";
import {
  makeSyntheticDataset,
  shuffleSeeded,
  splitRows,
  splitGroups,
  describeSplit,
} from "../site/labs/graph-splits/splits.mjs";

function assertPartition(rows, split) {
  const expected = rows.map((row) => row.id).sort();
  const actual = [...split.train, ...split.test].map((row) => row.id).sort();
  assert.deepEqual(actual, expected, "every source row appears exactly once");
  const trainIds = new Set(split.train.map((row) => row.id));
  assert.equal(
    split.test.some((row) => trainIds.has(row.id)),
    false,
    "row IDs never overlap",
  );
}

test("synthetic generation is reproducible and gives distinct graph identities", () => {
  const data = makeSyntheticDataset();
  assert.deepEqual(data, makeSyntheticDataset());
  assert.equal(data.graphs.length, 8);
  assert.equal(data.rows.length, 32);
  assert.equal(new Set(data.graphs.map((graph) => graph.nodeCount)).size, 8);
  assert.equal(new Set(data.rows.map((row) => row.id)).size, 32);
  assert.ok(data.rows.every((row) => row.text.includes("Synthetic wording")));
  for (const graph of data.graphs) {
    assert.equal(data.rows.filter((row) => row.graphId === graph.id).length, 4);
    for (const edge of graph.edges)
      assert.ok(edge.every((node) => node >= 0 && node < graph.nodeCount));
  }
});

test("Fisher-Yates shuffle is seeded, non-mutating and preserves items", () => {
  const input = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const original = [...input];
  assert.deepEqual(shuffleSeeded(input, 17), shuffleSeeded(input, 17));
  assert.deepEqual(shuffleSeeded(input, 17), [
    "g",
    "h",
    "c",
    "e",
    "a",
    "d",
    "b",
    "f",
  ]);
  assert.notDeepEqual(shuffleSeeded(input, 17), shuffleSeeded(input, 18));
  assert.deepEqual(shuffleSeeded(input, 0xffffffff).sort(), original);
  assert.deepEqual(input, original);
});

test("different text rows can leak a shared graph across a row split", () => {
  const { rows } = makeSyntheticDataset({ recordsPerGroup: 4 });
  const split = splitRows(rows, { seed: 17 });
  const summary = describeSplit(split);
  assertPartition(rows, split);
  assert.equal(summary.trainRows, 24);
  assert.equal(summary.testRows, 8);
  assert.ok(summary.overlapGroups.length > 0);
  // Independent set-intersection oracle, without describeSplit.
  const expected = [...new Set(split.train.map((row) => row.graphId))]
    .filter((id) => split.test.some((row) => row.graphId === id))
    .sort();
  assert.deepEqual(summary.overlapGroups, expected);
});

test("group splits are disjoint and complete across all UI row counts and many seeds", () => {
  for (let recordsPerGroup = 1; recordsPerGroup <= 8; recordsPerGroup += 1) {
    const { rows } = makeSyntheticDataset({ recordsPerGroup });
    const original = JSON.stringify(rows);
    for (let seed = 0; seed < 50; seed += 1) {
      const split = splitGroups(rows, { seed });
      assertPartition(rows, split);
      assert.deepEqual(describeSplit(split).overlapGroups, []);
      assert.equal(split.train.length, 6 * recordsPerGroup);
      assert.equal(split.test.length, 2 * recordsPerGroup);
      const trainGraphs = new Set(split.train.map((row) => row.graphId));
      assert.ok(split.test.every((row) => !trainGraphs.has(row.graphId)));
    }
    assert.equal(
      JSON.stringify(rows),
      original,
      "splitting does not mutate the dataset",
    );
  }
});

test("one description per graph yields no graph overlap for either strategy", () => {
  const { rows } = makeSyntheticDataset({ recordsPerGroup: 1 });
  for (const split of [splitRows(rows), splitGroups(rows)]) {
    assertPartition(rows, split);
    assert.deepEqual(describeSplit(split).overlapGroups, []);
  }
});

test("both strategies repeat exactly at boundary seeds and keep the input unchanged", () => {
  const { rows } = makeSyntheticDataset({ recordsPerGroup: 8 });
  const unchanged = JSON.stringify(rows);
  for (const split of [splitRows, splitGroups]) {
    for (const seed of [0, 17, 0xffffffff]) {
      assert.deepEqual(split(rows, { seed }), split(rows, { seed }));
      assertPartition(rows, split(rows, { seed }));
    }
  }
  assert.equal(JSON.stringify(rows), unchanged);
});

test("small and large group counts preserve membership; extreme ratios keep both sides nonempty", () => {
  for (const groups of [2, 12]) {
    const { rows } = makeSyntheticDataset({ groups, recordsPerGroup: 1 });
    for (const split of [splitRows, splitGroups]) {
      for (const trainFraction of [0.001, 0.5, 0.999]) {
        const result = split(rows, { seed: 0, trainFraction });
        assertPartition(rows, result);
        assert.ok(result.train.length > 0 && result.test.length > 0);
      }
    }
  }
});

test("group assignment is independent of record order", () => {
  const { rows } = makeSyntheticDataset();
  const expected = describeSplit(splitGroups(rows, { seed: 29 }));
  const reordered = describeSplit(
    splitGroups(shuffleSeeded(rows, 942), { seed: 29 }),
  );
  assert.deepEqual(reordered, expected);
});

test("uneven groups stay intact even when row proportion differs from group proportion", () => {
  const rows = [
    ...Array.from({ length: 9 }, (_, index) => ({
      id: `large-${index}`,
      graphId: "large",
    })),
    { id: "small-1", graphId: "small" },
  ];
  const split = splitGroups(rows, { seed: 7, trainFraction: 0.5 });
  assertPartition(rows, split);
  assert.deepEqual(describeSplit(split).overlapGroups, []);
  assert.ok([1, 9].includes(split.train.length));
  assert.notEqual(split.train.length / rows.length, 0.5);
});

test("a manually constructed fixture reports entity overlap without row overlap", () => {
  const train = [
    { id: "a", graphId: "G1" },
    { id: "c", graphId: "G2" },
  ];
  const testRows = [{ id: "b", graphId: "G1" }];
  assert.deepEqual(describeSplit({ train, test: testRows }), {
    trainRows: 2,
    testRows: 1,
    trainGroups: ["G1", "G2"],
    testGroups: ["G1"],
    overlapGroups: ["G1"],
  });
});

test("invalid settings and malformed identity records fail explicitly", () => {
  for (const value of [0, 9, 1.5, NaN, "4"]) {
    assert.throws(
      () => makeSyntheticDataset({ recordsPerGroup: value }),
      RangeError,
    );
  }
  for (const groups of [1, 13, 2.5, NaN, "8"]) {
    assert.throws(() => makeSyntheticDataset({ groups }), RangeError);
  }
  const { rows } = makeSyntheticDataset();
  for (const seed of [-1, 0x100000000, 1.5, NaN, "17"]) {
    assert.throws(() => splitRows(rows, { seed }), RangeError);
    assert.throws(() => splitGroups(rows, { seed }), RangeError);
  }
  for (const trainFraction of [0, 1, -1, NaN, Infinity]) {
    assert.throws(() => splitRows(rows, { trainFraction }), RangeError);
    assert.throws(() => splitGroups(rows, { trainFraction }), RangeError);
  }
  assert.throws(() => splitRows([]), RangeError);
  assert.throws(() => splitRows([rows[0], rows[0]]), /unique/);
  assert.throws(
    () => splitGroups(rows.filter((row) => row.graphId === "G01")),
    /two graph groups/,
  );
  assert.throws(() => splitRows([{ id: "a" }, { id: "b" }]), TypeError);
});
