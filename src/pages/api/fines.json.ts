import type { APIRoute } from 'astro';
import { loadOffences } from '../../lib/data';
import { ORIGIN } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const offences = loadOffences();
  const updated = offences.map((o) => o.last_verified).sort().at(-1) ?? '';
  const body = {
    updated,
    source: `${ORIGIN}/fines/`,
    license: 'CC BY 4.0 with attribution to TrafficChallan',
    offences
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
