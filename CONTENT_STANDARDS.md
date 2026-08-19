# Content Standards — TrafficChallan

1. FACTS: Every fine amount, legal section, portal URL, and process claim MUST cite an
   official source (parivahan.gov.in, state transport/police portals, indiacode.gov.in,
   gazette notifications, morth.nic.in, PIB, vcourts.gov.in). Blogs, news aggregators and
   other challan sites are NEVER sources for facts.
2. VERIFY, THEN WRITE: Open the source and confirm the fact TODAY before writing it.
   Set last_verified to today's date only if you actually verified today.
3. ANSWER FIRST: Every page opens with a direct answer to its target_keyword. The answer
   board (blue board / answer-box) carries at most two sentences (~45 words) — the direct
   answer only; supporting detail goes in the first paragraph immediately below the board.
4. NO FILLER: No "in today's fast-paced world" openers, no padded intros, no repeated
   sections, no keyword stuffing. If a section adds no information, delete it.
5. ONE INTENT, ONE PAGE: Before creating a page, check the target_keyword does not overlap
   an existing page (the gate enforces exact dupes; you enforce near-dupes).
6. BYLINE: Team TrafficChallan. Never invent an author.
7. VELOCITY: Max 5 NEW pages per calendar week (publish pipeline enforces; do not use
   --force-velocity). The cap governs routine-produced pages — the states/fines/guides
   pages publish.ts counts — while owner-built feature pages ship outside it by design.
8. UPDATES BEAT ADDITIONS: If a fact changed (portal moved, fine revised), fixing existing
   records takes priority over new content.
9. HONESTY: If a state's process is genuinely unclear or its portal is down, say so on the
   page rather than inventing certainty.
10. STATUTE QUOTES: offence records may carry statute_quote — the text must be VERBATIM from the
    cited official source, verified on the day it is added; never paraphrase inside quotation marks.
11. SCHEMES (two tiers):
    - LIVE/ANNOUNCED: a percentage requires an official record of the order in the record's
      sources — the G.O./circular URL itself, or an official/court record quoting it (a High
      Court order, a gazette index entry). Where no official record is online at all, the
      fallback is at least 2 independent press sources naming the order. In every fallback or
      court-record case (the order text itself unread), the note must tell readers to confirm
      the figure on the official portal before paying.
    - CLOSED/HISTORICAL: a percentage requires order_ref (or the order named in the history
      entry) plus at least 2 independent corroborating press sources; an official URL is still
      preferred. Where a drive was announced with no published order at all (some states
      announce via press briefing only), the note must say so explicitly.
    A percentage circulating with none of the above = status "rumour", named as a rumour on
    the page, with the fact-check cited. Lok Adalat outcomes are decided by the bench case by
    case — never publish a predicted Lok Adalat percentage anywhere.
12. DIRECTORY DATA CLASS (RTO code lists): where the state transport department publishes a
    fetchable official list, that list is the source of record (verification method "full");
    where it does not, verify a sample against official RTO office pages and disclose the
    method and sample per state ON the page (verification method "sampled").
13. LEGAL CONTENT: a statute is cited ONLY after fetching the section text from India Code
    the same day — quote verbatim or paraphrase WITH the section number; never cite a
    section from blogs or memory.
    India Code moved to `indiacode.gov.in` — every deep path on the old `indiacode.nic.in`
    now 404s, and the new site is an Angular shell, so fetch the text from its DSpace API:
    `indiacode.gov.in/server/api/discover/search/objects?query=dc.identifier.section_id:NNNNN`
    returns the item, whose `dc.identifier.section_page_note` is the section body. The old
    `?sectionId=` value IS the new `dc.identifier.section_id`, so a legacy link can be
    remapped and then VERIFIED by checking `act_id` and `section_number` both still match.
    Indian Kanoon is a valid source for JUDGMENTS but can serve SUPERSEDED statute text —
    it still carried the 2019 wording of MV Act s.200 in August 2026, eight months after
    Act 18 of 2023 replaced it (w.e.f. 13-01-2025). For statute text India Code wins; where
    the two disagree, publish India Code and say nothing from Indian Kanoon.
    Procedure in 2026 cites the BNSS 2023, not the repealed
    CrPC; a BNSS section number that cannot be verified from a primary source is not cited
    (describe the step generically instead — "the court may issue a summons"). Judgments
    are cited only from the judgment text itself (indiankanoon.org or the court site),
    with the citation as printed in the fetched text, and holdings stated narrowly. Never
    predict what a court will do, never advise skipping a court date or evading service,
    and never declare a specific message or domain "genuine" for a reader's case — myths
    are countered by stating what IS documented, not with counter-predictions. Every
    legal-process page visibly carries: "This is general information, not legal advice.
    For your specific case, consult an advocate."
