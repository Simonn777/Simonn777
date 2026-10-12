# Wumou (Simon) Xie

**Tufts University · Expected May 2029**

I’m an undergraduate working on machine-learning research and web applications.
My projects include text-conditioned polymer generation, a campus guide, a
textile storefront, and a public C++/Python vector-search lab.

[**Portfolio**](https://simonn777.github.io/Simonn777/) ·
[LinkedIn](https://www.linkedin.com/in/simon-xie-2a03343b8/)

## Selected projects

### PolyTSL · machine-learning research

During an NSF-funded REU, I developed a **593K-parameter adapter** between frozen
Text+ChemT5 and MolGPT models. The study includes 13,020 text–structure pairs,
89 graph-disjoint evaluation targets, five seeds, and MLP/retrieval baselines.
First-author manuscript draft. The results support text-sensitive conditioning,
not a significant advantage over the MLP or exact structural recovery.

[Research notes](https://simonn777.github.io/Simonn777/projects/polytsl.html) ·
[Methods and limitations](docs/polytsl.md)

### VectorTile · C++17 / Python

Exact top-k search using **bounded heaps, tiled NumPy, and query-level
parallelism**. Includes deterministic tie handling, correctness tests,
Linux/macOS CI, and raw CPU benchmark results.

[Interactive demo](https://simonn777.github.io/VectorTile/) ·
[Source and quick start](https://github.com/Simonn777/VectorTile) ·
[Raw measurements](https://github.com/Simonn777/VectorTile/blob/main/benchmarks/results/apple-m5-cpu.json)

_Created October 2026 with substantial AI-assisted implementation and review.
[Development provenance](https://github.com/Simonn777/VectorTile/blob/main/docs/DEVELOPMENT.md).
CUDA hardware validation is pending._

### Tufts Review · campus software

Co-built a **React/Next.js and Supabase** campus guide. My contributions include
department filters, pagination, and checking listings against university sources.

[Live site](https://tuftsreview.org) ·
[Project notes and screenshots](https://simonn777.github.io/Simonn777/projects/tufts-review.html)

### Blue Orchard · commerce engineering

Built a storefront for Yunnan handmade textiles with a Supabase catalog,
persistent cart, and Stripe Checkout. The private implementation includes
server-side pricing, signed payment events, order records, and inventory
reservation/release functions.

[Engineering notes](https://simonn777.github.io/Simonn777/projects/blue-orchard.html) ·
[Public storefront](https://blue-orchard.net)

## Two small experiments

| Try it                                                                     | What to inspect                                                             | Source                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------- |
| [Graph splits](https://simonn777.github.io/Simonn777/labs/graph-splits/)   | How record-level splitting can put the same graph in training and test data | [Implementation](site/labs/graph-splits/) |
| [Payment events](https://simonn777.github.io/Simonn777/labs/order-events/) | Duplicate deliveries, event ordering, and a retryable fulfillment outbox    | [Implementation](site/labs/order-events/) |

These are new, AI-assisted educational demos using synthetic data. They do not
reproduce the private research or commerce systems. Run their tests locally:

```sh
node --test tests/*.test.mjs
node scripts/check-links.mjs
```

## At Tufts

Through **JumboCode**, I contribute inventory, authentication, and database
functionality to LexShareWare, a dishware-lending app for Lexington Zero Waste.
[Team contribution context](docs/applications.md#jumbocode--lexshareware).

Research and application source remains private where indicated. Public demos,
project notes, and role descriptions distinguish shared work from independent
and AI-assisted implementation.
