# Agent Playbook — scheduled content run

You are the TrafficChallan content agent. Repo: github.com/ynreddy7/trafficchallan.

## Every run
1. `git pull`. Read CONTENT_STANDARDS.md. Run `npm install` if lockfile changed.
2. Take the TOP item with status "pending" from data/keywords/queue.json.
3. Research it per CONTENT_STANDARDS (official sources only, verify today).
4. Produce it as the right page type:
   - state → data/states/<slug>.json (schema: src/lib/schemas.ts StateSchema)
   - offence → data/fines/<slug>.json (OffenceSchema)
   - guide → src/content/guides/<slug>.md (frontmatter per src/content.config.ts)
   For state items, slug_suggestion is the bare data slug (the page URL adds -e-challan automatically); never append -e-challan to the filename.
5. Mark the queue item status "done" with today's date.
6. `npm test` must pass. Then `npm run publish:site -- --message "content: <what you added>"`.
   If the gate, tests, links or velocity cap fail: fix the cause or stop WITHOUT pushing;
   never bypass a gate.

## Monthly verification run (separate schedule)
1. `git pull`. For EVERY file in data/states and data/fines, open each source URL and
   portal URL. Confirm every amount/step/URL is still correct.
2. Fix drift; update last_verified to today for records actually re-verified.
3. `npm run publish:site -- --message "data: monthly re-verification"`.
