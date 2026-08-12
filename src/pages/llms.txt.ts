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
    `- [Fine calculator](${ORIGIN}/calculator/): offence × state × repeat lookup`
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
