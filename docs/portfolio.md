# Maintaining this portfolio

The profile README is an index. The [portfolio](https://simonn777.github.io/Simonn777/)
contains four project overviews, three detailed project notes, and two interactive
educational demos. VectorTile's own site hosts its separate algorithm demo.

## Local preview and checks

From the repository root (Node.js 24+ for tests):

```sh
python3 -m http.server 8765 --directory site
node --test tests/*.test.mjs
node scripts/check-links.mjs
```

Open http://localhost:8765/. Core pages, project notes, navigation, and disclosures
work without JavaScript. The two labs require JavaScript for interaction and
include static explanations. There is no build step or runtime dependency.
Fonts are self-hosted; asset provenance and licenses are in `site/assets/`.

The Node tests cover the labs' algorithm and state transitions. The link check
validates local HTML references and fragments; it does not verify external
services. Check desktop/mobile layout and keyboard controls in a browser when
changing the interface.

## Publication

The Portfolio workflow checks tests and internal links before deploying `site/`
to GitHub Pages. Only `site/` is uploaded. The account-root website is a separate
repository and is not managed by this project.

## Content and contribution boundaries

- The existing research and applications are described from the current resume,
  available project evidence, and public websites. Private code/data is not included.
- Case studies separate individual, team, and AI-assisted work. Source access
  alone is not treated as proof of sole authorship.
- Performance numbers link to raw measurements with hardware and workload context.
- Graph Splits is a synthetic teaching example, not the PolyTSL dataset or model.
- Payment Event Lab is a newly written in-memory teaching model, not the Blue
  Orchard production implementation, a payment integration, or a reliability audit.
- Product screenshots record public interfaces in October 2026. They do not
  establish user counts, historical revenue, or current transaction availability.

This portfolio and its new interactive labs were created with substantial
AI-assisted design, implementation, testing, and review in October 2026. They
are learning and presentation artifacts; their existence does not by itself
establish independent mastery of every implementation detail.
