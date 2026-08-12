import type { APIRoute } from 'astro';
import { loadStates } from '../../lib/data';
import { ORIGIN } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const states = loadStates();
  const updated = states.map((s) => s.last_verified).sort().at(-1) ?? '';
  const body = {
    updated,
    source: `${ORIGIN}/`,
    license: 'CC BY 4.0 with attribution to TrafficChallan',
    states
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
