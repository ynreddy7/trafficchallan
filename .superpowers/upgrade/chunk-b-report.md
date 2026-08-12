# Chunk B report — feature islands + /compare/

Date: 2026-08-13. Branch: main (pulled clean onto 9a85664 before starting — Chunk A's
design-system commit). This chunk builds on Chunk A's tokens/components exactly as
instructed: no new hex colors, no new fonts. All new CSS reuses existing `var(--*)` role
tokens defined in `src/styles/global.css`.

## What was built

1. **Vehicle-number → portal finder** (homepage, `src/pages/index.astro` + new
   `src/lib/portal-finder.ts`). Replaces the static "Find your challan portal" shell with a
   working client-side island: a form (input + submit button, works on Enter), a pure
   `resolveVehicleInput()` function that parses either a vehicle registration
   (`MH12AB1234`, spaces/hyphens ignored, case-insensitive) or a typed state name (min 3
   chars, exact then prefix match), and a result panel with three branches — covered state
   (portals + scope chips + one-line court-challan note + link to the full state page),
   known-but-uncovered RTO code (honest fallback linking both national portals), or invalid
   input. The static two-portal fallback paragraph is preserved inside `<noscript>`.

2. **Calculator upgrade** (`src/pages/calculator.astro` + `src/lib/fine-calc.ts`). Single
   `<select>` replaced with a checkbox list of all 10 offences (state select + repeat
   checkbox kept). Itemised results render per selected offence; a new pure
   `totalFines()` function sums them only when every line resolves to a single determinate
   ₹ figure, otherwise showing "Total: not a single figure — includes court-decided or
   range amounts" rather than a fake sum. State is round-tripped through
   `?o=slug1,slug2&s=state&r=1` via `history.replaceState` on every change, restored on
   load. A "Copy link" button uses `navigator.clipboard` with `textContent` feedback and a
   try/catch fallback. A static, JS-independent "Every fine at a glance" `FineTable` sits
   below the island as the AEO/no-JS fallback.

3. **`/compare/` page** (new `src/pages/compare.astro`). Static page, one row per offence,
   columns: Central (MV Act) + one column per state that actually carries a fine override
   (derived dynamically from `fine_overrides`, ordered Delhi/Maharashtra/Karnataka/
   Gujarat/Tamil Nadu/Andhra Pradesh/West Bengal/Uttar Pradesh/Rajasthan/Haryana per spec,
   any future override-bearing state appended alphabetically). Cells show the first clause
   of the amount text (new pure `firstClause()` helper, splits at whichever of `" ("`,
   `"—"`, `";"` occurs earliest) with a "details" link to the offence page, or "Standard".
   Sticky first column + horizontal scroll via `.table-wrap`. Dataset JSON-LD via the
   existing `datasetJsonLd()`, breadcrumbs, description 159/160 chars. A footnote names the
   3 states with zero overrides (J&K, MP, Telangana) so their absence from the column list
   reads as "national default", not an omission. Linked from the homepage's and fines
   hub's intro copy. `FineTable` gained an optional `compact` prop (Offence + First offence
   only); used on the homepage's "Common traffic fines" table per spec, state pages
   unchanged.

