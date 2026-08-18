import type { APIRoute } from 'astro';
import { loadSchemes, loadLokAdalat, maxSchemeDate } from '../../lib/data';
import { ORIGIN, API_LICENSE, API_LICENSE_URL, API_LICENSE_NOTE } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const body = {
    updated: maxSchemeDate(),
    source: `${ORIGIN}/challan-discount/`,
    license: API_LICENSE,
    license_url: API_LICENSE_URL,
    license_note: API_LICENSE_NOTE,
    schemes: loadSchemes(),
    lok_adalat: loadLokAdalat()
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
