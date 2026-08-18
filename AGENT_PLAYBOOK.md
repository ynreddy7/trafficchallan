# Agent Playbook — scheduled content run

You are the TrafficChallan content agent. Repo: github.com/ynreddy7/trafficchallan.

## Every run
1. `git pull`, then `npm run parked:drain` — a previous run may have been blocked by a
   gate and parked its finished work on the `content-queue` branch. Draining merges it
   in so this run publishes it instead of redoing it. If drain reports files, the queue
   items they cover are already marked done; take the next pending item.
   Read CONTENT_STANDARDS.md. Run `npm install` if lockfile changed.
2. Run the Discount watch (next section) BEFORE taking a queue item.
3. Take the TOP item with status "pending" from data/keywords/queue.json.
4. Research it per CONTENT_STANDARDS (official sources only, verify today). Legal-process
   content follows rule 13: statutes only from a same-day India Code fetch, BNSS 2023 (not
   CrPC) for procedure, no outcome predictions, and the not-legal-advice line on the page.
5. Produce it as the right page type:
   - state → data/states/<slug>.json (schema: src/lib/schemas.ts StateSchema)
   - offence → data/fines/<slug>.json (OffenceSchema)
   - guide → src/content/guides/<slug>.md (frontmatter per src/content.config.ts)
   For state items, slug_suggestion is the bare data slug (the page URL adds -e-challan automatically); never append -e-challan to the filename.
   City guides (slug convention `<city>-traffic-challan`, e.g. mumbai-traffic-challan):
   - Set `state_slug: <parent-state-slug>` in the frontmatter — the page then gets the
     state page as a breadcrumb level and a "Full <State> e-challan guide" related link.
   - Write ONLY city-specific H2s: which portal actually handles that city's challans,
     the city's traffic court / Lok Adalat venues and process, towing and tow-yard
     recovery, camera enforcement zones, and local helplines.
   - Never restate the parent state's generic check/pay steps — link to the state page
     for those instead.
   Items with type "guide-update" are NOT new pages: edit the existing guide named by
   slug_suggestion in src/content/guides/, add what the note asks for, re-verify the
   guide's facts against its sources and bump its frontmatter last_verified — no new
   file is created, so these do not count against the velocity cap.
6. Mark the queue item: set its "status" to "done" and add "completed": "YYYY-MM-DD" (today). (Items with status "covered" or "superseded" + "covered_by" were handled during curation — never produce them; skip to the next "pending" item.) Items with status "retired" are junk or out-of-scope clusters: runs never pick them up and never produce them.
7. `npm test` must pass. Then `npm run publish:site -- --message "content: <what you added>"`.
   If a gate, tests, links or the velocity cap fail: fix the cause, or stop. NEVER bypass a
   gate and never push to main yourself — publishing is publish.ts's job, past the gates.
   You do NOT need to rescue the work by hand: on a velocity-cap block publish.ts parks it
   automatically (commits it and pushes the `content-queue` branch, which is never
   deployed — Cloudflare Pages builds main only), and the next run drains it. If publish
   reports a fallback branch like `content-queue-<sha>`, the shared branch had moved and a
   human must merge that branch by hand — say so in your run summary.
   Do not `git commit` blocked work to main locally and stop: a scheduled run's sandbox is
   thrown away, so a local-only commit is the same as deleting the work. This happened on
   14 and 17 Aug 2026 — the 17th re-researched and re-lost the same Mumbai guide.

## Navigational queries, and keywords we already cover
Two whole classes of keyword look like content gaps and are not. Neither is ever fixed
with a new page. Read this before you take a queue item that "looks uncovered".

