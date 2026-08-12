# Chunk A — Highway-signage design system (implementer report)

**Date:** 2026-08-13 · **Branch:** main (not pushed) · **Scope:** visual-only restyle + design tokens

---

## 1. What was built

### Fonts — `public/fonts/`

| File | Bytes | Role |
|---|---|---|
| `anek-latin-var.woff2` | **103,760** | Anek Latin VARIABLE, `wght 400..700` + `wdth 75..125`, Google **latin** subset. Preloaded. |
| `anek-latin-supp.woff2` | **1,944** | Same variable axes, custom Google `text=` subset containing **only U+20B9 (₹) and U+2192 (→)**. Loads on demand. |
| **Total** | **105,704** | 2 files, 1 preload |

Both verified `wOF2` magic bytes. Obtained from `fonts.googleapis.com/css2?family=Anek+Latin:wdth,wght@75..125,400..700` (the combined wdth+wght variable file the brief preferred), so condensed labels come from the real `wdth` axis — never `transform: scaleX()` (pitfall #7).

**Why a second file.** The rupee sign U+20B9 is *not* in Google's `latin` subset — it sits in `latin-ext` (82KB for this family). Since ₹ appears on essentially every page, falling back to Segoe UI for the currency glyph next to Anek digits would have been visible on the site's signature element. The `latin-ext` subset would have cost 82KB for two glyphs, so I pulled a 1.9KB custom `text=` subset instead (still variable, both axes intact). Net: 105.7KB total instead of 186KB, and ₹ renders in Anek.

### `src/styles/global.css` — full rewrite (152 rules, 8 at-rules, ~17.5KB built)

- **Role tokens only in `:root`**, light palette verbatim from `research.json.design.color_notes`; `@media (prefers-color-scheme: dark)` swaps the same role names to the asphalt palette. **Zero hex values appear inside any component rule** (verified by grep; the only hex outside `:root` blocks is inside the `@media print` `:root` override, which is itself a token block).
- Board separation in dark mode comes from `--board-hairline` (#5B6472) and the inset keyline, never hue (pitfall #4).
- `@font-face`: Anek Latin ×2 + metric-matched `"Anek Fallback"` (`local(Segoe UI)/local(Roboto)`, `size-adjust: 97%`, `ascent-override: 92%`, `descent-override: 24%`, `line-gap-override: 0%`).
- Body **19px / 1.6**. Headings `clamp()` 32/27/21 mobile → 48/36/24 desktop. Small print 16px.
- `font-variant-numeric: tabular-nums lining-nums` (+ `font-feature-settings` for old WebViews) on tables, `<time>`, `.tnum`, `.amount`. No mono anywhere.
- `:focus-visible` = 3px `#FFDD00` outline, offset 2px. `::selection` = amber-tint ground, ink text.
- `@media print`, `@media (forced-colors: active)`, `@media (prefers-reduced-motion: reduce)` all present. Transitions are 120ms; **no `@keyframes` anywhere in the file**.

### Components

| File | Component spec | Notes |
|---|---|---|
| `AnswerBox.astro` | #1 guide-sign board | Blue ground, `inset 0 0 0 3px` white keyline, condensed eyebrow **"The short answer"** (uppercased in CSS), mixed-case body. Prop interface unchanged (slot only). |
| `PlateBadge.astro` **(new)** | #2 RTO plate | `{ code: string }`. White ground, 2px rule, 14px vertical blue **IND** tab (`aria-hidden`), condensed tabular code. State code only — never a full plate string. |
| `StepList.astro` | #3 milestone markers | Unchanged markup (`<ol class="steps">`); CSS counters draw a km-stone `::before` (light top half w/ number, blue lower half, hard-stop fill) and a dashed connector `::after`. |
| `FineTable.astro` | #4 schedule board | Blue header band, condensed caps headers, tabular figures, `.table-wrap` scroll, ≤480px stacked-card collapse via `data-label`. Rails: red rail + word **"Court"** on `compoundable_online === false` rows (29 site-wide); amber rail + word **"State-notified"** on override cells (56 site-wide — matches the spec's "56 override cells"). |
| `CautionCallout.astro` **(new)** | #5 red-triangle caution | Slot-only. Inline red-triangle SVG `aria-hidden`, 3px red left rule, visually-hidden `"Warning: "` span. Created but not yet wired into pages (Chunk D). |
| `LastVerified.astro` | #6 hazard plate | Amber-tint surface, amber left rail, condensed caps label, real `<time datetime="YYYY-MM-DD">`. |
| `Breadcrumbs.astro` | #7 chevron strip | `<ol>` of `clip-path` chevrons, muted tint ground, `aria-current="page"` on the leaf. |
| `SourceList / FaqSection / RelatedLinks` | quiet restyles | Token-driven only; markup and headings unchanged. |

### `src/layouts/Base.astro`

- **Notice strip (#9)** as the first element in `<body>`, above the header, on every page: *"**Independent guide** — not a government website. Challans are paid only on official government portals."* Neutral surface, no blue, no board, no crest — deliberately the one element that refuses the signage language.
- Blue board header band: brand with a small filled white chevron SVG (`aria-hidden`), empty `<div id="search-slot"></div>` (Chunk C; `:empty { display:none }`), nav.
- `<link rel="preload" as="font" crossorigin>` for the primary woff2 only.
- Blue board footer: 3 columns — **States** (13, from `loadStates()`), **Fines & tools** (`/fines/`, `/calculator/` + 6 guides from `getCollection`), **About this site** (4 policy pages) — plus the original byline/colophon line, unchanged.
- All head/meta/canonical/OG/JSON-LD logic untouched. The `.disclaimer` paragraph stays exactly where it was, at the end of `<main>`.

### `src/pages/index.astro`

- Hero band (tinted ground, 5px board-blue beam) holding h1 + the existing AnswerBox + two action links: **"Find your challan portal"** → `#portal-finder`, **"Know your fine"** → `/calculator/`.
- `#portal-finder` section shell rendered with a one-line static fallback naming both national portals (Chunk B replaces the body).
- Stat strip: `13 STATES · 10 OFFENCES · SOURCED & DATED`, condensed caps + tabular figures, computed from data.
- State picker rebuilt as the **gantry (#8)**: board-blue band, `auto-fill minmax(150px,1fr)` grid, each entry = PlateBadge + state name + chevron. `STATE_CODES` map lives in the frontmatter, all 13 slugs mapped as specified.
- Every pre-existing section, paragraph, link, table and FAQ retained verbatim; title/description/keyword strings untouched.

### Identity assets

- `scripts/make-og.ts` rewritten and run → `public/og-default.png` **36,635 → 51,587 bytes**. Blue board, inset white keyline, wordmark, amber underline accent, tagline, and an explicit *"Independent guide · not a government site"* line.
- `public/favicon.svg`: board-blue rounded board + white keyline + white "TC".
- `public/_headers`: added `/fonts/* → Cache-Control: public, max-age=31536000, immutable`.

---

## 2. Verification — raw output

```
### npm run gate
> tsx scripts/validate-data.ts

gate: all quality gates passed

### npm test
 RUN  v2.1.9 C:/Users/yniti/trafficchallan

 ✓ tests/smoke.test.ts (1 test) 4ms
 ✓ tests/format.test.ts (5 tests) 4ms
 ✓ tests/seo.test.ts (6 tests) 5ms
 ✓ tests/fine-calc.test.ts (3 tests) 4ms
 ✓ tests/links.test.ts (5 tests) 5ms
 ✓ tests/gate.test.ts (6 tests) 6ms
 ✓ tests/linkcheck.test.ts (5 tests) 5ms
 ✓ tests/schemas.test.ts (6 tests) 11ms
 ✓ tests/data.test.ts (3 tests) 16ms
 ✓ tests/keyword-map.test.ts (5 tests) 4ms

 Test Files  10 passed (10)
      Tests  45 passed (45)
   Duration  16.27s

### npx tsc --noEmit
(exit 0 — no output means clean)

### npm run build
03:52:34 ✓ Completed in 431ms.
03:52:34 [@astrojs/sitemap] `sitemap-index.xml` created at `dist`
03:52:34 [build] 37 page(s) built in 2.13s
03:52:34 [build] Complete!

### npm run check:links
internal: 37 page(s), 1240 link(s) checked, 0 broken
check-links: all checks passed
```

### Dist spot-checks

```
$ for p in dist/index.html dist/calculator/index.html dist/how-to-check-e-challan/index.html;
    do grep -o 'Independent guide</strong> — not a government website. …' $p | wc -l; done
dist/index.html: 1
dist/calculator/index.html: 1
dist/how-to-check-e-challan/index.html: 1

$ ls -l dist/fonts/
-rw-r--r-- 1944    anek-latin-supp.woff2
-rw-r--r-- 103760  anek-latin-var.woff2

$ grep -o 'url(/fonts/[^)]*)' dist/_astro/*.css
url(/fonts/anek-latin-var.woff2)
url(/fonts/anek-latin-supp.woff2)

$ grep -rl 'rel="preload" href="/fonts/anek-latin-var.woff2"' dist --include=*.html | wc -l
37          # = all 37 built pages

$ grep -o "prefers-color-scheme:dark|forced-colors:active|@media print|prefers-reduced-motion:reduce" (counts)
1 / 1 / 1 / 1
```

### Regression diff against a HEAD baseline build

I built `HEAD` into a throwaway worktree and diffed the two `dist/` trees programmatically:

- **37/37 pages: `<title>`, `<meta name="description">`, `<link rel="canonical">` and every JSON-LD block byte-identical.**
- Block-level text (`p, li, h1-h4, td, th, summary, blockquote`) diff: **0 unexplained removals.** Every delta is an addition or a known micro-edit:
  - `colon × 30` — `Last verified: 12 Aug 2026` → `Last verified` + `<time>12 Aug 2026</time>` (colon dropped, date now machine-readable)
  - `Court × 29` — severity word added to non-compoundable rows
  - `State-notified × 56` — override word added to state-override cells
- 1,208 net-new text chunks = the new footer sitemap columns, eyebrow, stat strip and portal-finder shell.

### Visual pass (Chrome, live preview)

Homepage, `/delhi-e-challan/`, `/fines/` checked in **dark mode** and — by temporarily flipping the media query in the *built* CSS only — in **light mode**. Two defects found and fixed before commit:

1. **Plate badge was being crushed** when a state name wrapped to two lines in the gantry (`AP`, `MH`, `MP`, `JK` showed clipped codes). Fix: `.plate { flex: 0 0 auto }`.
2. **Fine table columns collapsed** — `white-space: nowrap` on amount cells was wrong because `base_fine_text` is often a full sentence, which pushed the offence column down to ~110px and forced a long horizontal scroll. Fix: dropped the nowrap, added `min-width` floors (10rem offence, 11rem amounts).

---

## 3. Deviations from the component specs, with reasons

1. **Two font files, not one.** Research budgeted "≤2 font files, ≤60KB total"; the brief raised the ceiling to ≤300KB and asked for the wdth+wght file. I shipped 2 files / 105.7KB. The `wght`-only latin subset would have been 44.8KB but has no `wdth` axis, and faking condensed is explicitly forbidden — so the extra ~59KB buys the real condensed axis that four components depend on. The second file is 1.9KB and exists only because ₹ is absent from Google's latin subset (see §1).
2. **Breadcrumbs are condensed but NOT uppercase.** Component #7 says "condensed caps", but breadcrumb leaves include strings like *"Dangerous driving and jumping a red light"* — a seven-word caps run, which violates pitfall #9 (and makes some screen readers spell it out). Kept mixed case with condensed width + tracking; the chevron `clip-path` still does the sign work.
3. **The hero band is tinted, not dark blue.** The brief called the hero a "gantry band". A dark-blue hero would have put the blue AnswerBox board on a blue ground, killing the board's separation and doubling the blue mass above the fold. The hero is a light tint with a 5px board-blue beam along the top; the **state picker** is the one true dark gantry (which is where component #8 actually places it).
4. **Bands are contained, not full-bleed.** Hero/gantry sit inside the 760px measure rather than bleeding edge-to-edge, to avoid the `100vw` horizontal-scroll bug on scrollbar-present desktops. Header/footer bands are genuinely full-bleed since they live outside `<main>`.
5. **`.answer-box` survives as a quiet panel class.** `calculator.astro` uses `class="answer-box"` on its `<form>`; rather than touch a file outside my scope I restyled `.answer-box` (and its alias `.panel`) as a neutral tinted panel. The guide-sign board is `.answer-board`, so "one board per page" still holds on the calculator page.
6. **`LastVerified` lost its colon.** Required to split the label and the `<time datetime>` into separate elements. Only punctuation changed.
7. **Severity rails are 2-valued, not 4-valued.** Component #4 describes blue/amber/red keyed to consequence. Only two of those are derivable from the current schema (`compoundable_online`, `fine_overrides`), and the brief said rails "ONLY where derivable" — so compoundable rows carry no rail at all rather than an invented one.
8. **OG image type is Segoe UI, not Anek.** `sharp`/librsvg resolves SVG `font-family` against system fonts and will not honour an embedded `@font-face`. The card uses the system stack with weight + tracking for the condensed effect. If exact brand type in the OG card matters, it needs a real text-to-path step (out of scope here).
9. **Added `/fonts/*` cache header.** Small, unrequested, but a year-long immutable cache on a hashed-content font is the difference between the preload being free and being paid on every visit.

---

## 4. Self-review against the hard constraints

| Constraint | Status |
|---|---|
| Titles / descriptions / keywords / content / links / JSON-LD preserved | **Verified programmatically** against a HEAD baseline build — 37/37 pages identical on all four; 0 text removals |
| Gate / tests / tsc / build / links green | **Yes** (§2) |
| CSS-only budget, no new JS | **Yes** — zero script tags added; the only new markup is static HTML/SVG |
| No images except og/favicon/font | **Yes** — icons are inline SVG paths |
| Impersonation guard: no emblems, tricolour, seals | **Yes**; notice strip is persistent, top-of-page, and visually plain on every one of 37 pages |
| Caps runs ≤4 words | **Yes** — longest is "In Uttar Pradesh" / "About this site" / "Sourced & dated" (3) |
| Amber never as text except `#8A5A00` | **Yes** — `--ink-attention` is `#8A5A00` in light, `#FFC24B` in dark (11.59:1 on asphalt); `#F2A900` is used only as a 4px rail |
| One guide-sign board per page | **Yes** — `AnswerBox` is rendered once per template; `.answer-box`/`.panel` are visually distinct quiet panels |
| Rule of three skeuomorphs | **Yes** — board, plate, milestone. The gantry/chevrons/hazard-plate inherit palette + shape only, no bevels, no gradients-as-shading, no textures |
| Transitions ≤150ms, no keyframes | **Yes** — `--speed: 120ms`; zero `@keyframes` |
| Print / forced-colors / reduced-motion floors | **Yes**; print re-tokenises `:root` so boards become borders without a single hex in a component rule |
| 44px touch targets | Nav links, FAQ summaries, related links, action buttons, gantry entries all ≥44px (gantry 48px, actions 56px) |

### Known gaps / things worth a second look

- **No real device test.** Verified in desktop Chrome at 1512px and via the ≤480px CSS branch by inspection — the stacked-card table collapse has not been seen on an actual narrow viewport.
- **`CautionCallout` is unused.** Built to spec but nothing renders it until Chunk D. Its styles are therefore also untested in the browser.
- **`forced-colors: active` block is untested** — no Windows High Contrast pass was made; it is written to the standard pattern (re-express fills as `CanvasText` borders) but has not been observed.
- **The print stylesheet is untested in a print preview.** Same caveat.
- **Non-Latin glyphs fall back.** A handful of Kannada/Gujarati characters exist in the data (portal labels). They render in the system font; per the research, Anek Devanagari/other scripts are a later, `unicode-range`-gated addition.
- **Footer adds 21 internal links to every page.** Deliberate (a footer sitemap), and `check:links` passes, but it does shift the site's internal link graph — worth a glance from whoever reviews the AEO chunk.
