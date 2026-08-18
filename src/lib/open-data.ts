/**
 * Descriptors for the four published datasets, rendered by /data/.
 *
 * Everything numeric here is MEASURED at build time from the same loaders the
 * API endpoints use — record counts, last-verified dates and provenance
 * figures — so the documentation cannot drift from the payload. Field tables
 * come from the zod schemas via src/lib/schema-doc.ts, which fails the build
 * if a schema gains a field nobody documented.
 *
 * The prose here states what each dataset is and how well sourced it actually
 * is, including where it is weak. Understating is the standing instruction: a
 * reviewer who clicks through must find the data better than the page claims,
 * never worse.
 */

import {
  loadStates, loadOffences, loadSchemes, loadLokAdalat, loadRtoFiles
} from './data';
import {
  StateSchema, OffenceSchema, SchemeSchema, LokAdalatSchema, RtoStateSchema
} from './schemas';
import { fieldRows, type FieldRow } from './schema-doc';
import { provenanceOf, type ProvenanceStats, type HostCount } from './provenance';
import { FINES_CSV_HEADER } from './csv';
import { ORIGIN, LICENSE_LABEL, datasetJsonLd } from './seo';

/* --- Field meanings ------------------------------------------------------ */
/* Keys must match the zod schemas exactly; schema-doc.ts fails the build on
   any field added without a meaning, or any meaning left behind. */

const OFFENCE_MEANINGS: Record<string, string> = {
  slug: 'URL-safe id of the offence. Also its page: /fines/{slug}/.',
  name: 'Formal offence name, as the statute or the official penalty schedule words it.',
  seo_name: 'The same offence in the words people search with ("Helmet Challan Fine"). A display field, not a legal name.',
  target_keyword: 'The single search query the offence page is written to answer. Editorial routing — not a fact about the offence.',
  mva_section: 'Motor Vehicles Act section the penalty is set by.',
  description: 'Plain-English description of what the offence covers.',
  base_fine_text: 'First-offence penalty exactly as the cited source states it, including any per-vehicle-class wording.',
  base_fine_min: 'Lowest rupee figure inside base_fine_text, as an integer, for sorting and calculators.',
  base_fine_max: 'Highest rupee figure inside base_fine_text. Equal to base_fine_min when the source gives a single amount.',
  repeat_fine_text: 'Penalty for a second or subsequent offence, as the source states it.',
  licence_impact: 'What the offence can do to the driving licence (suspension, disqualification), per the cited source.',
  compoundable_online: 'Whether the offence can normally be settled online rather than only before a court.',
  faqs: 'Question-and-answer pairs published on the offence page.',
  sources: 'Every URL the record was verified against.',
  last_verified: 'The day the record was last checked against those sources.',
  statute_quote: 'Optional verbatim extract of the statutory text with its attribution. Verbatim only — never a paraphrase inside quotation marks.'
};

const STATE_MEANINGS: Record<string, string> = {
  slug: 'URL-safe id of the state or union territory. Also its page: /{slug}-e-challan/.',
  name: 'State or union territory name.',
  abbr: 'Two-letter registration series people search with. Telangana stays TS even though new plates use TG — this is the searched form, not the newest series.',
  target_keyword: 'The single search query the state page is written to answer. Editorial routing — not a fact about the state.',
  portals: 'Official portals for the state: label, URL, and whether it checks challans, pays them, or both.',
  check_steps: 'Ordered steps to check a pending challan on the official portal.',
  pay_steps: 'Ordered steps to pay one.',
  sms_app_methods: 'SMS and mobile-app routes the state itself offers, where any exist. Empty means none verified.',
  court_challan_process: 'What happens in this state once a challan has gone to a court or Virtual Court.',
  payment_methods: 'Payment instruments the official portal accepts.',
  contacts: 'Published helpline and helpdesk labels with their values.',
  quirks: 'State-specific catches that do not fit the standard steps.',
  faqs: 'Question-and-answer pairs published on the state page.',
  fine_overrides: 'Offence slug → the state-notified amount and the notification that set it. No entry means the central Motor Vehicles Act figure applies.',
  sources: 'Every URL the record was verified against.',
  last_verified: 'The day the record was last checked against those sources.'
};