1. **Navigational queries — someone is trying to REACH an official portal or app.**
   Symptoms: a portal name ("echallan parivahan", "parivahan", "mparivahan", "vahan"),
   a misspelling of one ("echalan parivahan com"), a pasted URL or a URL typo
   ("https echallan parivahan gov in ind", "ttps echallan parivahan gov in"), or a bare
   "official website / app / link / site". These people are not looking for an article;
   they are looking for an address, and if we do not give them the right one a lookalike
   site will. They are served by **/echallan-parivahan/** — the portal directory that says
   which official address actually transacts each state's challans (legacy gov.in vs
   NextGen nic.in vs a state-run service) and which app the ministry itself links. Route
   them there: mark the queue item `covered` with `covered_by: echallan-parivahan`, and if
   the page does not yet carry the wording, add the wording TO THAT PAGE. Never build a
   second page for the same portal, a page per misspelling, or a page per URL typo — that
   is doorway spam, it breaks CONTENT_STANDARDS rules 5 and 15, and it competes with our
   own page. And never build the portal itself: rule 4 of the site's hard constraints —
   we explain government portals, we never look like one, host one, or transact with one.

2. **Keywords we already cover but do not say.** A gap report (Ubersuggest competitor gap,
   Search Console, a rank check) will list phrases we genuinely answer but never write in
   the reader's words — "challan check" on a page titled "How to Check an E-Challan",
   "online payment" on a page that says "pay online". The fix is PHRASING ON THE OWNING
   PAGE: retitle within the 60-character budget, or reword an existing H2 so it uses the
   searched words over content that already covers it. Never a duplicate page.
   Constraints when you do this:
   - Only reword a heading where the section ALREADY answers that query. Adding the words
     without the substance is keyword stuffing (rule 4). If nothing on the page covers it,
     it is a real gap — queue it as `pending`, do not fake it.
   - Retitling and rewording add no facts, so they do NOT bump `last_verified`
     (CONTENT_STANDARDS rule 2). Leave the date alone.
   - Check the old wording was not itself carrying a keyword before you replace it
     (`data/keywords/keyword-map.json` and the source CSV say what each page is assigned).
     Prefer adding words to a heading over swapping words out.
   - Do not force a long exact-match string into a heading if it will not read as English.
     Record in the queue note that you deliberately skipped it.
   Then mark the queue item `covered` with `covered_by` = the page that now carries the
   phrase, and say in the note which title or H2 does the carrying, so the next agent can
   verify it rather than trust it.

## Discount watch (every run, before the queue item)
The /challan-discount/ tracker is only worth existing if it is current. On EVERY run:

1. Re-verify every scheme in data/schemes/ with status `live`, `announced` or `rumour`
   against its listed sources AND the state government/police press pages. Update
   `last_verified` to today for each record actually re-checked. The gate enforces a
   14-day freshness window on these statuses — a stale volatile scheme blocks every
   publish until it is re-verified.
2. If a live scheme's window has ended: set status to `closed` and move the window
   into `history` with its sources.
3. A press report alone is NEVER status `live`. A scheme goes `live` or `announced`
   only with an official record of the order in sources — the G.O./gazette/circular
   URL itself, or an official/court record quoting it (a High Court order, a gazette
   index entry) — or, when no official record is online at all, with at least 2
   independent press sources naming the order. In every fallback or court-record
   case (the order text itself unread), the note must tell readers to confirm the
   figure on the official portal before paying. Until one of those holds, record it as `rumour`
   (or `proposal` if officially proposed) and never put its percentage in
   `percent_by_class` (the schema blocks it anyway). `closed`/historical
   percentages need order_ref (or the order named in the history entry) plus at
   least 2 independent corroborating press sources — official URL preferred; where
   a drive had no published order at all, the note must say so (mirrors
   CONTENT_STANDARDS rule 11).
4. Within 21 days of a National Lok Adalat sitting, check the Delhi token portal
   (traffic.delhipolice.gov.in/lokadalat/) and DSLSA notifications for that edition's
   exact token dates, caps and eligibility cutoff; update data/lok-adalat.json.
5. After the year's last sitting, add the next cycle's dates from the FIRST SLSA that
   publishes them, and cite that SLSA page in sources (NALSA publishes no forward
   calendar; the gate fails when no future sitting exists).
6. Scheme and lok-adalat date edits are UPDATES to data/schemes/ and
   data/lok-adalat.json — they never count against the velocity cap.

## Monthly verification run (separate schedule)
1. `git pull`, then `npm run parked:drain` (same reason as the content run: a blocked run
   may be holding finished work on the `content-queue` branch). For EVERY file in
   data/states and data/fines, open each source URL and portal URL. Confirm every
   amount/step/URL is still correct.
2. Same for data/schemes/*.json and data/lok-adalat.json: every scheme (all statuses,
   including `closed` and `none`) and every sitting/token fact is re-checked against
   its sources this run.
3. When data/rto exists: sample-verify 5 codes in each of 3 states against the official
   state transport list (or official RTO office pages where no list is published),
   rotating which 3 states are sampled each month.
4. Fix drift; update last_verified to today for records actually re-verified.
   If you bump `last_verified` in data/official-portals.json, re-check its
   `official_app` block against parivahan.gov.in the SAME day and set
   `official_app.verified_on` too — tests/portals-data.test.ts asserts the app
   date is never older than the file date, so a file-only bump fails `npm test`
   and aborts the publish.
5. `npm run publish:site -- --message "data: monthly re-verification"`.
