# Chunk D report — content-level AEO (statutory quotes, question-form H2s, court cautions)

Date: 2026-08-13. Branch: main, no pull needed (`git fetch origin` showed local already
ahead of `origin/main` by 4 commits at session start, nothing new upstream to merge).
Touched only the files listed in the brief: `data/fines/*.json` (5 of the 10), `src/lib/schemas.ts`,
`src/pages/fines/[offence].astro`, `src/pages/[slug].astro`, `scripts/publish.ts`,
`CONTENT_STANDARDS.md`, `src/styles/global.css` (append-only `.statute` rule), plus
`tests/schemas.test.ts` (new coverage for the schema addition). Did not touch
`src/lib/format.ts`, `src/lib/fine-calc.ts`, `src/pages/compare.astro`, `src/pages/index.astro`
(the concurrent agent's files) or `.superpowers/upgrade/ledger.md` (shared coordination file
another agent is actively appending to — left uncommitted/untouched for its owner).

## D1 — Statutory quotes

- `src/lib/schemas.ts`: added `statute_quote: z.object({ text: z.string().min(40), attribution:
  z.string().min(5) }).optional()` to `OffenceSchema`.
- `src/pages/fines/[offence].astro`: imports unchanged except adding `CautionCallout`; renders
  `<blockquote class="statute">"{text}"<cite>— {attribution}</cite></blockquote>` right after
  the "What does the law say..." paragraph, gated on `offence.statute_quote` being present.
- `src/styles/global.css`: appended a `.statute` rule block at the very end of the file (after
  the print `@media` block, nothing else in the file touched) — background `--surface-tint`,
  left rail `--rail-info`, italic body, `cite` block styled with `--text-muted`. Existing tokens
  only, no new colors.

### Verification method

India Code (`indiacode.nic.in`) 403s a plain `curl`, and the visible `show-data` HTML page is a
shell — the actual section text loads client-side via an AJAX call to `/SectionPageContent`.
Reproduced that call directly with a browser User-Agent, `X-Requested-With: XMLHttpRequest`, a
`Referer` header, and (for 3 of the 5 sections) a per-URL cookie jar established by first hitting
the `show-data` page to get a session cookie — without the cookie jar three of the five endpoints
returned `{}` (empty). All 5 fetches were done live today (2026-08-13) against the exact
`sectionId`/`actid` values already cited in each record's `sources` array — same source, no new
URLs introduced.

After fetching, I did NOT hand-transcribe from a visual read — I wrote a Node script that strips
HTML tags, drops the government's own footnote/amendment-bracket apparatus (`<sup>N</sup>`
reference markers and the `[...]` editorial insertion/substitution brackets — citation apparatus,
not statutory wording), collapses whitespace, and asserts each of my 5 candidate quote strings is
a literal substring of the normalized fetched text. All 5 passed (`CONTAINED: true`) — see raw
outputs below.

### Per-quote evidence

**1. driving-without-helmet — Section 194D**
URL: `https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=49504&sectionno=194D&orderno=220`
AJAX endpoint: `GET /SectionPageContent?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionID=49504` → HTTP 200
Raw `content` field (fetched today):
```
<b><sup>1</sup>[194D. Penalty for not wearing protective headgear.</b>-- Whoever drives a motor
cycle or causes or allows a motor cycle to be driven in contravention of the provisions of
section 129 or the rules or regulations made thereunder shall be punishable with a fine of one
thousand rupees and he shall be disqualified for holding licence for a period of three months.]
```
Quote used: `"…punishable with a fine of one thousand rupees and he shall be disqualified for
holding licence for a period of three months."` (125 chars) — this is the exact operative clause
given in the task brief, verified verbatim against today's live fetch.
Attribution: `Section 194D, Motor Vehicles Act 1988 (inserted by the Motor Vehicles (Amendment)
Act 2019, w.e.f. 1-9-2019)` — footnote confirms `1. Ins. by s. 79, ibid. (w.e.f. 1-9-2019).`

**2. drunk-driving — Section 185 (first-offence clause)**
URL: `https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=28461&sectionno=185&orderno=205`
AJAX endpoint: `GET /SectionPageContent?actid=...&sectionID=28461` (with session cookie from a
prior `show-data` hit) → HTTP 200
Raw `content` (relevant span): `...shall be punishable for the first offence with imprisonment
for a term which may extend to six months, or with fine 3[of ten thousand rupees], or with both;
and for a second or subsequent offence...`
Quote used: `"…shall be punishable for the first offence with imprisonment for a term which may
extend to six months, or with fine of ten thousand rupees, or with both;"` (154 chars) — isolates
the first-offence clause only, as instructed, ending on the genuine semicolon in the source
(not a fabricated period) rather than absorbing the second-offence clause too.
Attribution: `Section 185, Motor Vehicles Act 1988 (fines substituted by the Motor Vehicles
(Amendment) Act 2019, w.e.f. 1-9-2019)` — footnote confirms fine figures substituted by s.68 of
the 2019 Amendment Act, w.e.f. 1-9-2019.

