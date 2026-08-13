import type { APIRoute } from 'astro';
import { loadRtoFiles } from '../../lib/data';
import { ORIGIN } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const states = loadRtoFiles();
  const updated = states.map((r) => r.last_verified).sort().at(-1) ?? '';
  const body = {
    updated,
    source: `${ORIGIN}/rto-codes/`,
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
