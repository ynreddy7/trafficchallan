# Link-building kit — ready-to-execute material for the owner

Everything in this file must be executed **by a person**. An agent working in this
repo cannot create accounts, submit forms, post publicly or send email, and must
not try to. What it can do is what has been done here: research each target,
measure the link behaviour, and write out the exact text to paste so the human
step is copy → check → submit.

All measurements below were taken on **2026-08-19** with the method recorded next
to each one. Re-measure before you rely on any of them; sites change their link
handling without notice. If a claim here has no method next to it, treat it as
unverified.

---

## 0. Read this before you spend an hour on any of it

**The drop-catch gave us nothing.** This domain previously hosted a WordPress
blog. Measured here on 2026-08-19: the Wayback Machine's CDX index holds 127
captures for the host and **not one capture of any inner page** of the apex.
Measured earlier and **not re-run today** (the Common Crawl index API was
answering 504 on 2026-08-19): a check across 17 crawls spanning 2018–2026
returned zero captures of the host, including while the blog was live and
publishing, and Bing showed zero indexed pages. `public/_redirects` forwards the
43 old URLs whose subject a live page here actually covers, and its header
comment says the same thing at length. There is no reservoir of old link equity.
Everything below is building from zero.

**What "a link" is worth here.** The honest ranking of the items in this file, by
what they actually produce:

| # | Target | Link | Real yield | Owner time |
|---|---|---|---|---|
| 1 | public-apis PR | nofollow (measured) | discovery via downstream mirrors and API-list scrapers | 20 min |
| 2 | Zenodo deposit | dofollow (measured) | a **DOI**, permanent archive, academic citability | 45 min |
| 3 | DataHub Cloud | dofollow (measured) | a second dataset home, discoverability | 45 min |
| 4 | AlternativeTo | dofollow (measured) | a category listing people browse | 20 min |
| 5 | SaaSHub | nofollow (measured) | a listing, no link value | 15 min |
| 6 | Product Hunt | **not measured — see §6** | one day of traffic, high rejection risk | 2 h+ |
| 7 | Lok Adalat correction outreach | varies | the only route to an editorial link | 30 min each |

Items 2 and 3 are the ones worth doing first, and not mainly for the link: a DOI
makes the dataset citable, which is a thing this site can honestly claim and most
of its competitors cannot.

---

## 1. BLOCKED ON THE OWNER — read first

**`/about/` names no person and no legal entity.** It says the site is "built and
maintained by Team TrafficChallan" and explicitly declines individual bylines.
That is a defensible editorial choice, but it blocks three items in this file:

- **Zenodo requires a named creator.** Measured 2026-08-19 against
  `developers.zenodo.org`: the API's own error example is
  `{"field": "metadata.creators.0.name", "message": "Name is required."}`.
  A deposit cannot be published without at least one creator name. "Team
  TrafficChallan" as an organisational creator is possible, but a reviewer or a
  citing author will look for a person or a registered entity.
- **Product Hunt requires a personal account.** Product Hunt's help centre:
  *"You'll need a personal account to post a product on Product Hunt. Company
  accounts cannot hunt or post products."*
  (https://help.producthunt.com/en/articles/479557-how-to-post-a-product, read
  2026-08-19)
- **Journalist and editorial outreach.** An unsigned correction email from a
  site with no named owner is the easiest email in the world to ignore.

**This is the owner's decision and nobody else's.** Do not add any person's name
to `/about/`, to a Zenodo record, or to any outreach on the owner's behalf. The
options are: (a) publish under a named individual, (b) publish under a
registered entity, or (c) accept that items 2, 6 and 7 stay weak. Decide, then
come back to this file.

---

## 2. public-apis/public-apis pull request

**Target:** https://github.com/public-apis/public-apis
**Status (GitHub API, 2026-08-19):** not archived, 464,309 stars, last push
2026-08-18. Live and merging.
**Cost:** free. **Time:** ~20 minutes.

### Link type — measured, and it is nofollow

Rendered the README through the GitHub API
(`Accept: application/vnd.github.html+json` on
`/repos/public-apis/public-apis/readme`) on 2026-08-19: **1,622 of 1,897 anchors
carry `rel="nofollow"`**, and every outbound entry link does. Concretely:

