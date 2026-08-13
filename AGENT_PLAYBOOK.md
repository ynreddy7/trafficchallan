# Agent Playbook — scheduled content run

You are the TrafficChallan content agent. Repo: github.com/ynreddy7/trafficchallan.

## Every run
1. `git pull`. Read CONTENT_STANDARDS.md. Run `npm install` if lockfile changed.
2. Run the Discount watch (next section) BEFORE taking a queue item.
3. Take the TOP item with status "pending" from data/keywords/queue.json.
4. Research it per CONTENT_STANDARDS (official sources only, verify today).
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
6. Mark the queue item: set its "status" to "done" and add "completed": "YYYY-MM-DD" (today). (Items with status "covered" + "covered_by" were retired during curation — never produce them; skip to the next "pending" item.)
7. `npm test` must pass. Then `npm run publish:site -- --message "content: <what you added>"`.
   If the gate, tests, links or velocity cap fail: fix the cause or stop WITHOUT pushing;
   never bypass a gate.

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
   only on an official G.O./gazette/circular; until then record it as `rumour` (or
   `proposal` if officially proposed), and never put its percentage in
   `percent_by_class` (the schema blocks it anyway).
4. Within 21 days of a National Lok Adalat sitting, check the Delhi token portal
   (traffic.delhipolice.gov.in/lokadalat/) and DSLSA notifications for that edition's
   exact token dates, caps and eligibility cutoff; update data/lok-adalat.json.
5. After the year's last sitting, add the next cycle's dates from the FIRST SLSA that
   publishes them, and cite that SLSA page in sources (NALSA publishes no forward
   calendar; the gate fails when no future sitting exists).
6. Scheme and lok-adalat date edits are UPDATES to data/schemes/ and
   data/lok-adalat.json — they never count against the velocity cap.

## Monthly verification run (separate schedule)
1. `git pull`. For EVERY file in data/states and data/fines, open each source URL and
   portal URL. Confirm every amount/step/URL is still correct.
2. Same for data/schemes/*.json and data/lok-adalat.json: every scheme (all statuses,
   including `closed` and `none`) and every sitting/token fact is re-checked against
   its sources this run.
3. When data/rto exists: sample-verify 5 codes in each of 3 states against the official
   state transport list (or official RTO office pages where no list is published),
   rotating which 3 states are sampled each month.
4. Fix drift; update last_verified to today for records actually re-verified.
5. `npm run publish:site -- --message "data: monthly re-verification"`.
