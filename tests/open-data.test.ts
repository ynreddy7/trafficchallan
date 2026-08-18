import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  sourceHost, isGovHost, classifySource, isOfficialSource, provenanceOf,
  OFFICIAL_NON_GOV_HOSTS
} from '../src/lib/provenance';
import { typeLabel, fieldRows, unwrapObject, isOptionalField } from '../src/lib/schema-doc';
import { openDatasets, findDataset, datasetNode } from '../src/lib/open-data';
import {
  OffenceSchema, StateSchema, SchemeSchema, RtoStateSchema, LokAdalatSchema, isoDate
} from '../src/lib/schemas';
import {
  loadOffences, loadStates, loadSchemes, loadRtoFiles, loadLokAdalat, dataPageDate
} from '../src/lib/data';
import { FINES_CSV_HEADER } from '../src/lib/csv';
import { LICENSE_URL } from '../src/lib/seo';

describe('provenance classifier', () => {
  it('strips www and lower-cases the host', () => {
    expect(sourceHost('https://WWW.IndiaCode.nic.in/x?y=1')).toBe('indiacode.nic.in');
  });

  it('accepts gov.in / nic.in and their subdomains only on the dot boundary', () => {
    expect(isGovHost('gov.in')).toBe(true);
    expect(isGovHost('nic.in')).toBe(true);
    expect(isGovHost('traffic.delhipolice.gov.in')).toBe(true);
    expect(isGovHost('uptransport.upsdc.gov.in')).toBe(true);
    // Look-alikes that a substring test would wrongly pass.
    expect(isGovHost('evilgov.in')).toBe(false);
    expect(isGovHost('gov.in.example.com')).toBe(false);
    expect(isGovHost('notnic.in')).toBe(false);
  });

  it('classifies government, allow-listed and third-party sources', () => {
    expect(classifySource('https://indiacode.nic.in/x')).toBe('gov');
    expect(classifySource('https://www.aptransport.org/')).toBe('gov-other-tld');
    expect(classifySource('https://www.acko.com/rto/')).toBe('third-party');
    expect(isOfficialSource('https://www.aptransport.org/')).toBe(true);
    expect(isOfficialSource('https://www.acko.com/rto/')).toBe(false);
  });

  it('treats no .org or .com as official unless it is on the evidenced allow-list', () => {
    // The allow-list is the ONLY route to official status off .gov.in/.nic.in,
    // and every entry has to carry the evidence that got it there.
    expect(classifySource('https://somestate.org/')).toBe('third-party');
    for (const [host, note] of Object.entries(OFFICIAL_NON_GOV_HOSTS)) {
      expect(isGovHost(host)).toBe(false);
      expect(note).toMatch(/fetched \d{4}-\d{2}-\d{2}/);
    }
  });

  it('measures counts, per-file gaps and host tallies', () => {
    const p = provenanceOf([
      { slug: 'a', sources: ['https://x.gov.in/1', 'https://www.acko.com/2'] },
      { slug: 'b', sources: ['https://www.acko.com/3', 'https://cars24.com/4'] },
      { slug: 'c', sources: ['https://www.aptransport.org/'] }
    ]);
    expect(p.files).toBe(3);
    expect(p.citations).toBe(5);
    expect(p.gov).toBe(1);
    expect(p.govOtherTld).toBe(1);
    expect(p.official).toBe(2);
    expect(p.thirdParty).toBe(3);
    expect(p.officialPct).toBe(40);
    expect(p.filesWithoutOfficial).toEqual(['b']);
    expect(p.thirdPartyHosts[0]).toEqual({ host: 'acko.com', count: 2 });
    expect(p.officialNonGovHosts).toEqual([{ host: 'aptransport.org', count: 1 }]);
  });

  it('never double-counts: official + third-party always equals citations', () => {
    for (const d of openDatasets()) {
      const p = d.provenance;
      expect(p.official + p.thirdParty).toBe(p.citations);
      expect(p.gov + p.govOtherTld).toBe(p.official);
    }
  });
});

describe('sourcing invariants the published figures depend on', () => {
  // CONTENT_STANDARDS rule 1: blogs and aggregators are never sources for a
  // fine amount or a portal URL. The /data/ provenance note publishes these as
  // 100% official, so a regression here would make the page overclaim.
  it('the fine schedule cites nothing but official sources', () => {
    expect(provenanceOf(loadOffences()).thirdParty).toBe(0);
  });
  it('the state records cite nothing but official sources', () => {
    expect(provenanceOf(loadStates()).thirdParty).toBe(0);
  });
});

