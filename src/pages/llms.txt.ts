import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadStates, loadOffences, loadRtoFiles } from '../lib/data';
import { hasFineListPage } from '../lib/fine-list';
import { ORIGIN } from '../lib/seo';
import { openDatasets } from '../lib/open-data';

export const GET: APIRoute = async () => {
  const states = loadStates();
  const offences = loadOffences();
  const rtoStates = [...loadRtoFiles()].sort((a, b) => a.state_name.localeCompare(b.state_name));
  const guides = await getCollection('guides');
  // Counted from the dataset descriptors /data/ renders, so this line and the
  // page can never disagree about how many endpoints exist.
  const endpointCount = openDatasets().reduce((n, d) => n + d.endpoints.length, 0);
  const lines = [
    '# TrafficChallan',
    '',
    '> Independent, sourced reference on Indian traffic e-challans: how to check and pay in every state, and the current fine for every offence under the Motor Vehicles Act. Every record carries the URLs it was verified against and the date it was last checked; the measured official-source share of each dataset is published at /data/.',
    '',
    '## State guides',
    ...states.map((s) => `- [${s.name} e-challan](${ORIGIN}/${s.slug}-e-challan/): check & pay steps, official portals, ${s.name} fine amounts`),
    '',
    '## Fine amounts',
    `- [Full fine list](${ORIGIN}/fines/): every MV Act offence with first/repeat amounts`,
    ...offences.map((o) => `- [${o.name}](${ORIGIN}/fines/${o.slug}/): ${o.base_fine_text} (${o.mva_section})`),
    ...states.filter(hasFineListPage).map((s) =>
      `- [${s.name} traffic fines list](${ORIGIN}/fines/${s.slug}/): every offence with the amount as it applies in ${s.name} — state-notified where verified, statutory otherwise`),
    '',
    '## Guides',
    ...guides.map((g) => `- [${g.data.title}](${ORIGIN}/${g.id}/): ${g.data.description}`),
    '',
    '## Tools',
    `- [Fine calculator](${ORIGIN}/calculator/): offence × state × repeat lookup`,
    `- [Compare fines across states](${ORIGIN}/compare/): offence × state matrix`,
    `- [RTO code lookup](${ORIGIN}/rto-codes/): which city a number plate is from — a per-state directory of the RTO codes we hold for all ${rtoStates.length} states and union territories`,
    `- [Challan status decoder](${ORIGIN}/challan-status/): what every official e-challan status (Pending, Disposed, Sent to Court, Cognizance Denied…) means, with sourced next steps and Virtual Courts state coverage`,
    `- [eChallan Parivahan portal directory](${ORIGIN}/echallan-parivahan/): which official portal actually transacts a given state's challans — the legacy echallan.parivahan.gov.in portal vs the NextGen echallan.parivahan.nic.in portal, and the states that also run their own police/transport challan portal`,
    `- [Fake challan SMS check](${ORIGIN}/fake-challan-sms/): 60-second verification method, the fetched-and-verified allow-list of official national + state challan portals, documented scam signals, and victim reporting channels (1930, cybercrime.gov.in)`,
    '',
    '## RTO code lists',
    ...rtoStates.map((r) =>
      `- [${r.state_name} RTO codes](${ORIGIN}/rto-codes/${r.slug}/): all ${r.codes.length} ${r.series.join('/')} codes with their registering offices`),
    '',
    '## Live status',
    `- [Challan discount & Lok Adalat tracker](${ORIGIN}/challan-discount/): state-by-state discount/amnesty scheme status with government-order sources, next National Lok Adalat date, Delhi token steps`,
    '',
    '## Data',
    `- [Open data & API documentation](${ORIGIN}/data/): the human-readable documentation for all ${endpointCount} endpoints below — per-dataset record counts, the field-by-field schema of every payload (derived from the validation schemas themselves), the CC BY 4.0 licence terms and exactly what they do and do not cover, copy-paste citation lines, and a measured provenance note per dataset stating what share of its citations are official government sources and what share are third-party`,
    `- [Fine schedule (JSON)](${ORIGIN}/api/fines.json): every offence record, machine-readable, CC BY 4.0 with attribution`,
    `- [Fine schedule (CSV)](${ORIGIN}/api/fines.csv): same fine schedule as CSV`,
    `- [State records (JSON)](${ORIGIN}/api/states.json): every state's portals, check/pay steps and fine overrides, machine-readable`,
    `- [Discount schemes (JSON)](${ORIGIN}/api/schemes.json): per-state discount/amnesty scheme status + Lok Adalat dates, machine-readable`,
    `- [RTO codes (JSON)](${ORIGIN}/api/rto-codes.json): every RTO code we hold, with its registering office and state, machine-readable`,
    '',
    `All ${endpointCount} endpoints send Access-Control-Allow-Origin: *. There is no API key and no sign-up. Every JSON payload is an envelope with \`updated\` (the newest last_verified inside it), \`source\`, \`license\`, \`license_url\`, \`license_note\` (what CC BY 4.0 does and does not cover here) and one key holding the records.`
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
