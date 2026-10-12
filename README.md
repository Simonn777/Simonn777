# Wumou (Simon) Xie

**Tufts University · Expected May 2029**

ML experiments, systems programming, and software people can use.

I build reproducible machine-learning experiments and full-stack applications.
My interests connect efficient ML, the software/hardware boundary, and
accessible technology.

## Start here: VectorTile

**Exact nearest-neighbor search without a full distance matrix.**

A public C++17 / Python systems lab with a streaming max-heap engine, query-level
parallelism, tiled NumPy and optional PyTorch backends. Includes independent
correctness oracles, sanitizer checks, cross-platform CI, raw timing data and
an interactive explanation of the algorithm.

**[Try the interactive demo ↗](https://simonn777.github.io/VectorTile/)** ·
[Read the implementation](https://github.com/Simonn777/VectorTile) ·
[Inspect the measurements](https://github.com/Simonn777/VectorTile/blob/main/benchmarks/results/apple-m5-cpu.json)

<a href="https://simonn777.github.io/VectorTile/"><img src="https://raw.githubusercontent.com/Simonn777/VectorTile/main/docs/benchmark.png" alt="VectorTile: measured CPU latency across exhaustive-search implementations and workloads" width="850"></a>

The project separates measured CPU results from unvalidated GPU performance.
Created in October 2026 with AI-assisted implementation and review;
[development provenance](https://github.com/Simonn777/VectorTile/blob/main/docs/DEVELOPMENT.md).

## Selected work

| Project | My work | Public evidence |
| --- | --- | --- |
| **PolyTSL** · research | A 592,768-parameter adapter connecting frozen Text+ChemT5 and MolGPT models; controlled evaluation across 89 graph-disjoint targets and five seeds. | [Methods and scope](docs/polytsl.md). Research source/data remain private pending release review. |
| **Tufts Review** · student software | Co-built an independent campus guide; implemented department filters and pagination, and checked listings against university sources. | [Live guide](https://tuftsreview.org) · [Project context](docs/applications.md#tufts-review) |
| **Blue Orchard** · commerce | Next.js/TypeScript storefront, Supabase catalog, persistent cart, Stripe Checkout, verified payment webhooks and order workflows. | [Live storefront](https://blue-orchard.net) · [Engineering summary](docs/applications.md#blue-orchard) |
| **JumboCode / LexShareWare** · team engineering | Inventory management, authentication and database work for a dishware-lending application serving Lexington Zero Waste. | [Contribution context](docs/applications.md#jumbocode--lexshareware) |

## How I approach a project

- Make the behavior explicit: input contracts, failure modes, and numerical limits.
- Keep evidence inspectable: baselines, ablations, tests and reproducible commands.
- Build around real users: student communities, nonprofit partners and accessible interfaces.

**Tools used across my work:** Python, NumPy, PyTorch, TypeScript, React,
Next.js, PostgreSQL, Supabase, Prisma, Git; C++ through current systems work.

Project descriptions distinguish research, team contributions and independent
development. Private repositories are not presented as publicly reviewable source.
