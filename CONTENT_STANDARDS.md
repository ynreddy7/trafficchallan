# Content Standards — TrafficChallan

1. FACTS: Every fine amount, legal section, portal URL, and process claim MUST cite an
   official source (parivahan.gov.in, state transport/police portals, indiacode.nic.in,
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
    section from blogs or memory. Procedure in 2026 cites the BNSS 2023, not the repealed
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
