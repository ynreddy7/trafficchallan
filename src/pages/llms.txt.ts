import type { APIRoute } from 'astro';
import { loadStates, loadOffences } from '../lib/data';

export const GET: APIRoute = () => {
  const states = loadStates();
  const offences = loadOffences();
  const lines = [
    '# TrafficChallan',
    '',
    '> Independent, sourced reference on Indian traffic e-challans: how to check and pay in every state, and the current fine for every offence under the Motor Vehicles Act. Every fact carries an official source and a last-verified date.',
    '',
    '## State guides',
    ...states.map((s) => `- [${s.name} e-challan](https://trafficchallan.com/${s.slug}-e-challan/): check & pay steps, official portals, ${s.name} fine amounts`),
    '',
    '## Fine amounts',
    '- [Full fine list](https://trafficchallan.com/fines/): every MV Act offence with first/repeat amounts',
    ...offences.map((o) => `- [${o.name}](https://trafficchallan.com/fines/${o.slug}/): ${o.base_fine_text} first offence (${o.mva_section})`),
    '',
    '## Tools',
    '- [Fine calculator](https://trafficchallan.com/calculator/): offence × state × repeat lookup'
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
