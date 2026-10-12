# Graph splits

A small, dependency-free teaching demo built in October 2026 with substantial
AI-assisted implementation and review. It uses eight toy graph identities and
synthetic descriptions. No private PolyTSL assets or model outputs are included.

Compare a seeded record-level shuffle with a split over graph identities. Every
record of a graph stays on the same side in the latter. The visualization reports
train/test membership and group overlap, not model accuracy.

From the repository root:

```sh
python3 -m http.server 8765 --directory site
node --test tests/graph-splits.test.mjs
```

Open http://localhost:8765/labs/graph-splits/.

- `splits.mjs`: seeded shuffle, toy data, split functions, and overlap report.
- `app.mjs`: accessible controls and DOM rendering.
- `index.html`: static explanation and progressive enhancement.
- Tests cover seeded reproducibility, complete/disjoint partitions, unequal
  groups, invalid input, and overlap computed independently of the split logic.

Equal group sizes make 25% of groups equal 25% of rows in the UI. That is not
true for arbitrary datasets. Group IDs also do not establish graph equivalence,
rule out upstream pretraining overlap, or prove generalization. The correct
split unit depends on the intended evaluation question.