describe('schema-doc type labels', () => {
  it('labels the primitive and composite kinds the schemas actually use', () => {
    expect(typeLabel(z.string())).toBe('string');
    expect(typeLabel(z.string().url())).toBe('string (URL)');
    expect(typeLabel(z.string().regex(/^[a-z]+$/))).toBe('string (fixed pattern)');
    expect(typeLabel(isoDate)).toBe('date (YYYY-MM-DD)');
    expect(typeLabel(z.number().int())).toBe('integer');
    expect(typeLabel(z.number())).toBe('number');
    expect(typeLabel(z.boolean())).toBe('boolean');
    expect(typeLabel(z.enum(['live', 'none']))).toBe('one of: live, none');
    expect(typeLabel(z.array(z.string().url()))).toBe('array of string (URL)');
    expect(typeLabel(z.object({ a: z.string(), b: z.string() }))).toBe('object {a, b}');
    expect(typeLabel(z.record(z.string(), z.boolean()))).toBe('object keyed by string → boolean');
  });

  it('sees through optional and default wrappers to the inner type', () => {
    expect(typeLabel(z.string().url().optional())).toBe('string (URL)');
    expect(typeLabel(z.record(z.string(), z.string()).default({}))).toBe('object keyed by string → string');
    expect(isOptionalField(z.string().optional())).toBe(true);
    expect(isOptionalField(z.string().default('x'))).toBe(true);
    expect(isOptionalField(z.string())).toBe(false);
  });

  it('peels superRefine wrappers down to the object', () => {
    // SchemeSchema is a ZodEffects; its fields must still be reachable.
    expect(Object.keys(unwrapObject(SchemeSchema).shape)).toContain('percent_by_class');
  });
});

describe('schema tables cannot drift from the schemas', () => {
  const MEANINGS = { a: 'The a field.', b: 'The b field.' };
  const base = z.object({ a: z.string(), b: z.number().int() });

  it('documents every field, in declaration order', () => {
    const rows = fieldRows(base, MEANINGS, 'Test');
    expect(rows.map((r) => r.name)).toEqual(['a', 'b']);
    expect(rows[1]).toEqual({ name: 'b', type: 'integer', required: true, meaning: 'The b field.' });
  });

  it('a field added to the schema surfaces — as a row once documented', () => {
    const extended = base.extend({ c: z.string().url() });
    const rows = fieldRows(extended, { ...MEANINGS, c: 'The c field.' }, 'Test');
    expect(rows.map((r) => r.name)).toEqual(['a', 'b', 'c']);
    expect(rows[2].type).toBe('string (URL)');
  });

  it('a field added to the schema with no meaning fails loudly rather than vanishing', () => {
    const extended = base.extend({ c: z.string().url() });
    expect(() => fieldRows(extended, MEANINGS, 'Test')).toThrowError(/undocumented field\(s\): c/);
  });

  it('a meaning left behind for a removed field fails too', () => {
    expect(() => fieldRows(base, { ...MEANINGS, gone: 'Removed.' }, 'Test'))
      .toThrowError(/no longer in the schema: gone/);
  });

  it('every published table covers its whole schema', () => {
    const pairs: [string, unknown, number][] = [
      ['fine-schedule', OffenceSchema, 0],
      ['state-records', StateSchema, 0],
      ['discount-schemes', SchemeSchema, 0],
      ['discount-schemes', LokAdalatSchema, 1],
      ['rto-codes', RtoStateSchema, 0]
    ];
    const all = openDatasets();
    for (const [id, schema, tableIndex] of pairs) {
      const table = findDataset(id, all).tables[tableIndex];
      const schemaFields = Object.keys(unwrapObject(schema as never).shape);
      expect(table.rows.map((r) => r.name)).toEqual(schemaFields);
      for (const row of table.rows) expect(row.meaning.length).toBeGreaterThan(10);
    }
  });

  it('the CSV column table lists exactly the columns the endpoint emits', () => {
    const csvTable = findDataset('fine-schedule').tables[1];
    expect(csvTable.rows.map((r) => r.name)).toEqual([...FINES_CSV_HEADER]);
  });
});

describe('published counts are computed, never hardcoded', () => {
  const all = openDatasets();
  const countOf = (id: string, label: string) => {
    const c = findDataset(id, all).counts.find((x) => x.label === label);
    if (!c) throw new Error(`no count labelled "${label}" on ${id}`);
    return c.value;
  };

  it('record counts equal what the loaders return', () => {
    expect(countOf('fine-schedule', 'Offence records')).toBe(loadOffences().length);
    expect(countOf('state-records', 'States and union territories')).toBe(loadStates().length);
    expect(countOf('discount-schemes', 'State scheme records')).toBe(loadSchemes().length);
    expect(countOf('rto-codes', 'States and union territories')).toBe(loadRtoFiles().length);
    expect(countOf('rto-codes', 'RTO codes'))
      .toBe(loadRtoFiles().reduce((n, r) => n + r.codes.length, 0));
    expect(countOf('discount-schemes', 'National Lok Adalat sittings listed'))
      .toBe(loadLokAdalat().national_sittings.length);
    expect(countOf('fine-schedule', 'CSV columns')).toBe(FINES_CSV_HEADER.length);
  });

  it('citation counts equal the measured provenance totals', () => {
    for (const d of all) {
      expect(countOf(d.id, 'Source citations')).toBe(d.provenance.citations);
    }
  });

  it('each dataset date is the newest last_verified in its own records', () => {
    expect(findDataset('fine-schedule', all).lastVerified)
      .toBe(loadOffences().map((o) => o.last_verified).sort().at(-1));
    expect(findDataset('rto-codes', all).lastVerified)
      .toBe(loadRtoFiles().map((r) => r.last_verified).sort().at(-1));
    // /data/ carries the max across exactly the four datasets it documents —
    // mirrors astro.config.mjs buildLastmodMap()'s '/data/' entry.
    expect(dataPageDate()).toBe(all.map((d) => d.lastVerified).sort().at(-1));
  });
});