const SCHEME_MEANINGS: Record<string, string> = {
  slug: 'URL-safe id of the state the record covers.',
  state_name: 'State or union territory name.',
  status: 'Verified position on a discount/amnesty scheme. "none" is a verified absence, not missing data; "rumour" and "proposal" are claims no order confirms.',
  scheme_name: 'Official name of the scheme, where one was published.',
  percent_by_class: 'Vehicle class → the discount in plain text. Present only for live, announced or closed schemes; the schema rejects it on rumour and proposal records.',
  window: 'Scheme start date and, where published, its end date.',
  order_ref: 'Government order or circular reference the scheme rests on.',
  note: 'Plain-English status note, including what is still unconfirmed.',
  history: 'Earlier rounds of the same state scheme, each carrying its own sources.',
  sources: 'Every URL the record was verified against.',
  last_verified: 'The day the record was last checked against those sources.'
};

const LOK_ADALAT_MEANINGS: Record<string, string> = {
  national_sittings: 'Each National Lok Adalat sitting date, marked held or scheduled.',
  delhi_token: 'Delhi token booking: the portal, how many days before a sitting booking opens, the daily cap and the published limits.',
  delhi_extras: 'Delhi digital Lok Adalat note, evening-courts URL and weekend-courts note.',
  state_notes: 'Per-state notes on how that state runs traffic Lok Adalats.',
  sources: 'Every URL the record was verified against.',
  last_verified: 'The day the record was last checked against those sources.'
};

const RTO_MEANINGS: Record<string, string> = {
  slug: 'URL-safe id of the state or union territory. Also its page: /rto-codes/{slug}/.',
  state_name: 'State or union territory name.',
  series: 'Two-letter registration series the state or UT uses. Some carry more than one.',
  codes: 'Every RTO code with the office that registers under it.',
  verification: 'How this list was checked: method "full" (against a fetchable official list) or "sampled", the sample size where sampled, and official_list_available — whether we found a fetchable official list for that state. That last flag records the outcome of our search, not what the transport department publishes.',
  sources: 'Every URL the record was verified against.',
  last_verified: 'The day the record was last checked against those sources.'
};

/* --- Shapes -------------------------------------------------------------- */

export interface EndpointDoc {
  path: string;
  encodingFormat: string;
  formatLabel: string;
  note?: string;
}
export interface CountDoc {
  label: string;
  value: number;
}
export interface SchemaTableDoc {
  caption: string;
  intro: string;
  rows: FieldRow[];
}
export interface OpenDataset {
  /** Anchor id on /data/. */
  id: string;
  /** Dataset name — used in the JSON-LD node and the suggested citation. */
  name: string;
  /** H2 on the page. */
  heading: string;
  /** One or two sentences: what the dataset contains. */
  blurb: string;
  /** Longer JSON-LD description (Google requires 50–5000 characters). */
  description: string;
  /** Human page describing this data — schema.org sameAs. */
  page: string;
  endpoints: EndpointDoc[];
  /** Top-level key the records sit under inside the JSON envelope. */
  payloadKey: string;
  counts: CountDoc[];
  lastVerified: string;
  keywords: string[];
  citation: { name: string; url: string }[];
  measurementTechnique: string;
  tables: SchemaTableDoc[];
  provenance: ProvenanceStats;
  /** Plain-English provenance paragraphs, figures already measured in. */
  provenanceNote: string[];
  /** Copy-paste suggested citation line. */
  citationLine: string;
}

/* --- Helpers ------------------------------------------------------------- */

const abs = (path: string) => ORIGIN + path;

