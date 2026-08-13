import type { APIRoute } from 'astro';
import { loadSchemes, loadLokAdalat, maxSchemeDate } from '../../lib/data';
import { ORIGIN } from '../../lib/seo';

export const GET: APIRoute = async () => {
  const body = {
    updated: maxSchemeDate(),
    source: `${ORIGIN}/challan-discount/`,
    license: 'CC BY 4.0 with attribution to TrafficChallan',
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