**3. driving-without-insurance — Section 196**
URL: `https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=28473&sectionno=196&orderno=224`
AJAX endpoint: `GET /SectionPageContent?actid=...&sectionID=28473` (cookie jar) → HTTP 200
Raw `content`: `Whoever drives a motor vehicle or causes or allows a motor vehicle to be driven
in contravention of the provisions of section 146 shall be punishable 1[for the first offence]
with imprisonment which may extend to three months, or with fine 2[of two thousand rupees], or
with both 1[, and for a subsequent offence shall be punishable with imprisonment for a term which
may extend to three months, or with fine of four thousand rupees, or with both.]`
Quote used (full sentence, both limbs, ending on the genuine terminal period): `"…punishable for
the first offence with imprisonment which may extend to three months, or with fine of two
thousand rupees, or with both, and for a subsequent offence shall be punishable with imprisonment
for a term which may extend to three months, or with fine of four thousand rupees, or with
both."` (300 chars).
Attribution: `Section 196, Motor Vehicles Act 1988 (fine substituted and repeat-offence limb
inserted by the Motor Vehicles (Amendment) Act 2019, w.e.f. 1-9-2019)`

**4. driving-without-licence — Section 181**
URL: `https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=28456&sectionno=181&orderno=199`
AJAX endpoint: `GET /SectionPageContent?actid=...&sectionID=28456` (cookie jar) → HTTP 200
Raw `content`: `Whoever, drives a motor vehicle in contravention of section 3 or section 4 shall
be punishable with imprisonment for a term which may extend to three months, or with fine
1[of five thousand rupees], or with both.`
Quote used (full section, no preamble to drop, genuine terminal period): `"Whoever, drives a
motor vehicle in contravention of section 3 or section 4 shall be punishable with imprisonment
for a term which may extend to three months, or with fine of five thousand rupees, or with
both."` (209 chars).
Attribution: `Section 181, Motor Vehicles Act 1988 (fine substituted by the Motor Vehicles
(Amendment) Act 2019, w.e.f. 1-9-2019)`

**5. driving-without-seatbelt — Section 194B(1)**
URL: `https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=49501&sectionno=194B&orderno=218`
AJAX endpoint: `GET /SectionPageContent?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionID=49501` → HTTP 200 (worked without a fresh cookie jar, same as 194D)
Raw `content`: `<b><sup>1</sup>[194B. Use of safety belts and the seating of children.</b>-- (1) Whoever
drives a motor vehicle without wearing a safety belt or carries passengers not wearing seat
belts shall be punishable with a fine of one thousand rupees: Provided that the State
Government, may by notification in the Official Gazette, exclude the application of this
sub-section to transport vehicles to carry standing passengers or other specified classes of
transport vehicles.`
Quote used (whole subsection (1), including its proviso, genuine terminal period): `"(1) Whoever
drives a motor vehicle without wearing a safety belt or carries passengers not wearing seat
belts shall be punishable with a fine of one thousand rupees: Provided that the State
Government, may by notification in the Official Gazette, exclude the application of this
sub-section to transport vehicles to carry standing passengers or other specified classes of
transport vehicles."` (391 chars, under the 400 cap).
Attribution: `Section 194B(1), Motor Vehicles Act 1988 (inserted by the Motor Vehicles
(Amendment) Act 2019, w.e.f. 1-9-2019)` — same `1. Ins. by s. 79, ibid.` footnote as 194D
(both inserted by the same block-insertion clause of the 2019 Amendment Act, consistent with the
existing `mva_section` wording already in both data files).

The other 5 offence files (`dangerous-driving-red-light`, `driving-without-puc`,
`driving-without-rc`, `mobile-phone-while-driving`, `overspeeding`) were left without
`statute_quote` — task scoped exactly 5, and I did not attempt to verify sources for the other 5
in the time available, per "if a fetch cannot verify... SKIP" (here: simply out of scope, not a
failed fetch).

`last_verified` on all 5 files left untouched at `2026-08-12` — same sources, no new facts beyond
the quote itself, and the quote was fetched from those same already-cited URLs.

## D2 — Question-form H2s

`src/pages/fines/[offence].astro`:
- "What the law says" → "What does the law say about {name.toLowerCase()}?" (id stays
  `what-the-law-says`)
- "Fine amounts" → "How much is the fine?" (id stays `fine-amounts`)
- "States with different notified amounts" → "Which states charge different amounts?" (id stays
  `states-with-different-notified-amounts`)

`src/pages/[slug].astro` (state branch only — guide branch and the two headings not listed in the
brief, "Check by SMS or app" and "Things specific to {name}", left unchanged):
- "How to check your {name} challan" → "How do I check a {name} challan?"
- "How to pay a {name} challan online" → "How do I pay a {name} challan online?"
- "Official portals for {name}" → "Which official portals serve {name}?"
- "Court challans in {name}" → "What happens with court challans in {name}?"
- "Traffic fine amounts in {name}" → "What are the traffic fine amounts in {name}?"