/** "acko.com (20), cars24.com (20) and 7 others" — never an invented total. */
function listHosts(hosts: HostCount[], show = 5): string {
  // A lone host needs no parenthesised count — the sentence around it already
  // states the number.
  if (hosts.length === 1) return hosts[0].host;
  const named = hosts.slice(0, show).map((h) => `${h.host} (${h.count})`);
  const rest = hosts.length - named.length;
  if (rest > 0) named.push(`${rest} other${rest === 1 ? '' : 's'}`);
  if (named.length === 0) return 'none';
  if (named.length === 1) return named[0];
  return `${named.slice(0, -1).join(', ')} and ${named.at(-1)}`;
}

/**
 * The three provenance sentences every dataset gets, built from measured
 * figures. `unit` names what a file is ("offence records", "state and UT
 * files") so the sentence reads naturally per dataset.
 */
function baseProvenanceNote(p: ProvenanceStats, unit: string): string[] {
  const otherTld = p.govOtherTld
    ? ` and ${p.govOtherTld} on ${listHosts(p.officialNonGovHosts)} — ` +
      (p.officialNonGovHosts.length === 1
        ? 'a site we fetched and confirmed is run by the department or authority itself'
        : 'sites we each fetched and confirmed are run by the department or authority itself')
    : '';
  const first =
    `${p.official} of the ${p.citations} source citations across the ${p.files} ${unit} are official: ` +
    `${p.gov} on Indian government hostnames (.gov.in or .nic.in)${otherTld}. That is ${p.officialPct}% of all citations.`;

  const second = p.thirdParty === 0
    ? 'Nothing in this dataset rests on a blog, a news report or a commercial directory.'
    : `The remaining ${p.thirdParty} citation${p.thirdParty === 1 ? ' is' : 's are'} third-party: ${listHosts(p.thirdPartyHosts)}.`;

  const third = p.filesWithoutOfficial.length === 0
    ? `Every one of the ${p.files} ${unit} carries at least one official citation.`
    : `${p.filesWithoutOfficial.length} of the ${p.files} ${unit} carry no official citation at all — ${p.filesWithoutOfficial.join(', ')}.`;

  return [first, second, third];
}

/** "TrafficChallan (2026). Name [data set], version 2026-08-14. URL — CC BY 4.0." */
function citationLine(name: string, lastVerified: string, endpoint: string): string {
  return `TrafficChallan (${lastVerified.slice(0, 4)}). ${name} [data set], version ${lastVerified}. ` +
    `${abs(endpoint)} — licensed ${LICENSE_LABEL}.`;
}

const newest = (dates: string[]) => [...dates].sort().at(-1)!;

/* --- The datasets -------------------------------------------------------- */

