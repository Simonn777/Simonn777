# Maintaining this portfolio

The profile README is a short index. The static site at
https://simonn777.github.io/Simonn777/ presents three selected projects with
contribution context and direct links to public evidence.

## Local preview

From the repository root:

```sh
python3 -m http.server 8765 --directory site
```

Open http://localhost:8765/. No JavaScript or build step is required. All core
content, navigation and research disclosures work in plain HTML. Fonts are
self-hosted; asset attribution and licenses are in `site/assets/`.

## Publication

The `Portfolio` GitHub Actions workflow deploys `site/` to GitHub Pages after a
push to `main` that changes the site or its workflow. Only that directory is
uploaded. The existing account-root website is a separate repository.

When editing content:

- Preserve the difference between individual, team and AI-assisted work.
- Link to raw measurements when quoting performance; include hardware and workload.
- Keep private research source, datasets and model assets out of the public site.
- Check desktop and mobile layout, keyboard navigation and outbound links.
- Update the profile README if the featured projects or public entry points change.

This portfolio was created with AI-assisted design, implementation and review
in October 2026. It summarizes existing project evidence rather than establishing
additional experience or skills by itself.
