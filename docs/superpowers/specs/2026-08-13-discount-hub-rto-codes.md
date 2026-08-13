# Demand-grounded features: Challan Discount Hub + RTO Code Lookup

## Context

The owner rejected the first feature batch (quiz/reminders/scam-checker) as not matching what people actually search. Three research agents (SERP/competitor scan, live feasibility verification, virality/spike evidence) plus the owner's 390-keyword Ubersuggest export ground this plan.

**Thesis:** this niche's traffic is a sawtooth. It spikes on four calendar-predictable National Lok Adalat dates a year — next **12 Sep 2026** (confirmed on Sikkim/Meghalaya SLSA sites; NALSA publishes no forward calendar) — and on state amnesty schemes with fixed percentages (Telangana 80/60/90 Dec-2023, Karnataka's recurring 50%, Kerala, Bihar, Odisha). Fake-discount rumours recur seasonally hard enough to get fact-checked. **No tool anywhere tracks this** — competitors publish contradictory unsourced percentages. The keyword cluster ≈5,600/mo average with 10× event spikes; the top pending queue item is literally `e-challan-discount-scheme` (vol 1,140).

Owner selected (AskUserQuestion): **F1 Discount & Lok Adalat Hub** + **F6 RTO code lookup now** (+F5 city-queue enablement, included as a tiny edit). Status decoder / receipt rescue / stats dashboard: researched, designed, parked in backlog.

**Verified repo facts:** velocity cap counts only `data/(states|fines)/*.json` + `src/content/guides/*.md` (publish.ts `isPageFile`) — these feature pages and data dirs are cap-exempt, commit direct to main. Gate/`newestVerifiedDate()`/`buildLastmodMap()` must stay in sync (three places). Island idiom: build-time JSON via `set:html` + vanilla script importing pure libs. ShareBar does not exist yet. Existing guide `e-challan-lok-adalat.md` stays (evergreen "how it works"); hub is the volatile "what's on now" — distinct intents, cross-linked, no redirect.

**Honesty rules (load-bearing):** Lok Adalat discount is judge-decided case-by-case — never publish a predicted %. "Tokens run out fast" is undocumented folklore — banned; state the documented caps flatly (50,000 challans/day, 2-lakh total, tokens open ~5 days before per observed practice). A press report alone = status `rumour`, never `live`; rumoured percentages never render in the Discount column.

## Decisions taken (owner-delegated details)

Routes `/challan-discount/`, `/rto-codes/`. Header nav gains "Discounts"; RTO codes goes in footer + homepage tools area. Queue item `e-challan-discount-scheme` → done, `covered_by: challan-discount`; satellites (`off`, `percent`, `percent-off`, `vehicle-percent`, `waiver`, `waive-off`, `settlement`, `token`) → covered. `.ics` includes a "Delhi token window *likely* opens" event with explicit "likely" phrasing. CONTENT_STANDARDS gains rule 11 (schemes: % only with G.O. URL; rumours named as rumours with fact-check cited) and rule 12 (directory data class for RTO: official state list = source of record where fetchable; else sampled verification, disclosed per-state on the page). Stale uncommitted spec `docs/superpowers/specs/2026-08-13-viral-utility-features.md` is replaced by a new spec at implementation start.

## Implementation (chunked, each reviewed then committed)