export function openDatasets(): OpenDataset[] {
  const offences = loadOffences();
  const states = loadStates();
  const schemes = loadSchemes();
  const lokAdalat = loadLokAdalat();
  const rto = loadRtoFiles();

  /* Fine schedule --------------------------------------------------------- */
  const finesDate = newest(offences.map((o) => o.last_verified));
  const finesProv = provenanceOf(offences);
  const finesTables: SchemaTableDoc[] = [
    {
      caption: 'Offence record fields (/api/fines.json)',
      intro: 'Each entry in the offences array:',
      rows: fieldRows(OffenceSchema, OFFENCE_MEANINGS, 'OffenceSchema')
    },
    {
      caption: 'CSV columns (/api/fines.csv)',
      intro: `A flattened view of the same records — ${FINES_CSV_HEADER.length} columns, one row per offence, header row first:`,
      rows: fieldRows(OffenceSchema, OFFENCE_MEANINGS, 'OffenceSchema').filter((r) =>
        (FINES_CSV_HEADER as readonly string[]).includes(r.name)
      )
    }
  ];
  const fines: OpenDataset = {
    id: 'fine-schedule',
    name: 'Indian traffic fine schedule (Motor Vehicles Act)',
    heading: 'Fine schedule',
    blurb:
      'Every traffic offence we cover under the Motor Vehicles Act, with the section that sets the penalty, the first-offence and repeat amounts as the source words them, machine-readable minimum and maximum figures, licence consequences and whether the offence can be settled online.',
    description:
      'Offence-wise traffic penalties under the Motor Vehicles Act, 1988 as amended: the MV Act section, first-offence and repeat penalty text exactly as the official source words it, integer minimum and maximum rupee figures, licence consequences, whether the offence is compoundable online, and per-record source URLs with the date each record was last verified. Published as JSON and as a flattened CSV.',
    page: '/fines/',
    endpoints: [
      { path: '/api/fines.json', encodingFormat: 'application/json', formatLabel: 'JSON', note: 'Full offence records.' },
      { path: '/api/fines.csv', encodingFormat: 'text/csv', formatLabel: 'CSV', note: 'Flattened, one row per offence.' }
    ],
    payloadKey: 'offences',
    counts: [
      { label: 'Offence records', value: offences.length },
      { label: 'Source citations', value: finesProv.citations },
      { label: 'CSV columns', value: FINES_CSV_HEADER.length }
    ],
    lastVerified: finesDate,
    keywords: [
      'traffic fines', 'India', 'Motor Vehicles Act', 'e-challan', 'road traffic penalties',
      'open data', 'transport'
    ],
    citation: [
      {
        name: 'The Motor Vehicles Act, 1988 — section 200 (composition of certain offences), India Code',
        url: 'https://www.indiacode.nic.in/show-data?actid=AC_CEN_30_42_00009_198859_1517807326286&sectionId=28477&sectionno=200&orderno=231'
      },
      {
        name: 'Delhi Traffic Police — schedule of traffic offences and penalties',
        url: 'https://traffic.delhipolice.gov.in/traffic-offences'
      }
    ],
    measurementTechnique:
      'Each amount is read from the statute text on India Code or from an official police or gazette schedule, and the record stores every source URL plus the date it was last checked.',
    tables: finesTables,
    provenance: finesProv,
    provenanceNote: [
      ...baseProvenanceNote(finesProv, 'offence records'),
      'Amounts are stored as the source words them, because several are conditional (per vehicle class, or "up to"). base_fine_min and base_fine_max are our reading of that text as integers, for sorting and calculators — where the two disagree, the text is what the source says and the integers are ours.'
    ],
    citationLine: citationLine('Indian traffic fine schedule (Motor Vehicles Act)', finesDate, '/api/fines.json')
  };

  /* State e-challan records ----------------------------------------------- */
  const statesDate = newest(states.map((s) => s.last_verified));
  const statesProv = provenanceOf(states);
  const overrideCount = states.reduce((n, s) => n + Object.keys(s.fine_overrides).length, 0);
  const portalCount = states.reduce((n, s) => n + s.portals.length, 0);
  const stateRecords: OpenDataset = {
    id: 'state-records',
    name: 'Indian state e-challan portal and process records',
    heading: 'State e-challan records',
    blurb:
      'For each state we cover: its official challan portals, the ordered steps to check and to pay, SMS and app routes where the state offers them, what happens once a challan reaches a court, accepted payment methods, published helplines, and any state-notified fine amounts that differ from the central figure.',
    description:
      'Per-state records for checking and paying Indian traffic e-challans: official portal URLs with their scope (check, pay or both), ordered check and pay steps, SMS and mobile-app routes, the court and Virtual Court process, accepted payment methods, published helplines, state-specific catches, and state-notified fine amounts that override the central Motor Vehicles Act figure. Every record carries its source URLs and the date it was last verified.',
    page: '/',
    endpoints: [
      { path: '/api/states.json', encodingFormat: 'application/json', formatLabel: 'JSON' }
    ],
    payloadKey: 'states',
    counts: [
      { label: 'States and union territories', value: states.length },
      { label: 'Official portal entries', value: portalCount },
      { label: 'State-notified fine overrides', value: overrideCount },
      { label: 'Source citations', value: statesProv.citations }
    ],
    lastVerified: statesDate,
    keywords: [
      'e-challan', 'India', 'traffic challan', 'state transport portals', 'Parivahan',
      'Virtual Courts', 'open data'
    ],
    citation: [
      {
        name: 'Ministry of Road Transport & Highways — eChallan (Parivahan) challan lookup',
        url: 'https://echallan.parivahan.gov.in/index/accused-challan'
      },
      {
        name: 'eCommittee, Supreme Court of India — Virtual Courts',
        url: 'https://vcourts.gov.in/virtualcourt/'
      }
    ],
    measurementTechnique:
      'Every portal URL and process step is checked by opening the official portal or department page itself; the record stores each source URL and the date it was last opened.',
    tables: [
      {
        caption: 'State record fields (/api/states.json)',
        intro: 'Each entry in the states array:',
        rows: fieldRows(StateSchema, STATE_MEANINGS, 'StateSchema')
      }
    ],
    provenance: statesProv,
    provenanceNote: [
      ...baseProvenanceNote(statesProv, 'state and UT files'),
      `Coverage is the honest limit here, not sourcing: ${states.length} states and union territories are covered, against the ${rto.length} in the RTO directory below. A state absent from this dataset has not been researched, and its absence carries no meaning.`
    ],
    citationLine: citationLine('Indian state e-challan portal and process records', statesDate, '/api/states.json')
  };

  /* Discount schemes + Lok Adalat ----------------------------------------- */
  const schemeDate = newest([...schemes.map((s) => s.last_verified), lokAdalat.last_verified]);
  const schemeProv = provenanceOf([
    ...schemes,
    { slug: 'lok-adalat', sources: lokAdalat.sources }
  ]);
  const liveCount = schemes.filter((s) => s.status === 'live').length;
  const noneCount = schemes.filter((s) => s.status === 'none').length;
  const schemeData: OpenDataset = {
    id: 'discount-schemes',
    name: 'Indian traffic challan discount and amnesty scheme tracker',
    heading: 'Discount schemes and Lok Adalat dates',
    blurb:
      'The verified position on traffic-challan discount, amnesty and one-time-settlement schemes state by state — live, announced, closed, proposed, rumoured, or verified absent — plus National Lok Adalat sitting dates and the Delhi token mechanics.',
    description:
      'State-by-state status of Indian traffic e-challan discount, amnesty and one-time-settlement schemes, with the government-order reference where one exists, the scheme window, per-vehicle-class discount text, and a plain-English note on what remains unconfirmed. A "none" record is a verified absence of any scheme, not missing data. The same payload carries National Lok Adalat sitting dates, Delhi token-booking mechanics and per-state Lok Adalat notes. Every record carries source URLs and a last-verified date.',
    page: '/challan-discount/',
    endpoints: [
      { path: '/api/schemes.json', encodingFormat: 'application/json', formatLabel: 'JSON' }
    ],
    payloadKey: 'schemes (plus lok_adalat)',
    counts: [
      { label: 'State scheme records', value: schemes.length },
      { label: 'Live schemes right now', value: liveCount },
      { label: 'States with a verified absence of any scheme', value: noneCount },
      { label: 'National Lok Adalat sittings listed', value: lokAdalat.national_sittings.length },
      { label: 'Source citations', value: schemeProv.citations }
    ],
    lastVerified: schemeDate,
    keywords: [
      'traffic challan discount', 'amnesty scheme', 'one-time settlement', 'Lok Adalat',
      'India', 'e-challan', 'open data'
    ],
    citation: [
      {
        name: 'National Legal Services Authority — National Lok Adalat',
        url: 'https://nalsa.gov.in/national-lok-adalat/'
      },
      {
        name: 'Ministry of Road Transport & Highways — eChallan (Parivahan) challan lookup',
        url: 'https://echallan.parivahan.gov.in/index/accused-challan'
      }
    ],
    measurementTechnique:
      'Each state is re-checked against the government order where one is published, and against corroborating official or press reporting where none is; the status field records which of those the record actually rests on.',
    tables: [
      {
        caption: 'Scheme record fields (/api/schemes.json → schemes)',
        intro: 'Each entry in the schemes array:',
        rows: fieldRows(SchemeSchema, SCHEME_MEANINGS, 'SchemeSchema')
      },
      {
        caption: 'Lok Adalat object fields (/api/schemes.json → lok_adalat)',
        intro: 'The single lok_adalat object alongside it:',
        rows: fieldRows(LokAdalatSchema, LOK_ADALAT_MEANINGS, 'LokAdalatSchema')
      }
    ],
    provenance: schemeProv,
    provenanceNote: [
      ...baseProvenanceNote(schemeProv, `scheme files (${schemes.length} states plus the Lok Adalat file)`),
      'Press citations are load-bearing in this dataset by design, and that is the honest reading of the numbers above: a record with status "rumour" or "proposal" is by definition a claim that no government order confirms, so press reporting and fact-checks are the only evidence there is. The schema refuses to store a discount percentage on those records at all. Percentages appear only on live, announced and closed records, which carry the order reference or an official record quoting it.',
      'A scheme can be withdrawn or extended overnight. Treat every record as of its last_verified date and confirm on the official portal before anyone pays.'
    ],
    citationLine: citationLine('Indian traffic challan discount and amnesty scheme tracker', schemeDate, '/api/schemes.json')
  };

  /* RTO code directory ---------------------------------------------------- */
  const rtoDate = newest(rto.map((r) => r.last_verified));
  const rtoProv = provenanceOf(rto);
  const codeCount = rto.reduce((n, r) => n + r.codes.length, 0);
  const fullyVerified = rto.filter((r) => r.verification.method === 'full').length;
  const sampled = rto.filter((r) => r.verification.method === 'sampled').length;
  const officialListStates = rto.filter((r) => r.verification.official_list_available).length;
  // The sampled states split in two, and the split is the honest part: some
  // samples were checked against official office pages, the rest could only be
  // cross-checked across independent directories because no official page for
  // them was found. `filesWithoutOfficial` is measured from the records' own
  // sources, so these two always sum to `sampled`.
  const noOfficialCitation = new Set(rtoProv.filesWithoutOfficial);
  const sampledWithoutOfficial = rto.filter(
    (r) => r.verification.method === 'sampled' && noOfficialCitation.has(r.slug)
  ).length;
  const sampledAgainstOfficial = sampled - sampledWithoutOfficial;
  const rtoData: OpenDataset = {
    id: 'rto-codes',
    name: 'Indian RTO code directory',
    heading: 'RTO code directory',
    blurb:
      'Every Regional Transport Office code we hold, with the office that registers under it, grouped by state and union territory — plus, per state, how the list was verified and whether we found an official list published by the transport department.',
    description:
      'Regional Transport Office codes for Indian states and union territories: each two-letter series, each RTO code with the registering office it belongs to, and a per-state verification block recording whether the list was checked in full against a fetchable official list or verified by sample, the sample size, and whether we found a fetchable official list published by the state transport department. Every state file carries its source URLs and a last-verified date.',
    page: '/rto-codes/',
    endpoints: [
      { path: '/api/rto-codes.json', encodingFormat: 'application/json', formatLabel: 'JSON' }
    ],
    payloadKey: 'states',
    counts: [
      { label: 'States and union territories', value: rto.length },
      { label: 'RTO codes', value: codeCount },
      { label: 'States verified in full against an official list', value: fullyVerified },
      { label: 'States verified by sample only', value: sampled },
      { label: 'Source citations', value: rtoProv.citations }
    ],
    lastVerified: rtoDate,
    keywords: [
      'RTO code', 'India', 'vehicle registration', 'number plate', 'Regional Transport Office',
      'transport', 'open data'
    ],
    citation: [
      {
        name: 'Transport Department, Government of NCT of Delhi — zonal offices',
        url: 'https://transport.delhi.gov.in/transport/zonal-offices'
      },
      {
        name: 'Transport Department, Government of Uttar Pradesh — RTO code list',
        url: 'https://uptransport.upsdc.gov.in/Pages/RTO_Code'
      }
    ],
    measurementTechnique:
      `Where we could find a fetchable official list published by the state transport department, that list is the source of record and the state is marked verification.method "full" — ${fullyVerified} of ${rto.length}. The remaining ${sampled} are marked "sampled", with the sample size stored on the record, and they split two ways: ${sampledAgainstOfficial} samples were checked against official transport-department or office pages, and ${sampledWithoutOfficial} could only be cross-checked across independent vehicle-information directories because we found no official page for them at all.`,
    tables: [
      {
        caption: 'RTO state record fields (/api/rto-codes.json)',
        intro: 'Each entry in the states array:',
        rows: fieldRows(RtoStateSchema, RTO_MEANINGS, 'RtoStateSchema')
      }
    ],
    provenance: rtoProv,
    provenanceNote: [
      ...baseProvenanceNote(rtoProv, 'state and UT files'),
      `Most of this dataset's citations — ${rtoProv.thirdParty} of ${rtoProv.citations} — are commercial directories — insurance, used-car and vehicle-information sites — not transport departments. We could find a fetchable official code list for only ${officialListStates} of the ${rto.length} states and union territories, which is why ${sampled} of ${rto.length} are marked verification.method "sampled" against ${fullyVerified} checked in full. That is a statement about our search, not about what those transport departments publish: a state may publish a list we could not fetch or did not find. Of the ${sampled} sampled states, ${sampledAgainstOfficial} had their sample checked against official office pages; for the other ${sampledWithoutOfficial} the sample could only be cross-checked across independent directories.`,
      'Use it as a working directory, not as an authoritative register. New codes are created whenever a state carves out a new office, so a code missing from this data may simply be newer than the list. Where a state\'s verification block says "sampled", the codes we did not sample are exactly as reliable as the directories they came from.'
    ],
    citationLine: citationLine('Indian RTO code directory', rtoDate, '/api/rto-codes.json')
  };

  return [fines, stateRecords, schemeData, rtoData];
}

