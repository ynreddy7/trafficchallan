import type { APIRoute } from 'astro';
import { loadStates } from '../../lib/data';
import { ORIGIN, API_LICENSE, API_LICENSE_URL, API_LICENSE_NOTE } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const states = loadStates();
  const updated = states.map((s) => s.last_verified).sort().at(-1) ?? '';
  const body = {
    updated,
    source: `${ORIGIN}/`,
    license: API_LICENSE,
    license_url: API_LICENSE_URL,
    license_note: API_LICENSE_NOTE,
    states
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
