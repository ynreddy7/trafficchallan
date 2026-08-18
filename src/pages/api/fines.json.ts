import type { APIRoute } from 'astro';
import { loadOffences } from '../../lib/data';
import { ORIGIN, API_LICENSE, API_LICENSE_URL, API_LICENSE_NOTE } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const offences = loadOffences();
  const updated = offences.map((o) => o.last_verified).sort().at(-1) ?? '';
  const body = {
    updated,
    source: `${ORIGIN}/fines/`,
    license: API_LICENSE,
    license_url: API_LICENSE_URL,
    license_note: API_LICENSE_NOTE,
    offences
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