14. TITLES IN QUERY LANGUAGE: page titles use the words people search, not formal names,
    and stay at or under 60 characters (SERP truncation budget).
    - State pages: "{State} Traffic Challan ({ABBR} e-Challan) {year}: Check & Pay",
      built by seo.ts#stateTitle from the state record's required `abbr` field — the
      registration code people SEARCH with ("e challan ts"; Telangana stays TS even though
      new plates use TG). Long names auto-drop " e-Challan" from the parens to fit.
    - Fine pages: "{seo_name} {year}: {₹amount} Penalty & Rules", built by
      seo.ts#offenceTitle from the offence record's required `seo_name` field — the
      query-language name ("Helmet Challan Fine", "Drink and Drive Fine"), with the amount
      rendered from base_fine_min/base_fine_max and dropped if the title would overrun.
    - Suffix policy: Base.astro appends " | TrafficChallan" by default; state pages, fine
      pages and /about/ pass brandSuffix={false} because their titles already fill the
      budget (or already carry the brand). New page types keep the suffix unless their
      title is at risk of truncation.
    - `abbr` and `seo_name` are TEMPLATE fields: adding or correcting them does NOT bump
      last_verified (rule 2 still governs — only re-verified facts do).
15. PHRASING, NOT DUPLICATION: a keyword an existing page already answers is fixed by the
    words on THAT page — its title (within rule 14's budget) or an H2 over a section that
    genuinely covers it — never by a second page; and a navigational keyword (an official
    portal or app, including misspellings and URL typos) is served by /echallan-parivahan/,
    never by a page of its own. Rewording adds no facts, so it does not bump last_verified.
    See AGENT_PLAYBOOK "Navigational queries, and keywords we already cover".

16. COVERED MEANS THE WORDS ARE THERE. A queue item may only be marked `covered`
    when the keyword's distinctive words actually appear in the rendered text of
    the page named in `covered_by` — verified with `npm run gaps:check`, not
    assumed. A covered item is never built again, so a wrong `covered_by` removes
    the keyword from the roadmap permanently while nothing on the site serves it.
    Head terms (traffic, challan, e-challan, online, india) do not count as
    distinctive; and never reproduce a searcher's misspelling to satisfy a check —
    retire the item instead, with a note saying why.

17. A SOURCE IS SHOWN FOR WHAT IT IS. Wherever the site presents a source as the authority
    for a claim, the kind of authority must be visible: an official record, a court record,
    or a press report. `src/lib/sources.ts` classifies it and `bestSource()` picks the
    strongest source in a list regardless of its position, so a record can never be made to
    look better by reordering. The bug this prevents was live on /challan-discount/: the
    "Order / source" column rendered `sources[0]` as a bare hostname, so a page whose entire
    claim is "a discount is real only when a government order says so" was printing
    `bharatspeaks.com` where the order should be. A press report is never an order, a court
    order reproducing a notification is evidence the notification exists but is not the
    issuing department's own record, and both must say so on the page.

18. A DEAD SOURCE IS A DEAD CLAIM. When a cited source stops resolving, the claim it carried
    is re-verified against a live official source or it comes down — the citation is never
    silently deleted while the fact stays, and never left pointing at a dead host. Government
    subdomains disappear without notice: three Andhra Pradesh district police hosts went
    NXDOMAIN between August 2026 runs, taking six published fine amounts' only source with
    them. `npm run check:links -- --external` is what catches this, and publish.ts runs it,
    so a dead source blocks publishing by design. If an archived capture proves the claim was
    accurate when made, that is worth recording — but an archive is not a live citation and
    does not restore the claim on its own.