### Chunk 1 — Data foundations
- `src/lib/schemas.ts`: append `SchemeStatus` enum (`live|announced|closed|proposal|rumour|none`), `SchemeSchema` (slug=state slug, status, optional scheme_name/percent_by_class/window/order_ref, `note` ≥30, `history[]`, `sources[]` ≥1, `last_verified`; superRefine: percent only for live/announced/closed, live/announced require window, window sanity), `LokAdalatSchema` (national_sittings[], delhi_token{portal, opens_days_before, daily_cap_note, limits_note}, delhi_extras{digital_lok_adalat_note, evening_courts_url, weekend_courts_note}, state_notes[], sources, last_verified), `RtoStateSchema` (slug, state_name, series[] `^[A-Z]{2}$`, codes[]{code `^[A-Z]{2}[0-9]{1,2}$`, office}, verification{method full|sampled, sample_size, official_list_available}, sources, last_verified).
- `src/lib/data.ts`: `loadSchemes()`, `loadRtoFiles()` (tolerate missing dir), `loadJsonFile()` helper + `loadLokAdalat()`; extend `newestVerifiedDate()` with schemes + lok-adalat (NOT rto — directory data shouldn't bump site-wide freshness; decide in implementation with a comment) and mirror in `astro.config.mjs` same commit.
- `src/lib/gate.ts`: optional `schemes/lokAdalat/rtoFiles/pages` inputs (existing tests untouched). Rules: live/announced/rumour scheme `last_verified` >14 days → violation; live with ended window → violation; no future national sitting → violation; rto staleness 365d; `pages` registry joins dup-keyword/slug maps.
- `scripts/validate-data.ts`: load new datasets; `FEATURE_PAGES` registry (`challan-discount` → `traffic challan discount`; `rto-codes` → `rto code list india`).
- `scripts/publish.ts`: IndexNow URL mapping for `data/schemes/*`, `data/lok-adalat.json` → `/challan-discount/`; `data/rto/*` → `/rto-codes/`. `isPageFile` untouched.
- Seed data: `data/schemes/*.json` for all 13 site states (TS none+history+rumour note, KA closed+recurring history, Delhi none/proposal+legal-roadblock, MH proposal-only, + `none` rows with sources for the rest — "no scheme, verified" is the product) and, where the site lacks the state (Bihar OTS live/announced, Kerala closed, Odisha), state_notes on lok-adalat.json or scheme files if slugs allowed beyond site states (implementer: allow scheme files for non-site states; hub table renders all). `data/lok-adalat.json` with 2026 sittings `[03-14, 05-09, 09-12, 12-12]`. **Every seeded fact re-verified against its source URL on the day it is written (CONTENT_STANDARDS rule 2) — research supplies claims + where to look, not a licence to skip.**
- Tests: schema refinements, gate rules (15-day live scheme, ended-window live, past-only sittings, registry collision), loaders on real seeds.

### Chunk 2 — Shared components (parallel-safe with 1)
- `src/components/ShareBar.astro` ({text, url?}): WhatsApp `wa.me/?text=` anchor first (build-time encoded, zero JS), native-share button (unhidden if `navigator.share`), copy-link with "Copied" feedback (calculator idiom). `.share-strip` CSS from existing tokens; hidden in print; 44px targets.
- `src/lib/ics.ts`: `buildIcs(events)` — all-day VALUE=DATE events, CRLF, escaping, 75-octet folding, stable UIDs `<slug>@trafficchallan.com`, VALARM TRIGGER:-P<N>D. Pure, dtstamp passed in.
- `src/lib/countdown.ts`: `nextSitting(sittings, todayISO)`, `daysUntil()` — date-string/UTC-midnight math only; server renders absolute date, client recomputes relative.
- Tests: ics escaping/folding/alarms/UID/CRLF; countdown boundaries (today=sitting→0, all-past→null).

### Chunk 3 — `/challan-discount/` hub (the flagship)
`src/pages/challan-discount.astro`: H1 + AnswerBox (3-sentence honest answer: most % forwards are rumours; real discounts = state G.O. window or Lok Adalat where the judge decides; next sitting <date>) → LastVerified (max scheme+lokadalat date) → countdown panel with `data-countdown` + ".ics reminder" (Blob: remaining sittings w/ 7/1-day alarms + "likely" token-window event) + Google Calendar link → **the flagship table**: State | Status (word+rail, never colour-only) | Discount | Window | Order/source, sorted live→announced→proposal→rumour→closed→none → "How much does a Lok Adalat actually give?" (judge-decided; link guide) → "How does the Delhi token system work?" (StepList; caps flat; Digital Lok Adalat/evening/weekend courts) → "Is the '80% discount' message real?" (CautionCallout, rumour + clone-portal warning) → FaqSection + faqJsonLd → ShareBar ("Is there a traffic challan discount on right now? Live state-by-state tracker") → RelatedLinks → aggregated SourceList.
- `src/pages/api/schemes.json.ts` (fines.json.ts pattern, CORS *, license, updated) + `datasetJsonLd` distribution on the hub.
- Wiring: Base.astro header "Discounts" + footer; homepage card; llms.txt ("## Live status" + Data line); `buildLastmodMap` `/challan-discount/` → max(schemes, lok-adalat) and dates joined into allDates (mirror data.ts).
- Guide edit: one pointer paragraph in `e-challan-lok-adalat.md` → hub.
- Queue: retire discount satellites (per Decisions). AGENT_PLAYBOOK.md: new "## Discount watch (every run, before the queue item)" — re-verify all live/announced/rumour schemes against sources + state press pages, update `last_verified` (gate enforces 14d), window-ended → closed + history, new scheme only from official G.O. (press = rumour); within 21 days of a sitting check Delhi token portal/DSLSA; after last sitting of year, add next cycle from first SLSA that publishes. Monthly-verify section: schemes/lok-adalat in scope + rto sampling (5 codes × 3 states, rotating). CONTENT_STANDARDS rules 11 & 12.
- Tests: extract `maxSchemeDate()` into data.ts (testable), gate registry case.

### Chunk 4 — `/rto-codes/` lookup
- Data build via fan-out workflow (subagents): `data/rto/<state-slug>.json` for all 36 states/UTs, starting with the 13 site states. Per state: compile codes (Wikipedia list as scaffold, ~1,311 codes), then verify — official state transport dept list where fetchable (`method: full` for small states, `sampled` ≥max(5, 10%) for large), else sampled against official RTO office pages; record `verification` honestly. Adversarial spot-check pass on a sample per state before commit.
- `src/lib/rto-lookup.ts` (pure, tested): normalize (strip spaces/hyphens, uppercase), extract `^[A-Z]{2}[0-9]{1,2}` from full plate or bare code, return {state, office} or state-only fallback; share "looks like a code" regex with portal-finder.ts rather than duplicating.
- `src/pages/rto-codes.astro`: search island (input → result panel; "nothing you type leaves your browser") above per-state `<h2 id={slug}>` static `.schedule` tables (full static render = SEO surface; ~150KB HTML acceptable, note per-state-page split as follow-up if CWV suffers). Per-state LastVerified + verification-method disclosure. Dataset JSON-LD + `/api/rto-codes.json`. Footer + homepage wiring, llms.txt, lastmod (rto max date), registry entry.
- Tests: rto-lookup edges (MH12, `mh 12`, full plate, bare state code, unknown), schema, gate staleness.

### Chunk 5 — City-pages enablement (4-file edit)
`src/content.config.ts`: optional guide frontmatter `state_slug`. `[slug].astro` guide branch: breadcrumb level + parent-state related link when set (~10 lines). Queue (curated edit): re-open `mumbai` as `mumbai-traffic-challan` guide item (city intent ≠ state page), add `surat/jaipur/ahmedabad/chennai-traffic-challan`, normalize existing pending city slugs to the convention. AGENT_PLAYBOOK "Every run": city-guide instructions (city-specific H2s only; never restate state content; link it).

## Execution

Chunks 1+2 parallel → review → Chunk 3 → review → Chunks 4+5 parallel → review → final whole-diff review. Implementer subagents + reviewer subagents per chunk (same discipline as launch build). Every chunk: `npm test` → `npm run gate` → `npm run build` → `npm run check:links -- --external` before commit; direct commits to main.

## Verification (end-to-end)

- Full suite green; gate passes with new rules active (and deliberately fails on a fixture 15-day-old live scheme in tests).
- Build renders both pages; sitemap lastmod present for both; llms.txt updated; `/api/schemes.json` + `/api/rto-codes.json` valid JSON.
- External link check covers all scheme/G.O. source URLs (gov legacy-TLS = alive-with-warning).
- CDP visual pass (Emulation.setDeviceMetricsOverride, 390px + desktop): hub table stacks correctly, countdown renders, ShareBar wraps, RTO search usable; dark mode spot-check.
- .ics file imports cleanly (validate structure via test + manual open).
- Post-push: live-poll trafficchallan.com/challan-discount/ + /rto-codes/ until 200 with new content; IndexNow ping fires via publish mapping on next data change.
- Memory + ledger updates; report to owner: what shipped, what the Sep 12 spike playbook is, backlog (status decoder, receipt rescue, stats dashboard — designed, ready when wanted).

## Risks

14-day gate can stall MWF runs if Discount watch is skipped — deliberate, violation message says how to clear. Rumour handling: schema blocks rumoured % from rendering. lastmod three-way sync: same-commit discipline. RTO data quality: verification disclosure per state; monthly rotating sample audit. Delhi token folklore: banned in seed copy + playbook.