```html
<a href="https://www.adsbexchange.com/data/" rel="nofollow">
```

So the link on github.com passes nothing. **The yield is downstream**: the README
is mirrored, scraped and republished by dozens of API-directory sites and by
tooling that ingests the list, and some of those mirrors do not add nofollow.
Two live forks-of-record maintain their own copies and take their own PRs — both
checked live on 2026-08-19:

- `public-api-lists/public-api-lists` — 15,492 stars, last push 2026-08-01
- `marcelscruz/public-apis` — 9,347 stars, last push 2026-08-18

Submit to the main repo first; only mirror the PR to those two if the first
merges.

### The exact row to add

Category: **Transportation**. Not Government — this site is explicitly not a
government service, `/about/` says so, and a Government listing would misrepresent
it. That is a hard rule, not a preference.

Insert **alphabetically between `Tankerkoenig` and `TransitLand`**:

```
| [Traffic Challan India](https://trafficchallan.com/data/) | India traffic fine schedule, state e-challan portals and RTO codes, sourced and dated | No | Yes | Yes |
```

Field-by-field, and why each value is honest:

- **Name** — `Traffic Challan India`. Their rules: *"Don't mention the TLD(Top
  Level Domain) in the name of the API"* and *"Please make sure the API name does
  not end with `API`"*.
- **Link** — `/data/`, the documentation page, not a raw endpoint. Their rule:
  *"Please make sure the API has proper documentation."*
- **Description** — 85 characters. Their rule: *"The Description should not
  exceed 100 characters."*
- **Auth `No`** — no key, no sign-up. Accepted values are `OAuth`, `apiKey`,
  `X-Mashape-Key`, `No`, `User-Agent`.
- **HTTPS `Yes`**.
- **CORS `Yes`** — every endpoint sends `Access-Control-Allow-Origin: *`
  (`src/pages/api/*.ts`). Accepted values are `Yes`, `No`, `Unknown`.

**Watch the column count.** `CONTRIBUTING.md` documents a six-column format with a
trailing "Call this API" column, but the live Transportation table in `README.md`
has five columns and its header row is `API | Description | Auth | HTTPS | CORS |`
(note: no leading pipe, a quirk of that section). **Copy the shape of the rows
already in the section you are editing**, not the shape in CONTRIBUTING. Pad each
column with one space on either side — that is one of their stated rules.

### Their rules you must follow, verbatim

From `CONTRIBUTING.md` (read 2026-08-19):

- *"Add one link per Pull Request."*
- *"Continue to follow the alphabetical ordering that is in place per section."*
- *"Each table column should be padded with one space on either side."*
- *"Make sure the PR title is in the format of `Add Api-name API` for e.g.:
  `Add Blockchain API`"* → **PR title: `Add Traffic Challan India API`**
- *"Use a short descriptive commit message."* → commit message:
  `Add Traffic Challan India to Transportation`
- *"Please make sure you squash all commits together before opening a pull
  request. If your pull request requires changes upon review, please be sure to
  squash all additional commits as well."*
- *"Target your Pull Request to the `master` branch of the `public-apis`"*
- *"Opening a pull request will trigger a build to check the validity of all links
  in the project. After the build completes, please ensure that the build has
  passed."*

And the warning at the top of their CONTRIBUTING, which is the one most PRs die
on: *"some pull requests have been specifically opened to market company APIs
that offer paid solutions. This API list is not a marketing tool… Pull requests
that are identified as marketing attempts will not be accepted."* Ours is fully
free with no key and no tier, so say that plainly and keep the PR body short.

### PR body to paste

```
Adds a free, no-key API to Transportation.

Five endpoints publishing India's traffic-challan reference data:
- https://trafficchallan.com/api/fines.json   Motor Vehicles Act fine schedule
- https://trafficchallan.com/api/fines.csv    same, as CSV
- https://trafficchallan.com/api/states.json  per-state e-challan portals and steps
- https://trafficchallan.com/api/schemes.json discount/amnesty scheme status
- https://trafficchallan.com/api/rto-codes.json  RTO code directory

No authentication, no rate limit, no sign-up, no paid tier.
Access-Control-Allow-Origin: * on every endpoint.
Licensed CC BY 4.0. Documentation, field-by-field schemas and per-dataset
provenance figures: https://trafficchallan.com/data/

Not a government service and not affiliated with one — hence Transportation
rather than Government.
```