New supporting CSS in `global.css`: `.chip`/`.chip--check|pay|both` (text-only, bordered
with `currentColor`, never a fill — keeps green inline-only per Chunk A's signage rules),
`.finder-form`/`.finder-result`, `.compare-table` sticky-column rules. All built from
existing tokens (`--link`, `--ink-attention`, `--status-ok`, `--surface*`, `--rule*`) —
zero new color literals.

## TDD evidence (raw)

All three pure-logic modules were written test-first: the test file was authored against
the target signature before the implementation existed, then the implementation was
written to satisfy it. Full raw `vitest --reporter=verbose` output for the three new/
extended suites:

```
✓ tests/format.test.ts > shortSection > removes statute name and amendment history
✓ tests/format.test.ts > shortSection > handles section with multiple references
✓ tests/format.test.ts > shortSection > handles section with Explanation clause
✓ tests/format.test.ts > shortSection > handles text without comma
✓ tests/format.test.ts > shortSection > returns as-is if no comma present (edge case)
✓ tests/format.test.ts > firstSentence > cuts at the first period followed by whitespace
✓ tests/format.test.ts > firstSentence > does not break on a period inside a URL with no trailing space
✓ tests/format.test.ts > firstSentence > returns the whole text when there is no sentence-ending period
✓ tests/format.test.ts > firstSentence > returns the whole text when it is a single sentence ending the string
✓ tests/format.test.ts > firstClause > splits at the first " ("
✓ tests/format.test.ts > firstClause > splits at the first em dash
✓ tests/format.test.ts > firstClause > splits at the first semicolon
✓ tests/format.test.ts > firstClause > picks whichever delimiter occurs earliest
✓ tests/format.test.ts > firstClause > returns the trimmed whole text when no delimiter is present
✓ tests/portal-finder.test.ts > resolveVehicleInput > parses a full vehicle registration number
✓ tests/portal-finder.test.ts > resolveVehicleInput > is case-insensitive on a vehicle registration number
✓ tests/portal-finder.test.ts > resolveVehicleInput > resolves a bare RTO code
✓ tests/portal-finder.test.ts > resolveVehicleInput > matches a typed state name exactly
✓ tests/portal-finder.test.ts > resolveVehicleInput > matches a typed state name by prefix (min 3 chars)
✓ tests/portal-finder.test.ts > resolveVehicleInput > flags a known-but-uncovered RTO code as unknown-code
✓ tests/portal-finder.test.ts > resolveVehicleInput > returns invalid for nonsense input
✓ tests/portal-finder.test.ts > resolveVehicleInput > returns invalid for empty input
✓ tests/portal-finder.test.ts > resolveVehicleInput > returns invalid for whitespace-only input
✓ tests/portal-finder.test.ts > resolveVehicleInput > ignores spaces and hyphens in a vehicle registration number
✓ tests/portal-finder.test.ts > resolveVehicleInput > flags every documented known-but-uncovered code
✓ tests/portal-finder.test.ts > resolveVehicleInput > is case-insensitive for a known-but-uncovered code
✓ tests/fine-calc.test.ts > computeFine > returns base fine with no state
✓ tests/fine-calc.test.ts > computeFine > returns repeat fine when repeat=true
✓ tests/fine-calc.test.ts > computeFine > state override wins over base and repeat
✓ tests/fine-calc.test.ts > totalFines > sums two determinate single-figure amounts
✓ tests/fine-calc.test.ts > totalFines > parses a leading amount past a trailing descriptive clause (override text)
✓ tests/fine-calc.test.ts > totalFines > parses a leading amount past a trailing prose clause
✓ tests/fine-calc.test.ts > totalFines > returns null when any line is a dash-connected range
✓ tests/fine-calc.test.ts > totalFines > returns null when any line is a "to"-connected range
✓ tests/fine-calc.test.ts > totalFines > returns null when any line is a court-decided amount with no leading figure
✓ tests/fine-calc.test.ts > totalFines > returns null when any line does not lead with a rupee figure
✓ tests/fine-calc.test.ts > totalFines > is vacuously determinate with a zero total for no selected offences

 Test Files  3 passed (3)
      Tests  37 passed (37)
```

`resolveVehicleInput` (12 tests) and `totalFines` (8 new tests) both passed on the first
run against their implementations — the required spec test matrix
(`MH12AB1234→maharashtra; ts09ea5555→telangana; TG→telangana; "karnataka"→karnataka;
"Kar"→karnataka; KL01→unknown-code KL; "xx"→invalid; empty→invalid; "MH 12 AB 1234"→
maharashtra`) is covered verbatim plus hyphen-separated input and every documented
known-but-uncovered code. `totalFines` covers the three named cases (determinate sum;
range → null; override text with a trailing clause still parses) plus a court-decided
case, a "does not lead with ₹" case, and the empty-array edge.

## Verification (raw output, this session)

```
$ npm run gate
gate: all quality gates passed

$ npx vitest run
 Test Files  11 passed (11)
      Tests  74 passed (74)      # 45 pre-existing + 29 new (12 portal-finder, 8 totalFines, 9 firstSentence/firstClause)

$ npx tsc --noEmit
(no output — clean)

$ npm run build
...
[build] 38 page(s) built in 1.37s
[build] Complete!

$ npm run check:links
internal: 38 page(s), 1291 link(s) checked, 0 broken
check-links: all checks passed
```

## Manual verification

`npm run preview` + curl:
- `/` (200), `/compare/` (200), `/calculator/` (200).
- Homepage: `id="finder-form"`, `id="portal-finder"`, `<noscript>` fallback, chip markup,
  `finder-data` JSON payload (14 RTO-code rows including both TS and TG → telangana) all
  present in server-rendered HTML. "Common traffic fines" table confirmed compact
  (`<th>Offence</th><th>First offence</th>` only, no Section/Repeat/state column).
- `/compare/`: H1 "Traffic fines by state: side-by-side", `<title>` "Compare Traffic
  Fines Across Indian States", 10 state `<th>` columns in the specified order, 56
  `class="details"` links + 44 "Standard" cells = 100 cells (10 offences × 10 states),
  matching the state fine_overrides counts in `data/states/*.json`.
- `/calculator/`: 11 `.offence-check` elements found (10 offence checkboxes — the 11th
  match includes the CSS class selector string itself in the count, actual DOM count is
  10), `id="copy-link"` present, "Every fine at a glance" static table present.

Live browser pass (Chrome via claude-in-chrome, console-error-free throughout):
- Portal finder: typed `MH12AB1234` → resolved to Maharashtra, rendered all 4 portals with
  correct `CHECK`/`BOTH` scope chips and the `↗` external-link marker. Typed `KL01` →
  unknown-code fallback rendered both `echallan.parivahan.gov.in` and
  `echallan.parivahan.nic.in` links. Typed `xx` → "We couldn't recognise that…" message.
  Both Enter-key submit and button-click submit work.
- Calculator: checked "Riding without a helmet" + "Overspeeding" → itemised lines correct,
  total correctly reads "not a single figure — includes court-decided or range amounts"
  (overspeeding's base text is a range that doesn't lead with ₹). Checked "Riding without a
  helmet" + "Driving without a seat belt" instead → Total: ₹2,000 (1,000 + 1,000), correct.
  Fresh-loaded `/calculator/?o=driving-without-helmet,drunk-driving&s=delhi&r=1` correctly
  restored both checkboxes, State=Delhi, Repeat=checked, rendered Delhi's court-challan
  override for drunk-driving with a "STATE-NOTIFIED" tag, and the honest non-numeric total.
  URL stayed in sync (`history.replaceState`) on every checkbox/select toggle observed.
- Compare page: sticky first column verified by scrolling the table horizontally —
  "Offence" column (with its `/fines/<slug>/` link) stayed pinned while West
  Bengal/Uttar Pradesh/Rajasthan/Haryana scrolled under it.
- One screenshot during this session showed a corrupted repeated-tile render; a page
  reload immediately after rendered cleanly with all form/URL state intact, and it
  coincided with several `CDP Page.captureScreenshot` timeouts from the automation tool
  itself — treated as a renderer/automation artifact, not a site defect (there is no code
  path in this chunk that could tile a button across the page).

## Decisions / things deliberately left alone

- **`computeFine`'s override-ignores-repeat behaviour and calculator.astro's missing
  `overrideSource` render** (both flagged in `.superpowers/upgrade/research.json`'s
  static-feasibility notes as pre-existing defects) were **not** touched. Neither is in
  this chunk's brief, and "fixing" the override/repeat interaction would need a schema
  change (state overrides have no repeat-specific amount) that's out of scope; the existing
  `tests/fine-calc.test.ts` test (`state override wins over base and repeat`) already
  encodes the current behaviour as intended, so changing it would be a silent scope
  expansion into someone else's contract.
- **RTO-code parsing heuristic** in `resolveVehicleInput`: a 2-letter prefix is only
  treated as a candidate code if the input is exactly 2 characters (bare code) or the 3rd
  character is a digit (`MH12...`, `KL01`) — this is what lets `"Kar"` fall through to the
  state-name prefix matcher instead of being misread as an incomplete code, while `"TG"`
  and `"MH12AB1234"` are both still recognised.
- **`totalFines`** only escapes to "range" on an *immediate* dash/`to`-continuation right
  after the parsed number (e.g. `₹1,000-2,000`, `₹1,000 to ₹2,000`); a trailing descriptive
  clause with unrelated numbers further on (e.g. the seat-belt offence's second ₹1,000 for
  a child passenger) is intentionally still summed from its leading figure only, per the
  literal spec wording ("parse leading ₹N,NNN"). Text that doesn't open with `₹` at all
  (court-decided text, "First offence: imprisonment…" statutory wording, and one state's
  "Rs" instead of "₹") is always non-determinate — this was verified to be the *safe*
  behaviour (no fake precision) rather than a bug, given real data in `data/states/*.json`.
- **`firstClause`/`firstSentence`** were added to `src/lib/format.ts` (existing home for
  `shortSection`, same "pure text-formatting helper" shape) rather than new files, and were
  tested against real strings pulled from the actual data files (Gujarat/Madhya Pradesh/
  West Bengal court_challan_process text, whose embedded domains like `vcourts.gov.in`
  would break a naive "first period" split — confirmed by inspecting all 13 states'
  opening sentences before writing the regex).
- **Compare-page column order** is the spec-given canonical list, with any future
  override-bearing state appended alphabetically — chosen so a later data addition doesn't
  silently break the intended reading order.
- **No new CSS colors or fonts**: `.chip`, `.finder-*`, `.compare-table` sticky rules all
  reference existing `--*` tokens from Chunk A. `.chip--both` uses `--status-ok` (green)
  as a bordered/text-only chip, honoring Chunk A's rule that green stays inline-only and
  is never a panel fill.
- **External-link marker**: a small `↗` (aria-hidden) appended after portal-link text in
  the finder result panel, satisfying "visibly external" without inventing new iconography
  or color.

## Files touched

- New: `src/lib/portal-finder.ts`, `src/pages/compare.astro`, `tests/portal-finder.test.ts`
- Modified: `src/lib/fine-calc.ts`, `src/lib/format.ts`, `src/components/FineTable.astro`,
  `src/pages/index.astro`, `src/pages/calculator.astro`, `src/pages/fines/index.astro`,
  `src/styles/global.css`, `tests/fine-calc.test.ts`, `tests/format.test.ts`
- Ledger: `.superpowers/upgrade/ledger.md` updated with Chunk B completion entry.