/**
 * The Dataset JSON-LD node for one documented dataset — built here, not at the
 * call site, so /data/ and the hub page a dataset drives emit the SAME node.
 * By default `url` is the dataset's section on /data/ and `sameAs` is the hub
 * page; a hub page flips the two so its own node points at itself.
 */
export function datasetNode(d: OpenDataset, opts: { path?: string; sameAsPath?: string } = {}) {
  return datasetJsonLd({
    name: d.name,
    description: d.description,
    path: opts.path ?? `/data/#${d.id}`,
    dateModified: d.lastVerified,
    sameAsPath: opts.sameAsPath ?? d.page,
    identifierPath: d.endpoints[0].path,
    keywords: d.keywords,
    citation: d.citation,
    measurementTechnique: d.measurementTechnique,
    // variableMeasured is the same schema-derived field list the published
    // table renders, so the machine-readable and human field lists are one.
    variables: d.tables[0].rows.map((r) => ({ name: r.name, description: r.meaning })),
    distributions: d.endpoints.map((e) => ({ url: e.path, encodingFormat: e.encodingFormat }))
  });
}

/** Look one dataset up by id. Throws rather than silently emitting nothing. */
export function findDataset(id: string, all = openDatasets()): OpenDataset {
  const found = all.find((d) => d.id === id);
  if (!found) {
    throw new Error(`open-data: no dataset with id "${id}" (have: ${all.map((d) => d.id).join(', ')})`);
  }
  return found;
}