---

## 3. Zenodo deposit — the DOI

**Target:** https://zenodo.org (CERN-operated, free)
**Cost:** free. **Time:** ~45 minutes. **Blocked on §1 (creator name).**

### Link type — measured dofollow

Fetched a live record page (`https://zenodo.org/records/10061360`) on 2026-08-19:
**zero occurrences of `nofollow` in the HTML**, and an external related-identifier
link rendered with no `rel` attribute at all
(`<a href="https://encyclopedia.odeuropa.eu/items/show/30" target="_blank" …>`).

### What it yields beyond the link

A **DOI, registered with DataCite on publish** — from Zenodo's own API docs
(developers.zenodo.org, read 2026-08-19): *"When you publish your deposition, we
register a DOI in DataCite for your upload, unless you manually provided us with
one."* That makes the dataset citable in a way a URL is not. Zenodo is run by
CERN and built with OpenAIRE — both credited in the footer of the record page
fetched on 2026-08-19. Whether a Zenodo record also surfaces in Google Dataset
Search was **not** verified here; do not repeat that claim until you have.

### What to upload

Export the five endpoints to files and upload them as one record:

```
fines.json        fines.csv        states.json
schemes.json      rto-codes.json   README.md
```

Write the README from `/data/` — the licence section, the citation lines, the
field tables and, in particular, the provenance figures. **Do not upgrade them.**
The RTO directory is 45 official citations out of 130; the record must say so.
A deposit that overstates its sourcing is worse than no deposit.

### Exact metadata

| Field | Value |
|---|---|
| Resource type / `upload_type` | `dataset` — Zenodo's controlled vocabulary is `publication`, `poster`, `presentation`, **`dataset`**, `image`, `video`, `software`, `lesson`, `physicalobject`, `other` |
| Title | `India Traffic Challan Reference Data: Motor Vehicles Act Fine Schedule, State e-Challan Portals, Discount Schemes and RTO Codes` |
| Creators | **BLOCKED — see §1.** At least one name is required. |
| Publication date | the day you publish |
| Access right | `open` |
| Licence | `cc-by-4.0` — confirmed present in Zenodo's licence vocabulary on 2026-08-19 (`/api/vocabularies/licenses?q=cc-by-4.0` → `"id": "cc-by-4.0"`, "Creative Commons Attribution 4.0 International"). **Set it explicitly**: Zenodo's API docs state the licence field *"Defaults to cc-zero for datasets"*, and CC0 is not what this data is published under. |
| Related works | relation **"is supplement to"** in the deposit form (`isSupplementTo` in the API), identifier `https://trafficchallan.com/data/`, scheme URL. Verified 2026-08-19: `related_identifiers` documents *"Supported identifiers include: DOI, Handle, ARK, PURL, ISSN, ISBN, PubMed ID, PubMed Central ID, ADS Bibliographic Code, arXiv, Life Science Identifiers (LSID), EAN-13, ISTC, URNs and URLs"* and lists `isSupplementTo` in its controlled vocabulary. |

**Description** (paste; edit only to correct a fact):

```
Four machine-readable datasets covering traffic challans (spot fines) in India,
published as the underlying data of trafficchallan.com.

1. Fine schedule — every offence in the reference set, with its Motor Vehicles
   Act section, first-offence and repeat-offence penalty as the cited source
   words it, parsed rupee minimum and maximum, licence impact, and whether the
   offence is normally compoundable online.
2. State records — for each state and union territory covered: its official
   e-challan portals, the ordered steps to check and to pay, SMS and app routes
   where the state offers any, the court/Virtual Court process, accepted payment
   instruments, published helplines, state-specific quirks, and any
   state-notified fine amounts that override the central figure.
3. Discount and amnesty schemes — per-state scheme status, including verified
   absences and claims that no government order confirms, plus National Lok
   Adalat sitting dates.
4. RTO code directory — registration codes with their registering office and
   state.

Every record carries the URLs it was verified against and the date it was last
checked. Provenance is measured from those URLs rather than asserted, and is
uneven across the four datasets: the fine schedule and the state records are
100% officially sourced, the schemes dataset 47%, and the RTO directory 35% —
85 of its 130 citations are commercial directories rather than transport
department publications, because only 15 of the 36 states and union territories
publish a fetchable official code list at all. The RTO directory should be
treated as indicative and re-verified against a state's own publication before
any use where correctness matters.

Licence note: CC BY 4.0 covers the compilation, the verification metadata and
the descriptive text. The statutory amounts, section numbers, office names and
portal addresses are government facts in which no rights are claimed.

Live documentation, schemas and endpoints: https://trafficchallan.com/data/
Not a government publication and not affiliated with any government body.
```

