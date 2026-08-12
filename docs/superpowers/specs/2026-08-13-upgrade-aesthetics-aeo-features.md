# Upgrade: Aesthetics + AEO + Features (overnight, owner-delegated)

**Date:** 2026-08-13 (owner delegated all decisions: "plan implement and push the things as you feel right")
**Research:** 3-agent evidence workflow (AEO empirical studies, design references, competitor/features). Full findings in session scratchpad `upgrade-research.json`.

## A. Design system — "Indian highway signage" (research-corrected)

Direction: inherit sign LOGIC (one answer, read fast, small surface) — not sign props. Rule of three skeuomorphs: guide-sign answer board, RTO plate badge, milestone step markers. Everything else inherits palette/type only.

- **Corrections adopted:** amber ≠ Indian warning (US MUTCD); amber = attention/temporary/verify only, never text (except #8A5A00). Real legal warnings = white ground + red-triangle idiom (IRC:67 cautionary). Green = NH direction boards → inline status only, never panels. Blue board = informatory (correct for this site).
- **Tokens (roles in :root only; grades not names; no hex inside components):** light: ink #16181D, muted #4A4F57, board-blue #0A3D7C (white legend 10.65:1), blue-link #1156A8, blue-tint #EEF3FB, amber #F2A900 (surface only), amber-tint #FFF8E6, amber-ink #8A5A00, caution-red #B3261E, nh-green #0B5033 (inline), plate-yellow #F5C000, focus #FFDD00 (GOV.UK). Dark (asphalt): bg #101317, surface #1A1D22, text #E8EAED, muted #A9B0BA, board #16305C + 1px hairline #5B6472 (boards separate by keyline, never hue), link #7FB2F0, amber #FFC24B, red #FF8F84, green #6FCF97. `prefers-color-scheme` token swap.
- **Type:** Anek Latin variable (wght+wdth, one woff2, latin subset, preload, font-display swap, metric-matched fallback via size-adjust). No mono — `font-variant-numeric: tabular-nums lining-nums` for amounts. Body 19px/1.6 (GOV.UK baseline), headings 32/27/21 mobile → 48/36/24 desktop. Condensed caps ≤4 words (eyebrows, codes, table headers), +0.02–0.06em tracking, weights ≥400.
- **Components:** (1) Guide-sign answer board — blue ground, inset white keyline (`box-shadow: inset 0 0 0 3px rgba(255,255,255,.9)`), condensed eyebrow, one per page; (2) RTO plate badge — white ground, 2px rule, blue IND tab, state code ONLY (never full plates); (3) Milestone step markers — CSS counters, km-stone ::before, dashed centre-line connector; (4) Schedule-board fine tables — blue header band, tabular figures, 4px severity rail + word (never colour alone), ≤480px stacked cards; (5) Red-triangle caution callout + visually-hidden "Warning:" (GOV.UK pattern) — legal consequences only; (6) Last-verified hazard plate — amber-tint surface, `<time datetime>`; (7) Chevron route breadcrumbs (muted, clip-path); (8) Gantry state picker (homepage); (9) **Independent-site notice strip — deliberately un-signlike, persistent; the anti-impersonation mitigation (top risk: must NOT look official; no emblems/tricolour/NIC blue)**; (10) Amount lockup (₹ small, figure large, condensed unit label).
- **Floors:** print stylesheet (boards→borders), `forced-colors: active` block, reduced-motion, visible focus (#FFDD00), 44px touch targets. OG image + favicon regenerated in new identity.

## B. AEO (evidence-ranked; effect sizes from GEO/KDD-2024, GEO-16, GEO-SFE, Indig, 6.8M-citation studies)

SHIP: (1) machine-readable dates — WebPage JSON-LD `datePublished/dateModified/lastReviewed` on all pages from `last_verified`, + sitemap `<lastmod>` (strongest citation predictor; currently zero); (2) verbatim statutory quotes — optional `statute_quote` data field rendered as attributed `<blockquote>` on offence pages, re-verified against cited India Code sources before seeding (+42.6%, strongest in Law & Gov); (3) question-form H2s in templates (~2× citation lift), strict heading nesting + slugified heading ids; (4) real 3+ column tables kept/extended (+25.7%); (5) `/api/fines.json`, `/api/states.json`, `/api/fines.csv` wired into the Dataset node via `distribution`; (6) calculator page gains a static pre-rendered all-fines table (AI-readable fallback); (7) entity-density/definitional phrasing where templates control copy.
EXPLICITLY NOT SHIPPING (evidence-negative or unsupported): llms-full.txt, per-bot robots.txt groups, more schema types, keyword-variant copy. Deferred to owner: Bing Webmaster (needs MS login).

## C. Features (competitor-gap ranked)

SHIP TONIGHT: (1) **Vehicle-number → state router** on homepage hero — parse RTO prefix (DL/MH/TS…) → route to state page + its portals (every competitor's top affordance; ours is honest: no fake "live lookup"); (2) portal-finder result panel (state → which portal for check/pay/court, from existing data); (3) calculator multi-offence totals + shareable `?offences=&state=&repeat=` params; (4) `/compare/` offences × states matrix (56 override cells, unique content); (5) Pagefind search (modular UI, lazy-loaded on focus; measured on this repo: 37 pages indexed, ~13KB gzip first-load, 0 bytes for non-searchers; `pagefind --site dist` appended to build); (6) print stylesheet; (7) heading anchors.
LATER (queued): glossary, city pages, Lok Adalat date calendar, scam explainer (already queued), /changes/ feed. SKIP: FAQ hub (violates one-intent-one-page), live challan lookup (no public API; say so on site), alerts (needs backend).

## Execution

Sequential implementer chunks, each reviewed: A design system → B feature islands + compare → C search/API/dates plumbing → D statutory quotes + question headings + caution callouts. Full gate/tests/links + visual pass + final review before a single push to main (before the 07:00 IST content run).