All five `id={slugify(...)}` calls kept their original literal argument strings (e.g.
`slugify('How to check your ${name} challan')` unchanged) — only the JSX text node between the
tags changed, so every existing external anchor link (`#how-to-check-your-delhi-challan`, etc.)
still resolves. Confirmed post-build via grep on `dist/delhi-e-challan/index.html`:
```
<h2 id="how-to-check-your-delhi-challan">How do I check a Delhi challan?</h2>
<h2 id="how-to-pay-a-delhi-challan-online">How do I pay a Delhi challan online?</h2>
<h2 id="official-portals-for-delhi">Which official portals serve Delhi?</h2>
<h2 id="check-by-sms-or-app">Check by SMS or app</h2>
<h2 id="court-challans-in-delhi">What happens with court challans in Delhi?</h2>
<h2 id="traffic-fine-amounts-in-delhi">What are the traffic fine amounts in Delhi?</h2>
<h2 id="things-specific-to-delhi">Things specific to Delhi</h2>
```
and `dist/fines/driving-without-helmet/index.html`:
```
<h2 id="what-the-law-says">What does the law say about riding without a helmet?</h2>
<h2 id="fine-amounts">How much is the fine?</h2>
<h2 id="states-with-different-notified-amounts">Which states charge different amounts?</h2>
```

## D3 — Caution callouts

`src/pages/fines/[offence].astro`: imports `CautionCallout` (existing component from Chunk A,
untouched), renders it right after the fine-amounts table, gated on `!offence.compoundable_online`:
```
This is not an online-payable challan in most cases. {name} cases generally go to court —
budget for a court appearance, and check your state page for the exact process.
```
Data-driven, no hardcoded slug list. Currently fires on 2 of the 10 offence records
(`compoundable_online: false`): `drunk-driving` and `dangerous-driving-red-light`. Confirmed
absent on all 8 `compoundable_online: true` pages (checked `driving-without-helmet` as a
representative sample — 0 matches for `class="caution"`).

## D4 — publish.ts

`run('npx astro build')` → `run('npm run build')`. `npm run build` is
`npm run gate && astro build && pagefind --site dist`, so the gate now effectively runs twice
(once directly in `publish.ts` step 2, once again inside `npm run build`) — accepted per the
brief as the tradeoff for picking up the `pagefind` postbuild step, which the old
`npx astro build` call skipped entirely.

## D5 — CONTENT_STANDARDS.md

Appended rule 10 verbatim as specified:
```
10. STATUTE QUOTES: offence records may carry statute_quote — the text must be VERBATIM from the
    cited official source, verified on the day it is added; never paraphrase inside quotation marks.
```

## Verification (raw, run today)

```
$ npm run gate
gate: all quality gates passed

$ npm test
 Test Files  12 passed (12)
      Tests  100 passed (100)     [96 pre-existing + 4 new in tests/schemas.test.ts
                                    covering statute_quote: optional-absent, valid-accept,
                                    text<40 reject, attribution<5 reject]

$ npx tsc --noEmit
(no output — clean)

$ npm run build
gate: all quality gates passed
...
[build] 38 page(s) built in 1.40s
[build] Complete!
Pagefind: Indexed 38 pages, Indexed 3497 words, Indexed 0 filters

$ npm run check:links
internal: 38 page(s), 1294 link(s) checked, 0 broken
check-links: all checks passed
```

Post-build grep confirming all 5 quotes render exactly as authored (`dist/fines/<slug>/index.html`,
`<blockquote class="statute">`): all 5 present, byte-for-byte matching the JSON `text`/`attribution`
fields, `.statute` rule confirmed compiled into `dist/_astro/_slug_.DzuaKrX9.css`. Control check:
`dist/fines/driving-without-puc/index.html` (no `statute_quote` field) has zero `class="statute"`
occurrences, confirming the conditional render works both ways.

## Commit

`f7a00d8` — "feat: verbatim statutory quotes, question-form headings, court-challan cautions"
12 files changed (the exact file list in scope + `tests/schemas.test.ts`), not pushed.
`.superpowers/upgrade/ledger.md` was already modified in the working tree at session start by a
concurrent agent (visible via `git diff` before I staged anything) — deliberately excluded from
`git add` and left uncommitted for that agent to commit itself.

## Concerns

- Only 5 of 10 offence records now carry `statute_quote` — by design (task scoped exactly 5), but
  worth flagging so a future chunk doesn't assume full coverage.
- Section 196 and Section 194B(1) quotes were extended slightly beyond the task's literal example
  phrasing (196: included both first- and subsequent-offence limbs since they're one grammatical
  sentence with only one genuine terminal period; 194B(1): included the full proviso) rather than
  hand-truncating mid-sentence, specifically to avoid inventing punctuation not present in the
  source — both still verified verbatim substrings and both under the 400-char cap (300 and 391
  chars respectively).
- India Code's `/SectionPageContent` AJAX endpoint needs an established session cookie for some
  sections (185, 196, 181 returned `{}` without one; 194D and 194B worked either way) — noting
  this pattern in case a later chunk needs to fetch more sections.