**Keywords:** `India`, `traffic fines`, `e-challan`, `Motor Vehicles Act`,
`road safety`, `open data`, `RTO codes`, `transport`, `public administration`,
`India traffic enforcement`

---

## 4. DataHub Cloud publication

**Target:** https://datahub.io (DataHub Cloud, by Datopian)
**Cost:** free — the site states *"Start publishing your data for free. No credit
card required."* (read 2026-08-19). **Time:** ~45 minutes.

### Link type — measured dofollow

Fetched a live dataset page (`https://datahub.io/core/country-codes`) on
2026-08-19: **zero occurrences of `nofollow`**; outbound source links render as
`rel="noopener noreferrer"`, which does not suppress link equity.

### How publishing works now

DataHub Cloud publishes **from a GitHub repository**, not by web upload. Their
quickstart, read 2026-08-19: *"Step 1 CHOOSE OR CREATE A GITHUB REPO … Add your
datasets directly to your repo… Step 2 PUBLISH IT WITH DATAHUB CLOUD. Just push
your changes to GitHub. With a single click in DataHub Cloud, your updated post
is live."*

So: create a small public GitHub repo holding the same five files and README as
the Zenodo deposit, connect it in DataHub Cloud, publish. The public URL pattern
for user-published posts was **not verified** — check it after publishing and
record it here.

Use the same README text as the Zenodo deposit, including the provenance
paragraph. One description, everywhere; if you improve it, improve it in both.

---

## 5. AlternativeTo

**Target:** https://alternativeto.net
**Cost:** free. **Time:** ~20 minutes.
**Submit route: not verified.** Four guessed submission URLs all returned 404 on
2026-08-19, and no "add an app" link appears in the signed-out page HTML — the
action is behind a signed-in account. Create the account, then find it in their
own UI rather than trusting a URL from anywhere, including this file.

### Link type — measured DOFOLLOW, which corrects the common assumption

Fetched three `/software/{name}/about/` pages on 2026-08-19 — `obsidian`,
`joplin`, `logseq` — and read the `rel` attributes:

```
href="https://joplinapp.org"  target="_blank" rel="noopener"          ← official site link
href="https://logseq.com"     target="_blank" rel="noopener"          ← official site link
href="https://play.google.com/…" target="_blank" rel="nofollow noopener"  ← secondary links
href="https://protonvpn.com/" target="_blank" rel="sponsored"             ← paid placement
```

**The primary official-site link carries `rel="noopener"` and no `nofollow`.**
Secondary links (app stores, GitHub) and paid placements are marked. This is the
opposite of what "AlternativeTo is nofollow" folklore says, so re-measure it
yourself before treating it as settled — one HTML fetch and a grep for `rel=`.

### Angle

List it as a **free web tool for checking Indian traffic challans**, as an
alternative to the state RTO apps and to the ad-heavy challan-check sites. Do not
describe it as an official or government service anywhere in the listing.

Suggested listing text:

```
Name: TrafficChallan
Tagline: Check what an Indian traffic fine costs, and which official portal to pay it on
Platform: Web
Licence: Free
Description:
Independent, non-government reference for Indian traffic challans. Look up the
Motor Vehicles Act penalty for an offence, see how the amount changes state to
state, find the official portal for your state, and check whether a challan SMS
is a scam. Every figure is sourced to a government document and carries the date
it was last verified. No sign-up, no payments taken — payment always happens on
the official portal. The underlying data is published as free CC BY 4.0 JSON/CSV.
```

---

## 6. SaaSHub and Product Hunt

### SaaSHub — measured nofollow, do it last or not at all