describe('provenance notes state the measured figures', () => {
  const all = openDatasets();

  it('every note quotes its own citation and file totals', () => {
    for (const d of all) {
      const text = d.provenanceNote.join(' ');
      expect(text).toContain(`${d.provenance.official} of the ${d.provenance.citations} source citations`);
      expect(text).toContain(`${d.provenance.officialPct}%`);
    }
  });

  it('the RTO note names the third-party share and the sampling limit rather than glossing them', () => {
    const rto = findDataset('rto-codes', all);
    const text = rto.provenanceNote.join(' ');
    expect(rto.provenance.thirdParty).toBeGreaterThan(0);
    expect(text).toContain(`${rto.provenance.thirdParty} of ${rto.provenance.citations}`);
    const sampled = loadRtoFiles().filter((r) => r.verification.method === 'sampled').length;
    expect(text).toContain(`${sampled} of ${loadRtoFiles().length}`);
    expect(text).toContain('sampled');
    // Named, not hidden behind "some directories".
    expect(text).toContain(rto.provenance.thirdPartyHosts[0].host);
  });

  it('a dataset with files lacking any official citation says so and names them', () => {
    for (const d of all) {
      const text = d.provenanceNote.join(' ');
      if (d.provenance.filesWithoutOfficial.length) {
        expect(text).toContain('carry no official citation at all');
        for (const slug of d.provenance.filesWithoutOfficial) expect(text).toContain(slug);
      } else {
        expect(text).toContain('at least one official citation');
      }
    }
  });
});

describe('citation lines and dataset JSON-LD', () => {
  const all = openDatasets();

  it('each suggested citation names the site, dataset, version and endpoint under the licence', () => {
    for (const d of all) {
      expect(d.citationLine).toContain('TrafficChallan');
      expect(d.citationLine).toContain(d.name);
      expect(d.citationLine).toContain(d.lastVerified);
      expect(d.citationLine).toContain(`https://trafficchallan.com${d.endpoints[0].path}`);
      expect(d.citationLine).toContain('CC BY 4.0');
    }
  });

  it('every citation URL is one the dataset actually cites', () => {
    const sourcesOf: Record<string, string[]> = {
      'fine-schedule': loadOffences().flatMap((o) => o.sources),
      'state-records': loadStates().flatMap((s) => s.sources),
      'discount-schemes': [...loadSchemes().flatMap((s) => s.sources), ...loadLokAdalat().sources],
      'rto-codes': loadRtoFiles().flatMap((r) => r.sources)
    };
    for (const d of all) {
      for (const c of d.citation) expect(sourcesOf[d.id]).toContain(c.url);
    }
  });

  it('every dataset node carries the required and recommended Dataset properties', () => {
    for (const d of all) {
      const node = datasetNode(d) as any;
      expect(node['@type']).toBe('Dataset');
      // Required by Google.
      expect(node.name).toBe(d.name);
      expect(node.description.length).toBeGreaterThanOrEqual(50);
      expect(node.description.length).toBeLessThanOrEqual(5000);
      // Recommended.
      expect(node.license).toBe(LICENSE_URL);
      expect(node.keywords.length).toBeGreaterThan(0);
      expect(node.spatialCoverage.address.addressCountry).toBe('IN');
      expect(node.temporalCoverage).toBe(`${d.lastVerified}/..`);
      expect(node.version).toBe(d.lastVerified);
      expect(node.dateModified).toBe(d.lastVerified);
      expect(node.identifier).toBe(`https://trafficchallan.com${d.endpoints[0].path}`);
      expect(node.sameAs).toBe(`https://trafficchallan.com${d.page}`);
      expect(node.citation.length).toBeGreaterThan(0);
      expect(node.measurementTechnique.length).toBeGreaterThan(20);
      expect(node.variableMeasured.length).toBe(d.tables[0].rows.length);
      expect(node.distribution.map((x: any) => x.contentUrl))
        .toEqual(d.endpoints.map((e) => `https://trafficchallan.com${e.path}`));
      expect(node.url).toBe(`https://trafficchallan.com/data/#${d.id}`);
    }
  });

  it('a hub page emits the same node pointed at itself', () => {
    const rto = findDataset('rto-codes', all);
    const node = datasetNode(rto, { path: '/rto-codes/', sameAsPath: '/data/#rto-codes' }) as any;
    expect(node.url).toBe('https://trafficchallan.com/rto-codes/');
    expect(node.sameAs).toBe('https://trafficchallan.com/data/#rto-codes');
    expect(node.name).toBe(rto.name);
  });

  it('anchors are unique so the jump nav and the JSON-LD urls cannot collide', () => {
    const ids = all.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('findDataset refuses an unknown id rather than emitting nothing', () => {
    expect(() => findDataset('nope', all)).toThrowError(/no dataset with id "nope"/);
  });
});
