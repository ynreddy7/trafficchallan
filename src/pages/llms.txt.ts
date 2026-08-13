import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { loadStates, loadOffences } from '../lib/data';
import { ORIGIN } from '../lib/seo';

export const GET: APIRoute = async () => {
  const states = loadStates();
  const offences = loadOffences();
  const guides = await getCollection('guides');
  const lines = [
    '# TrafficChallan',
    '',
    '> Independent, sourced reference on Indian traffic e-challans: how to check and pay in every state, and the current fine for every offence under the Motor Vehicles Act. Every fact carries an official source and a last-verified date.',
    '',
    '## State guides',
    ...states.map((s) => `- [${s.name} e-challan](${ORIGIN}/${s.slug}-e-challan/): check & pay steps, official portals, ${s.name} fine amounts`),
    '',
    '## Fine amounts',
    `- [Full fine list](${ORIGIN}/fines/): every MV Act offence with first/repeat amounts`,
    ...offences.map((o) => `- [${o.name}](${ORIGIN}/fines/${o.slug}/): ${o.base_fine_text} (${o.mva_section})`),
    '',
    '## Guides',
    ...guides.map((g) => `- [${g.data.title}](${ORIGIN}/${g.id}/): ${g.data.description}`),
    '',
    '## Tools',
    `- [Fine calculator](${ORIGIN}/calculator/): offence × state × repeat lookup`,
    `- [Compare fines across states](${ORIGIN}/compare/): offence × state matrix`,
    `- [RTO code lookup](${ORIGIN}/rto-codes/): which city a number plate is from — every RTO code for all 36 states and union territories`,
    `- [Challan status decoder](${ORIGIN}/challan-status/): what every official e-challan status (Pending, Disposed, Sent to Court, Cognizance Denied…) means, with sourced next steps and Virtual Courts state coverage`,
    `- [Fake challan SMS check](${ORIGIN}/fake-challan-sms/): 60-second verification method, the fetched-and-verified allow-list of official national + state challan portals, documented scam signals, and victim reporting channels (1930, cybercrime.gov.in)`,
    '',
    '## Live status',
    `- [Challan discount & Lok Adalat tracker](${ORIGIN}/challan-discount/): state-by-state discount/amnesty scheme status with government-order sources, next National Lok Adalat date, Delhi token steps`,
    '',
    '## Data',
    `- [Fine schedule (JSON)](${ORIGIN}/api/fines.json): every offence record, machine-readable, CC BY 4.0 with attribution`,
    `- [Fine schedule (CSV)](${ORIGIN}/api/fines.csv): same fine schedule as CSV`,
    `- [State records (JSON)](${ORIGIN}/api/states.json): every state's portals, check/pay steps and fine overrides, machine-readable`,
    `- [Discount schemes (JSON)](${ORIGIN}/api/schemes.json): per-state discount/amnesty scheme status + Lok Adalat dates, machine-readable`,
    `- [RTO codes (JSON)](${ORIGIN}/api/rto-codes.json): every RTO code with its registering office and state, machine-readable`
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