**Target:** https://www.saashub.com/submit
Fetched `https://www.saashub.com/obsidian-md` on 2026-08-19: the outbound website
link is

```html
<a … href="https://obsidian.md/" rel="nofollow" target="_blank">
```

Every outbound anchor sampled on that page carried `rel="nofollow"`, including
the hero "visit site" button and the sponsored cards. It is a 15-minute listing
that passes no link value. Fine to do; do not count it as a link.

### Product Hunt — real rejection risk, read this before spending the time

**Link type: NOT MEASURED.** Product Hunt is behind a Cloudflare bot challenge —
both an ordinary browser-UA `curl` and the automated fetcher got HTTP 403 on
2026-08-19. The "Product Hunt is dofollow" claim is therefore **unverified here**.
Check it yourself: open any live product page, view source, and search the
outbound website link for `rel=`.

**The bigger problem is eligibility.** Product Hunt's featuring guidelines (read
2026-08-19,
https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines)
list what they do not feature, and the list includes **"Directories or lists"**,
along with reports, courses and content-shaped submissions. A reference site is
squarely in the rejected category.

The proposed way around that is to launch **/fake-challan-sms/ as a scam-check
tool** rather than pitching the site. Be honest with yourself about whether that
is true: as it stands, `/fake-challan-sms/` is a written 60-second verification
procedure plus a table of official portal domains that were each fetched and
checked. It is genuinely useful, and it is genuinely not an interactive tool.
Submitting it as a "tool" is the kind of small overclaim this site exists not to
make, and it is also the kind of thing Product Hunt rejects.

Two honest options:

1. **Skip Product Hunt** until there is something interactive to launch.
2. **Build the tool first** — a page that takes a pasted SMS or a domain and
   returns "this domain is / is not on the verified official list, here is what
   the official portal for your state is" — then launch that. The verified
   portal data already exists in `data/official-portals.json`; the interaction
   does not.

If you do launch, the rules that matter. Personal account only (§1) — that one is
quoted directly from their help centre article 479557. Two more that came from a
**search summary of Product Hunt's launch guide rather than a page fetched here,
so confirm them on help.producthunt.com before you rely on either**: you may not
ask people directly to upvote (ask for visits and comments instead), and products
sharing a root domain must observe a six-month gap between launches — which, if
true, means you get one shot per half-year and should not spend it on the weaker
submission.

---

## 7. The 12 September 2026 National Lok Adalat — the editorial play

This is the only item here that can produce a genuine editorial link, and the
only one that involves contacting a human.

**The hook, from repo data** (`data/lok-adalat.json`, last verified 2026-08-13):
the next National Lok Adalat is **12 September 2026**, sourced to NALSA state
portals — `https://sikkim.nalsa.gov.in/national-lok-adalat-scheduled-to-be-held-on-12th-september-2026/`
and `https://meghalaya.nalsa.gov.in/news/schedule-of-national-lok-adalat-2026/`.
`/e-challan-lok-adalat/` and `/challan-discount/` carry the detail, including
what is verified and what is not (the Delhi token caps and windows are recorded
as *reported for the May 2026 edition*, with DSLSA re-announcing per edition —
that distinction is the whole point and must survive into any outreach).

**The play, in one line:** Indian outlets republish Lok Adalat challan-waiver
stories every cycle, and the recurring error to look for is last edition's Delhi
token cap, window or eligibility being restated as though it were confirmed for
the coming one. How often that actually happens in September 2026 is not
something this file has measured — step 1 below is where you find out. A precise,
sourced, non-promotional correction is the one email a desk actually reads.

**How to run it:**

1. In the week before 12 September, find published pieces that state a Delhi
   token cap, booking window or eligibility rule for the September sitting as
   settled fact.
