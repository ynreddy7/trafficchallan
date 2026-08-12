import type { APIRoute } from 'astro';
import { loadOffences } from '../../lib/data';
import { toCsvRow } from '../../lib/csv';

const HEADER = ['slug', 'name', 'mva_section', 'base_fine_text', 'repeat_fine_text', 'compoundable_online'];

export const GET: APIRoute = async () => {
  const offences = loadOffences();
  const rows = offences.map((o) =>
    toCsvRow([o.slug, o.name, o.mva_section, o.base_fine_text, o.repeat_fine_text, String(o.compoundable_online)])
  );
  const csv = [toCsvRow(HEADER), ...rows].join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
