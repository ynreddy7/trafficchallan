# trafficchallan.com

An independent, sourced reference site for Indian traffic e-challans: how to check pending challans, how to pay them (state by state), and the current fine schedule under the Motor Vehicles Act.

This is a data-driven reference platform, not a blog. Facts live in validated JSON under `/data` — every state process and every fine carries a source URL and a `last_verified` date — and pages are rendered from that data at build time. The build fails if a record is missing a source or its `last_verified` date has gone stale (>90 days).

**Stack:** Astro + TypeScript, static output, deployed to Cloudflare Pages on push to `main`. No server, no database, no runtime cost.

## Getting started

```bash
npm install
npm run dev      # local dev server
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local Astro dev server |
| `npm run build` | Validate `/data` against the zod schemas (`gate`), then build the static site to `dist/` |
| `npm test` | Run the Vitest test suite |
| `npm run publish:site` | Velocity-capped publish pipeline — link-checks, generates OG images, commits, and pushes new/updated content |
| `npm run check:links` | Standalone external-link liveness check |
| `npm run gate` | Standalone data-validation gate (also runs as part of `build`) |

## Repo layout

- `data/` — the source-of-truth JSON: state processes (`data/states`), fine schedule (`data/fines`), keyword queue (`data/keywords`)
- `src/content/` — editorial content collection (pillar guides, drip articles)
- `src/pages/`, `src/components/`, `src/layouts/` — Astro site
- `scripts/` — data validation, link checking, OG image generation, the publish pipeline
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — the design spec and implementation plan this build was executed from

## Editorial and agent docs

`CONTENT_STANDARDS.md` and `AGENT_PLAYBOOK.md` (governing sourcing rules, verification cadence, and how a scheduled agent should research and add new content) are arriving in a later task. Until then, `docs/superpowers/specs/` is the authoritative reference for the platform's design decisions.

For one-time owner setup (Cloudflare Pages, DNS, Search Console, etc.), see `SETUP.md`.