2. Check the claim against DSLSA (https://dslsa.org/), the Delhi Traffic Police
   token portal (https://traffic.delhipolice.gov.in/lokadalat/) and NALSA
   (https://nalsa.gov.in/national-lok-adalat/) **on the day you write**. If the
   published claim turns out to be right, there is no email to send.
3. Send the correction to the byline or the corrections desk. One outlet at a
   time, no template blasts.

### DRAFT — the owner must read, verify and send this. No agent may send it.

> **Subject:** Correction: Delhi Lok Adalat token details for 12 September
>
> Hello [name],
>
> Your piece of [date] on the 12 September National Lok Adalat states [the exact
> claim, quoted]. I checked this against DSLSA and the Delhi Traffic Police token
> portal today ([date]) and could not find it confirmed for this edition — [what
> the official sources actually say right now, with the URLs].
>
> [If you have traced where the figure came from, say so here — e.g. "the figure
> matches the 9 May 2026 edition." Delete this line if you have not traced it;
> do not guess.] DSLSA re-announces the caps, the booking window and the
> eligibility cutoff separately for each sitting, so last edition's numbers are
> not carried forward.
>
> Sources I used:
> - DSLSA: https://dslsa.org/
> - Delhi Traffic Police token portal: https://traffic.delhipolice.gov.in/lokadalat/
> - NALSA National Lok Adalat calendar: https://nalsa.gov.in/national-lok-adalat/
>
> I maintain a sourced tracker of the sitting dates and state-level positions at
> https://trafficchallan.com/e-challan-lok-adalat/ — link it or don't, entirely
> up to you. Happy to be the check on anything else in this area.
>
> [name]

Notes on that draft: it leads with the correction and not with the link; it names
the primary sources so the desk can verify without trusting us; the link is
offered and explicitly not requested. **Verify every claim on the day you send
it** — the value of this email is that it is right, and a wrong correction ends
the relationship permanently. Do not send it unsigned (§1).

---

## 8. DO NOT DO — with Google's own words

Google's spam policies, quoted verbatim
(https://developers.google.com/search/docs/essentials/spam-policies, read
2026-08-19):

> "Link spam is the practice of creating links to or from a site primarily for
> the purpose of manipulating search rankings."

Named in that policy, and all off-limits here:

- **"Buying or selling links for ranking purposes"** — including the "guest post
  for ₹X" offers that arrive by email, and paid placement on any of the
  aggregators above.
- **"Excessive link exchanges ("Link to me and I'll link to you") or partner
  pages exclusively for the sake of cross-linking"**.
- **"Low-quality directory or bookmark site links"** — which rules out the
  mass-submission directory lists. AlternativeTo, SaaSHub and DataHub are in this
  file because each is a real service with real users; a list of 200 directories
  is not.
- **"Forum comments with optimized links in the post or signature"** — no comment
  links, no profile-page link drops, no signature links.
- Private blog networks. Any site that exists to link to other sites.

And the two that this domain in particular must never go near:

> "Expired domain abuse is where an expired domain name is purchased and
> repurposed primarily to manipulate search rankings by hosting content that
> provides little to no value to users."

> "Scaled content abuse is when many pages are generated for the primary purpose
> of manipulating search rankings and not helping users."

**Specifically prohibited, and worth stating on its own line: never restore or
recreate the previous owner's WordPress content, its tag archives, its author
pages or its category pages to catch residual links.** That content is not ours
to republish, and rebuilding a previous owner's pages on a drop-caught domain to
harvest links is precisely what both policies above describe. `public/_redirects`
handles the handful of old URLs that have an honest destination and lets every
other one 404 — that is the entire, permanent policy on the old site.

---

## 9. DR is not a target. Here is what to measure instead.

Domain Rating is **Ahrefs' proprietary metric**, in Ahrefs' own words
(https://ahrefs.com/seo/glossary/domain-rating, read 2026-08-19):

> "Domain Rating (DR) is a proprietary SEO metric by Ahrefs. It represents the
> strength of the website's backlink profile on a logarithmic scale from 0 to
> 100, with the latter being the strongest."

Four things follow, and they kill the "links → DR" tables that circulate:

1. **It is purely link-based.** Ahrefs names the factors as *"The number of
   domains linking to a website (referring domains)"*, *"The DR of these
   referring domains"* and *"The number of websites the referring domain links
   to"*, and says *"The exact formula of Domain Rating is not disclosed"*.
   Nothing about content, traffic or accuracy enters it.
2. **Google does not publish it and does not consume it.** It is Ahrefs' number,
   computed from Ahrefs' own crawl of the web. No search engine exposes anything
   like it, and no search engine takes it as input.
3. **Nofollow links contribute nothing.** Ahrefs, same page: *"Nofollow links
   don't pass DR."* Which means items 1 and 5 in the table at the top of this
   file — including the public-apis PR — move DR by zero even if everything goes
   right.
4. **It is a relative score, not a stock.** Ahrefs' own one-line definition is
   *"The relative strength of a website's authority based on its backlink
   profile"*, and one of the three factors above is a property of the *linking*
   site, not of yours. A number that moves when other people's link profiles
   move is not something you can bank.

So anyone who hands you "12 links = DR 20" is guessing, and the guess is not even
well-formed. **Measure these instead**, monthly:

- **Referring domains** — the count of distinct domains linking here, and their
  names. This is a fact, not a score. Free sources exist; any of them is better
  than a composite number.
- **Google Search Console: impressions and average position**, per query and per
  page. This is the only dataset that reflects what Google actually did.
- **Indexed pages** in Search Console's Pages report, against the count in
  `dist/sitemap-0.xml` after a build (89 on 2026-08-19). Coverage gaps are
  actionable; DR is not.
- **Referral traffic** from each item in this file. If the public-apis mirrors
  never send a visitor, stop maintaining that listing.

Write the numbers down each month. Three data points beat any single-number
metric, and unlike DR you can act on all of them.

---

## 10. Provenance of every measurement in this file

| Claim | Method | Date |
|---|---|---|
| No Wayback captures of apex inner pages; 127 captures total | `web.archive.org/cdx/search/cdx?url=trafficchallan.com&matchType=domain` | 2026-08-19 |
| Zero Common Crawl captures across 17 crawls 2018–2026 | measured before this file; the CC index API answered 504 on the re-check | prior; not re-run 2026-08-19 |
| public-apis README links are nofollow (1,622/1,897 anchors) | GitHub API README render, `Accept: application/vnd.github.html+json` | 2026-08-19 |
| public-apis repo live, 464,309 stars, pushed 2026-08-18 | GitHub REST API `/repos/public-apis/public-apis` | 2026-08-19 |
| Two forks-of-record live with star counts | GitHub REST API on each repo | 2026-08-19 |
| public-apis contribution rules | raw `CONTRIBUTING.md` on `master` | 2026-08-19 |
| Transportation table is 5 columns, alphabetical neighbours | raw `README.md` on `master` | 2026-08-19 |
| Zenodo records have no nofollow | fetched `zenodo.org/records/10061360`, grepped `rel` | 2026-08-19 |
| Zenodo `upload_type`, `related_identifiers`, DOI-on-publish, creator required, licence default `cc-zero` | `developers.zenodo.org` | 2026-08-19 |
| `cc-by-4.0` is a valid Zenodo licence id | `zenodo.org/api/vocabularies/licenses?q=cc-by-4.0` | 2026-08-19 |
| DataHub pages have no nofollow; GitHub-sync publishing; free tier | fetched `datahub.io/core/country-codes` and `datahub.io/publish` | 2026-08-19 |
| AlternativeTo official-site link is `rel="noopener"` (dofollow) | fetched 3 software pages, read `rel` attributes | 2026-08-19 |
| SaaSHub outbound links are `rel="nofollow"` | fetched `saashub.com/obsidian-md` | 2026-08-19 |
| Product Hunt link type | **NOT MEASURED** — Cloudflare challenge, HTTP 403 | 2026-08-19 |
| Product Hunt personal-account rule; featuring guidelines exclude "Directories or lists" | help.producthunt.com articles 479557 and 9883485, fetched | 2026-08-19 |
| Product Hunt no-upvote-asking rule and six-month same-domain gap | **search summary of their launch guide, page not fetched — confirm before use** | 2026-08-19 |
| AlternativeTo submit URL | **NOT FOUND** — four guessed paths 404, action is behind login | 2026-08-19 |
| DataHub public URL pattern for user posts | **NOT VERIFIED** | 2026-08-19 |
| Google spam-policy wording | developers.google.com/search/docs/essentials/spam-policies | 2026-08-19 |
| Ahrefs DR definition and "Nofollow links don't pass DR" | ahrefs.com/seo/glossary/domain-rating | 2026-08-19 |
| 12 Sep 2026 Lok Adalat date and Delhi token caveats | `data/lok-adalat.json`, last verified 2026-08-13, NALSA sources | repo data |
