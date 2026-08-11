# trafficchallan.com Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the trafficchallan.com data-driven reference platform — an Astro static site rendered from a validated JSON data layer (Indian states' e-challan processes + MV Act fine schedules), with SEO/AEO layers, build-time quality gates, ~35-page launch content, Cloudflare Pages deployment, and an autonomous scheduled content agent.

**Architecture:** Structured JSON datasets (`/data`) validated by zod schemas and build-blocking quality gates; Astro templates render state pages, offence pages, a fines hub, a calculator island, and markdown guides; a publish pipeline (validate → build → link-check → push → IndexNow) is driven by scheduled cloud agents following a playbook committed to the repo.

**Tech Stack:** Astro ^5 + TypeScript, zod ^3, vitest ^2, tsx, gray-matter, fast-glob, xlsx (keyword export parsing), @astrojs/sitemap, sharp (one-off OG image), Cloudflare Pages, GitHub.

**Spec:** `docs/superpowers/specs/2026-08-12-trafficchallan-platform-design.md` (approved). Read it before starting any task.

## Global Constraints

- Static output only — no server, no database, no runtime backend (spec §3).
- Every factual data record MUST carry `sources: [url...]` (≥1) and `last_verified: YYYY-MM-DD` (spec §4).
- Build fails on: missing source, `last_verified` older than 90 days, duplicate `target_keyword`, duplicate slug, broken internal link (spec §10). External-link failures block the **publish pipeline** (full mode), not local dev builds.
- Brand-only bylines: "Team TrafficChallan". No named or fake authors anywhere (spec §2).
- Site is UNOFFICIAL: every layout must carry the disclaimer "TrafficChallan.com is an independent information website, not affiliated with any government body. Payments happen only on official government portals."
- Velocity cap: max 5 NEW pages per calendar week (updates unlimited) (spec §8).
- No ads / no affiliate code at launch (spec §9 — monetization integration is post-launch, out of this plan's scope).
- English only; URLs: states at `/{state}-e-challan/`, offences at `/fines/{offence}/`, guides at `/{guide-slug}/` (spec §5–6).
- Canonical origin: `https://trafficchallan.com` (apex, no www).
- Facts about fines/processes come ONLY from official sources: parivahan.gov.in, state transport/police portals, gazette notifications, India Code (MV Act text), PIB. Never from other blogs/aggregators.
- Site title pattern: `<Page Title> | TrafficChallan`. Meta descriptions ≤160 chars.
- Every content page opens with a 2–3 sentence direct answer to its `target_keyword` (spec §7).
- All commits: conventional-commit style (`feat:`, `fix:`, `data:`, `content:`, `docs:`, `chore:`).
- Working directory: `C:\Users\yniti\trafficchallan` (repo already initialized on branch `main` with the spec committed).

---

### Task 1: Scaffold Astro project + tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.nvmrc`, `src/pages/index.astro` (placeholder), `src/styles/global.css` (empty for now), `public/robots.txt`
- Test: build + vitest smoke run

**Interfaces:**
- Produces: npm scripts `dev`, `build` (runs `gate` first — gate script arrives in Task 3, stub it now), `test`, `gate`; project layout `src/`, `data/`, `scripts/`, `tests/`.

- [ ] **Step 1: Create package.json and configs**

`package.json`:
```json
{
  "name": "trafficchallan",
  "private": true,
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "gate": "tsx scripts/validate-data.ts",
    "build": "npm run gate && astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "check:links": "tsx scripts/check-links.ts",
    "publish:site": "tsx scripts/publish.ts"
  },
  "dependencies": {
    "@astrojs/sitemap": "^3.2.0",
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "fast-glob": "^3.3.2",
    "gray-matter": "^4.0.3",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0",
    "xlsx": "^0.18.5",
    "zod": "^3.23.8"
  }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://trafficchallan.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "types": ["vitest/globals"] },
  "include": ["src", "scripts", "tests"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, include: ['tests/**/*.test.ts'] } });
```

`.gitignore`:
```
node_modules/
dist/
.astro/
```

`.nvmrc`: `20`

`public/robots.txt`:
```
User-agent: *
Allow: /

Sitemap: https://trafficchallan.com/sitemap-index.xml
```

Stub `scripts/validate-data.ts` (replaced in Task 3):
```ts
console.log('gate: stub (Task 3 will implement)');
```

Placeholder `src/pages/index.astro`:
```astro
---
---
<html lang="en"><head><meta charset="utf-8" /><title>TrafficChallan</title></head>
<body><h1>TrafficChallan — under construction</h1></body></html>
```

- [ ] **Step 2: Install and verify build**

Run: `npm install` then `npm run build`
Expected: build succeeds, `dist/index.html` exists.

- [ ] **Step 3: Verify vitest runs**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
describe('smoke', () => { it('runs', () => { expect(1 + 1).toBe(2); }); });
```
Run: `npm test` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: scaffold Astro project with vitest, zod, sitemap"
```

---

### Task 2: Data schemas + loader (TDD)

**Files:**
- Create: `src/lib/schemas.ts`, `src/lib/data.ts`, `data/states/.gitkeep`, `data/fines/.gitkeep`
- Test: `tests/schemas.test.ts`, `tests/data.test.ts`

**Interfaces:**
- Produces: `StateSchema`, `OffenceSchema`, types `StateRecord`, `OffenceRecord` (from `src/lib/schemas.ts`); `loadStates(dir?): StateRecord[]`, `loadOffences(dir?): OffenceRecord[]` (from `src/lib/data.ts`) — both throw `Error` with an aggregated readable message listing every invalid file.
- Consumed by: Tasks 3, 5, 6, 8, 9, 10, 11.

- [ ] **Step 1: Write failing schema tests**

`tests/schemas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { StateSchema, OffenceSchema } from '../src/lib/schemas';

const validState = {
  slug: 'delhi', name: 'Delhi', target_keyword: 'delhi e challan',
  portals: [{ label: 'Delhi Traffic Police', url: 'https://traffic.delhipolice.gov.in/', scope: 'both' }],
  check_steps: ['Open the portal', 'Enter vehicle number', 'View pending challans'],
  pay_steps: ['Open the portal', 'Select the challan', 'Pay via card/UPI'],
  sms_app_methods: ['mParivahan app → e-challan section'],
  court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI', 'Debit card'],
  contacts: [{ label: 'Traffic helpline', value: '011-25844444' }],
  quirks: [],
  faqs: [
    { q: 'How do I check?', a: 'A'.repeat(50) },
    { q: 'How do I pay?', a: 'B'.repeat(50) },
    { q: 'What if unpaid?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {},
  sources: ['https://traffic.delhipolice.gov.in/'],
  last_verified: '2026-08-12'
};

const validOffence = {
  slug: 'driving-without-helmet', name: 'Riding without a helmet', target_keyword: 'helmet challan fine',
  mva_section: 'Section 194D, Motor Vehicles Act 1988',
  description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,000',
  licence_impact: 'Licence may be disqualified for 3 months.',
  compoundable_online: true,
  faqs: [{ q: 'Q1?', a: 'A'.repeat(50) }, { q: 'Q2?', a: 'B'.repeat(50) }],
  sources: ['https://www.indiacode.nic.in/'],
  last_verified: '2026-08-12'
};

describe('StateSchema', () => {
  it('accepts a valid record', () => { expect(StateSchema.parse(validState).slug).toBe('delhi'); });
  it('rejects missing sources', () => {
    expect(() => StateSchema.parse({ ...validState, sources: [] })).toThrow();
  });
  it('rejects bad last_verified format', () => {
    expect(() => StateSchema.parse({ ...validState, last_verified: '12-08-2026' })).toThrow();
  });
  it('rejects fewer than 3 FAQs', () => {
    expect(() => StateSchema.parse({ ...validState, faqs: validState.faqs.slice(0, 2) })).toThrow();
  });
});

describe('OffenceSchema', () => {
  it('accepts a valid record', () => { expect(OffenceSchema.parse(validOffence).slug).toBe('driving-without-helmet'); });
  it('rejects non-url source', () => {
    expect(() => OffenceSchema.parse({ ...validOffence, sources: ['not a url'] })).toThrow();
  });
});
```

Run: `npm test` → FAIL (`schemas` module not found).

- [ ] **Step 2: Implement schemas**

`src/lib/schemas.ts`:
```ts
import { z } from 'zod';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const StateSchema = z.object({
  slug: z.string().regex(/^[a-z][a-z-]*$/),
  name: z.string().min(2),
  target_keyword: z.string().min(3),
  portals: z.array(z.object({
    label: z.string().min(2),
    url: z.string().url(),
    scope: z.enum(['check', 'pay', 'both'])
  })).min(1),
  check_steps: z.array(z.string().min(10)).min(3),
  pay_steps: z.array(z.string().min(10)).min(3),
  sms_app_methods: z.array(z.string().min(5)),
  court_challan_process: z.string().min(100),
  payment_methods: z.array(z.string().min(2)).min(1),
  contacts: z.array(z.object({ label: z.string(), value: z.string() })),
  quirks: z.array(z.string()),
  faqs: z.array(z.object({ q: z.string().min(8), a: z.string().min(40) })).min(3),
  fine_overrides: z.record(z.string(), z.object({
    amount_text: z.string().min(2),
    source: z.string().url()
  })).default({}),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate
});
export type StateRecord = z.infer<typeof StateSchema>;

export const OffenceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(3),
  target_keyword: z.string().min(3),
  mva_section: z.string().min(5),
  description: z.string().min(80),
  base_fine_text: z.string().min(2),
  base_fine_min: z.number().int().nonnegative(),
  base_fine_max: z.number().int().nonnegative(),
  repeat_fine_text: z.string().min(2),
  licence_impact: z.string().min(5),
  compoundable_online: z.boolean(),
  faqs: z.array(z.object({ q: z.string().min(8), a: z.string().min(40) })).min(2),
  sources: z.array(z.string().url()).min(1),
  last_verified: isoDate
});
export type OffenceRecord = z.infer<typeof OffenceSchema>;
```

Note the check_steps/pay_steps min length of 10 chars per step — the test fixture steps must be ≥10 chars (they are, e.g. 'Open the portal' = 15).

Run: `npm test` → schema tests PASS.

- [ ] **Step 3: Write failing loader tests**

`tests/data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadStates } from '../src/lib/data';

function tmpDataDir(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'tc-data-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), JSON.stringify(content));
  }
  return dir;
}

const goodState = {
  slug: 'delhi', name: 'Delhi', target_keyword: 'delhi e challan',
  portals: [{ label: 'Delhi Traffic Police', url: 'https://traffic.delhipolice.gov.in/', scope: 'both' }],
  check_steps: ['Open the portal site', 'Enter your vehicle number', 'View pending challans'],
  pay_steps: ['Open the portal site', 'Select the pending challan', 'Pay via card or UPI'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI'], contacts: [], quirks: [],
  faqs: [
    { q: 'How do I check it?', a: 'A'.repeat(50) },
    { q: 'How do I pay it?', a: 'B'.repeat(50) },
    { q: 'What if unpaid then?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {}, sources: ['https://traffic.delhipolice.gov.in/'], last_verified: '2026-08-12'
};

describe('loadStates', () => {
  it('loads valid records sorted by slug', () => {
    const dir = tmpDataDir({ 'delhi.json': goodState });
    const states = loadStates(dir);
    expect(states).toHaveLength(1);
    expect(states[0].name).toBe('Delhi');
  });
  it('throws an aggregate error naming every bad file', () => {
    const dir = tmpDataDir({
      'delhi.json': goodState,
      'bad.json': { slug: 'bad' }
    });
    expect(() => loadStates(dir)).toThrow(/bad\.json/);
  });
  it('rejects filename/slug mismatch', () => {
    const dir = tmpDataDir({ 'notdelhi.json': goodState });
    expect(() => loadStates(dir)).toThrow(/notdelhi\.json.*slug/);
  });
});
```

Run: `npm test` → FAIL (`data` module not found).

- [ ] **Step 4: Implement loader**

`src/lib/data.ts`:
```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { StateSchema, OffenceSchema, type StateRecord, type OffenceRecord } from './schemas';
import type { ZodType } from 'zod';

function loadDir<T extends { slug: string }>(dir: string, schema: ZodType<T>): T[] {
  const errors: string[] = [];
  const records: T[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      const rec = schema.parse(raw);
      if (basename(file, '.json') !== rec.slug) {
        errors.push(`${file}: slug "${rec.slug}" does not match filename`);
        continue;
      }
      records.push(rec);
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (errors.length) throw new Error(`Invalid data files:\n${errors.join('\n---\n')}`);
  return records;
}

export function loadStates(dir = join(process.cwd(), 'data', 'states')): StateRecord[] {
  return loadDir(dir, StateSchema);
}
export function loadOffences(dir = join(process.cwd(), 'data', 'fines')): OffenceRecord[] {
  return loadDir(dir, OffenceSchema);
}
```

Run: `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: zod schemas and validated data loaders for states and offences"
```

---

### Task 3: Build-blocking quality gates (TDD)

**Files:**
- Create: `src/lib/gate.ts` (pure logic), replace stub `scripts/validate-data.ts` (CLI)
- Test: `tests/gate.test.ts`

**Interfaces:**
- Consumes: `loadStates`, `loadOffences`, `StateRecord`, `OffenceRecord` (Task 2).
- Produces: `runGates(input: GateInput): string[]` from `src/lib/gate.ts` — returns array of human-readable violation strings (empty = pass). `GateInput = { states: StateRecord[]; offences: OffenceRecord[]; guides: { file: string; target_keyword: string; last_verified: string; sources: string[] }[]; now: Date }`. CLI `npm run gate` exits 1 and prints violations if any. Guides are read from `src/content/guides/*.md` frontmatter via gray-matter (directory may not exist yet — treat as empty).

- [ ] **Step 1: Write failing gate tests**

`tests/gate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { runGates, type GateInput } from '../src/lib/gate';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const state = (over: Partial<StateRecord>): StateRecord => ({
  slug: 'delhi', name: 'Delhi', target_keyword: 'delhi e challan',
  portals: [{ label: 'P', url: 'https://example.gov.in/', scope: 'both' }],
  check_steps: ['Step one here', 'Step two here', 'Step three here'],
  pay_steps: ['Step one here', 'Step two here', 'Step three here'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120),
  payment_methods: ['UPI'], contacts: [], quirks: [],
  faqs: [
    { q: 'Question one?', a: 'A'.repeat(50) },
    { q: 'Question two?', a: 'B'.repeat(50) },
    { q: 'Question three?', a: 'C'.repeat(50) }
  ],
  fine_overrides: {}, sources: ['https://example.gov.in/'], last_verified: '2026-08-01',
  ...over
});

const offence = (over: Partial<OffenceRecord>): OffenceRecord => ({
  slug: 'no-helmet', name: 'No helmet', target_keyword: 'helmet fine',
  mva_section: 'Section 194D', description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,000', licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }],
  sources: ['https://example.gov.in/'], last_verified: '2026-08-01',
  ...over
});

const base: GateInput = {
  states: [state({})], offences: [offence({})], guides: [], now: new Date('2026-08-12')
};

describe('runGates', () => {
  it('passes clean input', () => { expect(runGates(base)).toEqual([]); });
  it('flags last_verified older than 90 days', () => {
    const v = runGates({ ...base, states: [state({ last_verified: '2026-01-01' })] });
    expect(v.join(' ')).toMatch(/stale/i);
  });
  it('flags duplicate target_keyword across page types', () => {
    const v = runGates({ ...base, offences: [offence({ target_keyword: 'delhi e challan' })] });
    expect(v.join(' ')).toMatch(/duplicate target_keyword/i);
  });
  it('flags fine_overrides referencing unknown offence slug', () => {
    const v = runGates({
      ...base,
      states: [state({ fine_overrides: { 'ghost-offence': { amount_text: '₹1', source: 'https://x.gov.in/' } } })]
    });
    expect(v.join(' ')).toMatch(/ghost-offence/);
  });
  it('flags guide missing sources', () => {
    const v = runGates({
      ...base,
      guides: [{ file: 'g.md', target_keyword: 'how to pay challan', last_verified: '2026-08-01', sources: [] }]
    });
    expect(v.join(' ')).toMatch(/g\.md.*source/i);
  });
});
```

Run: `npm test` → FAIL (`gate` module not found).

- [ ] **Step 2: Implement gate logic**

`src/lib/gate.ts`:
```ts
import type { StateRecord, OffenceRecord } from './schemas';

export interface GuideMeta { file: string; target_keyword: string; last_verified: string; sources: string[] }
export interface GateInput { states: StateRecord[]; offences: OffenceRecord[]; guides: GuideMeta[]; now: Date }

const STALE_DAYS = 90;

export function runGates(input: GateInput): string[] {
  const v: string[] = [];
  const staleBefore = new Date(input.now.getTime() - STALE_DAYS * 86400_000);

  const checkStale = (what: string, date: string) => {
    if (new Date(date + 'T00:00:00Z') < staleBefore) v.push(`${what}: stale last_verified ${date} (> ${STALE_DAYS} days)`);
  };
  input.states.forEach((s) => checkStale(`state ${s.slug}`, s.last_verified));
  input.offences.forEach((o) => checkStale(`offence ${o.slug}`, o.last_verified));
  input.guides.forEach((g) => {
    checkStale(`guide ${g.file}`, g.last_verified);
    if (!g.sources.length) v.push(`guide ${g.file}: no sources listed`);
  });

  const kwOwners = new Map<string, string>();
  const claim = (kw: string, owner: string) => {
    const key = kw.trim().toLowerCase();
    const prev = kwOwners.get(key);
    if (prev) v.push(`duplicate target_keyword "${kw}" on ${prev} and ${owner}`);
    else kwOwners.set(key, owner);
  };
  input.states.forEach((s) => claim(s.target_keyword, `state ${s.slug}`));
  input.offences.forEach((o) => claim(o.target_keyword, `offence ${o.slug}`));
  input.guides.forEach((g) => claim(g.target_keyword, `guide ${g.file}`));

  const slugOwners = new Map<string, string>();
  const claimSlug = (slug: string, owner: string) => {
    const prev = slugOwners.get(slug);
    if (prev) v.push(`duplicate slug "${slug}" on ${prev} and ${owner}`);
    else slugOwners.set(slug, owner);
  };
  input.states.forEach((s) => claimSlug(`${s.slug}-e-challan`, `state ${s.slug}`));
  input.offences.forEach((o) => claimSlug(`fines/${o.slug}`, `offence ${o.slug}`));
  input.guides.forEach((g) => claimSlug(g.file.replace(/\.md$/, ''), `guide ${g.file}`));

  const offenceSlugs = new Set(input.offences.map((o) => o.slug));
  input.states.forEach((s) => {
    for (const key of Object.keys(s.fine_overrides)) {
      if (!offenceSlugs.has(key)) v.push(`state ${s.slug}: fine_overrides references unknown offence "${key}"`);
    }
  });

  return v;
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Implement CLI wrapper**

Replace `scripts/validate-data.ts`:
```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { loadStates, loadOffences } from '../src/lib/data';
import { runGates, type GuideMeta } from '../src/lib/gate';

function loadGuideMeta(): GuideMeta[] {
  const dir = join(process.cwd(), 'src', 'content', 'guides');
  if (!existsSync(dir)) return [];
  return fg.sync('*.md', { cwd: dir }).map((file) => {
    const fm = matter(readFileSync(join(dir, file), 'utf-8')).data;
    return {
      file,
      target_keyword: String(fm.target_keyword ?? ''),
      last_verified: String(fm.last_verified ?? '1970-01-01'),
      sources: Array.isArray(fm.sources) ? fm.sources.map(String) : []
    };
  });
}

try {
  const violations = runGates({
    states: loadStates(),
    offences: loadOffences(),
    guides: loadGuideMeta(),
    now: new Date()
  });
  if (violations.length) {
    console.error(`GATE FAILED — ${violations.length} violation(s):\n` + violations.map((x) => `  • ${x}`).join('\n'));
    process.exit(1);
  }
  console.log('gate: all quality gates passed');
} catch (e) {
  console.error('GATE FAILED — data load error:\n' + (e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
```

- [ ] **Step 4: Verify gate runs in build**

Run: `npm run build` (data dirs are empty → loaders read zero files → gate passes).
Expected: "gate: all quality gates passed" then successful Astro build.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: build-blocking quality gates (staleness, sources, keyword/slug dedupe)"
```

---

### Task 4: Seed verified data — 3 states + 10 offences (research task)

**Files:**
- Create: `data/states/delhi.json`, `data/states/telangana.json`, `data/states/maharashtra.json`, `data/fines/*.json` (10 files)

**Interfaces:**
- Consumes: schemas from Task 2 (records must parse), gate from Task 3 (must pass `npm run gate`).
- Produces: real, verified seed records that Tasks 8–10 render. Offence slugs produced (later tasks and `fine_overrides` reference EXACTLY these): `driving-without-helmet`, `driving-without-seatbelt`, `driving-without-licence`, `driving-without-insurance`, `overspeeding`, `drunk-driving`, `dangerous-driving-red-light`, `mobile-phone-while-driving`, `driving-without-rc`, `driving-without-puc`.

**Research rules (apply to every record):** Every fact verified TODAY against official sources only. Starting URLs (verify each still works and says what you claim): `https://echallan.parivahan.gov.in/` (national), `https://traffic.delhipolice.gov.in/` + `https://vcourts.gov.in/` (Delhi; court challans go through Virtual Courts), `https://echallan.tspolice.gov.in/` (Telangana), `https://mahatrafficechallan.gov.in/` (Maharashtra), `https://www.indiacode.nic.in/` (MV Act 1988 as amended by MV Amendment Act 2019 — section-wise penalties), `https://morth.nic.in/` (ministry notifications). If a portal URL redirects, record the FINAL canonical URL. If a fine amount differs by state (e.g., Delhi's notified compounding amounts), put the state amount in that state's `fine_overrides` keyed by offence slug, with the notification/source URL.

- [ ] **Step 1: Research and write the 10 offence records**

Use web search + the official sources above. For each offence: statutory section, current penalty (first + repeat), licence impact, whether commonly compoundable online. Record shape (complete example to match — values shown must themselves be verified before committing):

`data/fines/driving-without-insurance.json`:
```json
{
  "slug": "driving-without-insurance",
  "name": "Driving without insurance",
  "target_keyword": "driving without insurance fine india",
  "mva_section": "Section 196, Motor Vehicles Act 1988 (as amended 2019)",
  "description": "Using a motor vehicle without a valid third-party insurance policy is an offence under Section 196 of the Motor Vehicles Act. The registered owner is liable even if someone else was driving. Insurance status is checked against the IRDAI/Vahan database during e-challan issuance.",
  "base_fine_text": "₹2,000 and/or imprisonment up to 3 months (first offence)",
  "base_fine_min": 2000,
  "base_fine_max": 2000,
  "repeat_fine_text": "₹4,000 (subsequent offence)",
  "licence_impact": "No automatic licence action; court may order community service.",
  "compoundable_online": true,
  "faqs": [
    { "q": "Is the owner or the driver fined for no insurance?", "a": "..." },
    { "q": "Does an expired policy count as no insurance?", "a": "..." }
  ],
  "sources": ["https://www.indiacode.nic.in/...", "https://morth.nic.in/..."],
  "last_verified": "2026-08-12"
}
```
(FAQ answers must be real 40+ char researched answers, `sources` must be the actual deep URLs used.)

- [ ] **Step 2: Research and write the 3 state records**

Target keywords per the owner's Ubersuggest data: telangana → `e challan ts` (246k — the single biggest term in the universe), delhi → `traffic challan in delhi` (110k), maharashtra → `maharashtra e challan`. Walk the actual portals (fetch them) to write `check_steps`/`pay_steps` that match the real UI flow. Delhi note: on-spot/notice payments and Virtual Court flow differ — capture both in `court_challan_process`. Telangana: `echallan.tspolice.gov.in` covers TS Police challans incl. Hyderabad/Cyberabad/Rachakonda. Maharashtra: `mahatrafficechallan.gov.in` plus national portal. Add `fine_overrides` only where the state has notified different compounding amounts (Delhi has a notified schedule — find and cite it).

- [ ] **Step 3: Validate**

Run: `npm run gate` → passes. Run: `npm test` → still green.

- [ ] **Step 4: Commit**

```bash
git add data && git commit -m "data: verified seed records — Delhi, Telangana, Maharashtra + 10 MV Act offences"
```

---

### Task 5: SEO JSON-LD builders (TDD)

**Files:**
- Create: `src/lib/seo.ts`
- Test: `tests/seo.test.ts`

**Interfaces:**
- Consumes: nothing internal (pure functions).
- Produces (all return plain objects ready for `<script type="application/ld+json">`):
  - `orgJsonLd(): object`
  - `websiteJsonLd(): object`
  - `breadcrumbJsonLd(items: { name: string; path: string }[]): object` (paths are site-relative like `/fines/`, function prefixes `https://trafficchallan.com`)
  - `faqJsonLd(faqs: { q: string; a: string }[]): object`
  - `howToJsonLd(name: string, steps: string[]): object`
  - `datasetJsonLd(name: string, description: string, path: string): object`
- Consumed by: Tasks 7, 8, 9, 12.

- [ ] **Step 1: Write failing tests**

`tests/seo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, orgJsonLd, websiteJsonLd, datasetJsonLd } from '../src/lib/seo';

describe('seo builders', () => {
  it('org has name and url', () => {
    const o = orgJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe('https://trafficchallan.com/');
  });
  it('website builder emits WebSite', () => {
    expect((websiteJsonLd() as any)['@type']).toBe('WebSite');
  });
  it('breadcrumb positions are 1-based and absolute', () => {
    const b = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Fines', path: '/fines/' }]) as any;
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[1].item).toBe('https://trafficchallan.com/fines/');
  });
  it('faq maps q/a to Question/Answer', () => {
    const f = faqJsonLd([{ q: 'Q?', a: 'A.' }]) as any;
    expect(f.mainEntity[0]['@type']).toBe('Question');
    expect(f.mainEntity[0].acceptedAnswer.text).toBe('A.');
  });
  it('howto emits ordered HowToSteps', () => {
    const h = howToJsonLd('Check challan', ['One', 'Two']) as any;
    expect(h.step).toHaveLength(2);
    expect(h.step[0]['@type']).toBe('HowToStep');
  });
  it('dataset carries absolute url', () => {
    expect((datasetJsonLd('Fines', 'desc', '/fines/') as any).url).toBe('https://trafficchallan.com/fines/');
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/seo.ts`:
```ts
export const ORIGIN = 'https://trafficchallan.com';
const abs = (path: string) => ORIGIN + (path.startsWith('/') ? path : '/' + path);

export function orgJsonLd() {
  return {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: 'TrafficChallan', url: abs('/'),
    description: 'Independent reference on Indian traffic e-challans: how to check, pay and dispute, with sourced fine schedules.'
  };
}
export function websiteJsonLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'TrafficChallan', url: abs('/') };
}
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path)
    }))
  };
}
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}
export function howToJsonLd(name: string, steps: string[]) {
  return {
    '@context': 'https://schema.org', '@type': 'HowTo', name,
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s }))
  };
}
export function datasetJsonLd(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org', '@type': 'Dataset',
    name, description, url: abs(path), creator: orgJsonLd(), isAccessibleForFree: true, inLanguage: 'en-IN'
  };
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: schema.org JSON-LD builders (Org, WebSite, Breadcrumb, FAQ, HowTo, Dataset)"
```

---

### Task 6: Fine calculator logic (TDD)

**Files:**
- Create: `src/lib/fine-calc.ts`
- Test: `tests/fine-calc.test.ts`

**Interfaces:**
- Consumes: `StateRecord`, `OffenceRecord` types (Task 2).
- Produces: `computeFine(offence: OffenceRecord, state: StateRecord | null, repeat: boolean): FineResult` where `FineResult = { text: string; overridden: boolean; overrideSource?: string; sectionNote: string }`. State override wins over base; `repeat` selects `repeat_fine_text` when no override. Consumed by Task 10 (calculator island).

- [ ] **Step 1: Write failing tests**

`tests/fine-calc.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { computeFine } from '../src/lib/fine-calc';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const offence = {
  slug: 'driving-without-helmet', name: 'No helmet', target_keyword: 'x',
  mva_section: 'Section 194D', description: 'D'.repeat(100),
  base_fine_text: '₹1,000', base_fine_min: 1000, base_fine_max: 1000,
  repeat_fine_text: '₹1,500', licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question?', a: 'A'.repeat(50) }, { q: 'Question2?', a: 'B'.repeat(50) }],
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as OffenceRecord;

const stateWithOverride = {
  fine_overrides: { 'driving-without-helmet': { amount_text: '₹500 (Delhi notified)', source: 'https://d.gov.in/' } }
} as unknown as StateRecord;

describe('computeFine', () => {
  it('returns base fine with no state', () => {
    const r = computeFine(offence, null, false);
    expect(r.text).toBe('₹1,000');
    expect(r.overridden).toBe(false);
    expect(r.sectionNote).toContain('194D');
  });
  it('returns repeat fine when repeat=true', () => {
    expect(computeFine(offence, null, true).text).toBe('₹1,500');
  });
  it('state override wins over base and repeat', () => {
    const r = computeFine(offence, stateWithOverride, true);
    expect(r.text).toBe('₹500 (Delhi notified)');
    expect(r.overridden).toBe(true);
    expect(r.overrideSource).toBe('https://d.gov.in/');
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/fine-calc.ts`:
```ts
import type { StateRecord, OffenceRecord } from './schemas';

export interface FineResult { text: string; overridden: boolean; overrideSource?: string; sectionNote: string }

export function computeFine(offence: OffenceRecord, state: StateRecord | null, repeat: boolean): FineResult {
  const sectionNote = `${offence.mva_section}. ${offence.licence_impact}`;
  const override = state?.fine_overrides[offence.slug];
  if (override) {
    return { text: override.amount_text, overridden: true, overrideSource: override.source, sectionNote };
  }
  return { text: repeat ? offence.repeat_fine_text : offence.base_fine_text, overridden: false, sectionNote };
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: fine calculator pure logic with state override precedence"
```

---

### Task 7: Base layout, global CSS, core components

**Files:**
- Create: `src/layouts/Base.astro`, `src/styles/global.css` (replace empty), `src/components/AnswerBox.astro`, `src/components/LastVerified.astro`, `src/components/SourceList.astro`, `src/components/FaqSection.astro`, `src/components/StepList.astro`, `src/components/Breadcrumbs.astro`
- Test: `npm run build` + manual `npm run dev` inspection

**Interfaces:**
- Consumes: `orgJsonLd`, `websiteJsonLd`, `breadcrumbJsonLd` (Task 5).
- Produces component contracts consumed by Tasks 8, 9, 10, 12, 13, 19:
  - `Base.astro` props: `{ title: string; description: string; path: string; jsonld?: object[]; breadcrumbs?: { name: string; path: string }[] }` — renders full HTML shell, canonical `https://trafficchallan.com{path}`, nav, footer with disclaimer, Org+WebSite JSON-LD always, plus given jsonld and breadcrumb JSON-LD + visible breadcrumb bar.
  - `AnswerBox.astro` props `{ }` with slot — visually distinct direct-answer box, first element after H1.
  - `LastVerified.astro` props `{ date: string }` → "Last verified: 12 Aug 2026" `<p class="verified">`.
  - `SourceList.astro` props `{ sources: string[] }` → "Sources" heading + outbound links (rel="noopener nofollow").
  - `FaqSection.astro` props `{ faqs: { q: string; a: string }[] }` → H2 "Frequently asked questions" + `<details>` items.
  - `StepList.astro` props `{ steps: string[] }` → `<ol class="steps">`.
  - `Breadcrumbs.astro` props `{ items: { name: string; path: string }[] }` → visible breadcrumb nav.

- [ ] **Step 1: Write global.css (mobile-first, minimal)**

`src/styles/global.css`:
```css
:root {
  --ink: #1a1a1a; --muted: #555; --bg: #ffffff; --accent: #0b57d0;
  --box: #f2f6ff; --border: #d9dee7; --warn-bg: #fff8e6;
  font-size: 16px;
}
* { box-sizing: border-box; }
body { margin: 0; color: var(--ink); background: var(--bg);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.65; }
main { max-width: 760px; margin: 0 auto; padding: 0 1rem 3rem; }
h1 { font-size: 1.75rem; line-height: 1.25; margin: 1.2rem 0 0.6rem; }
h2 { font-size: 1.3rem; margin-top: 2rem; }
a { color: var(--accent); }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem; }
th, td { border: 1px solid var(--border); padding: 0.5rem 0.6rem; text-align: left; }
th { background: var(--box); }
.table-wrap { overflow-x: auto; }
.answer-box { background: var(--box); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.9rem 1rem; margin: 0.8rem 0 1.2rem; font-size: 1.05rem; }
.verified { color: var(--muted); font-size: 0.85rem; }
.steps li { margin: 0.5rem 0; }
.site-header { border-bottom: 1px solid var(--border); }
.site-header .inner, .site-footer .inner { max-width: 760px; margin: 0 auto; padding: 0.7rem 1rem;
  display: flex; flex-wrap: wrap; gap: 0.9rem; align-items: center; }
.site-header a { text-decoration: none; color: var(--ink); }
.site-header .brand { font-weight: 700; font-size: 1.05rem; margin-right: auto; }
.site-footer { border-top: 1px solid var(--border); margin-top: 3rem; color: var(--muted); font-size: 0.85rem; }
.site-footer .inner { display: block; padding: 1.2rem 1rem 2rem; }
.disclaimer { background: var(--warn-bg); border: 1px solid var(--border); border-radius: 8px;
  padding: 0.6rem 0.9rem; font-size: 0.85rem; color: var(--muted); margin-top: 1rem; }
.breadcrumbs { font-size: 0.85rem; color: var(--muted); margin: 0.8rem 0 0; }
.breadcrumbs a { color: var(--muted); }
details { border: 1px solid var(--border); border-radius: 8px; padding: 0.6rem 0.9rem; margin: 0.5rem 0; }
details summary { cursor: pointer; font-weight: 600; }
```

- [ ] **Step 2: Write Base.astro**

`src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';
import { orgJsonLd, websiteJsonLd, breadcrumbJsonLd, ORIGIN } from '../lib/seo';
import Breadcrumbs from '../components/Breadcrumbs.astro';

interface Props {
  title: string; description: string; path: string;
  jsonld?: object[]; breadcrumbs?: { name: string; path: string }[];
}
const { title, description, path, jsonld = [], breadcrumbs } = Astro.props;
const canonical = ORIGIN + path;
const blocks = [orgJsonLd(), websiteJsonLd(), ...(breadcrumbs ? [breadcrumbJsonLd(breadcrumbs)] : []), ...jsonld];
---
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | TrafficChallan</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content={ORIGIN + '/og-default.png'} />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  {blocks.map((b) => <script type="application/ld+json" set:html={JSON.stringify(b)} />)}
</head>
<body>
  <header class="site-header">
    <div class="inner">
      <a href="/" class="brand">TrafficChallan</a>
      <a href="/fines/">Fines &amp; Penalties</a>
      <a href="/calculator/">Calculator</a>
      <a href="/about/">About</a>
    </div>
  </header>
  <main>
    {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
    <slot />
    <p class="disclaimer">TrafficChallan.com is an independent information website, not affiliated with any government body. Challan payments happen only on official government portals we link to.</p>
  </main>
  <footer class="site-footer">
    <div class="inner">
      <p>© {new Date().getFullYear()} TrafficChallan · By Team TrafficChallan ·
        <a href="/editorial-policy/">Editorial policy</a> · <a href="/privacy/">Privacy</a> · <a href="/contact/">Contact</a></p>
    </div>
  </footer>
</body>
</html>
```

- [ ] **Step 3: Write the small components**

`src/components/AnswerBox.astro`:
```astro
<div class="answer-box"><slot /></div>
```

`src/components/LastVerified.astro`:
```astro
---
interface Props { date: string }
const { date } = Astro.props;
const pretty = new Date(date + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
---
<p class="verified">Last verified: {pretty}</p>
```

`src/components/SourceList.astro`:
```astro
---
interface Props { sources: string[] }
const { sources } = Astro.props;
---
<section>
  <h2>Sources</h2>
  <ul>{sources.map((s) => <li><a href={s} rel="noopener nofollow">{new URL(s).hostname}</a> — {s}</li>)}</ul>
</section>
```

`src/components/FaqSection.astro`:
```astro
---
interface Props { faqs: { q: string; a: string }[] }
const { faqs } = Astro.props;
---
<section>
  <h2>Frequently asked questions</h2>
  {faqs.map((f) => <details><summary>{f.q}</summary><p>{f.a}</p></details>)}
</section>
```

`src/components/StepList.astro`:
```astro
---
interface Props { steps: string[] }
const { steps } = Astro.props;
---
<ol class="steps">{steps.map((s) => <li>{s}</li>)}</ol>
```

`src/components/Breadcrumbs.astro`:
```astro
---
interface Props { items: { name: string; path: string }[] }
const { items } = Astro.props;
---
<nav class="breadcrumbs" aria-label="Breadcrumb">
  {items.map((it, i) => <>
    {i > 0 && ' › '}
    {i < items.length - 1 ? <a href={it.path}>{it.name}</a> : <span>{it.name}</span>}
  </>)}
</nav>
```

- [ ] **Step 4: Verify build**

Update `src/pages/index.astro` to use the layout minimally:
```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Check & Pay Traffic e-Challan Online in India" description="Independent guide to checking and paying Indian traffic e-challans, with sourced state-wise fine schedules." path="/">
  <h1>TrafficChallan</h1>
  <p>Launching soon.</p>
</Base>
```
Run: `npm run build` → succeeds. `npm run dev` → visually check header/footer/disclaimer render.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: base layout, global styles, core content components"
```

---

### Task 8: State pages via combined dynamic route

**Files:**
- Create: `src/pages/[slug].astro`, `src/components/FineTable.astro`
- Test: build output assertions (see Step 3)

**Interfaces:**
- Consumes: `loadStates`, `loadOffences` (Task 2), `faqJsonLd`, `howToJsonLd` (Task 5), all Task 7 components.
- Produces: `/{state.slug}-e-challan/` pages. `getStaticPaths` returns entries `{ params: { slug }, props: { type: 'state', state } }` — Task 12 EXTENDS this same file's `getStaticPaths` with `{ type: 'guide', ... }` entries; keep the `type` discriminator switch in the template.
- `FineTable.astro` props: `{ offences: OffenceRecord[]; state?: StateRecord }` — renders offence/section/first-offence/repeat columns; when `state` given, an extra "In {state.name}" column showing `fine_overrides` amount or "standard".

- [ ] **Step 1: Write FineTable.astro**

```astro
---
import type { StateRecord, OffenceRecord } from '../lib/schemas';
interface Props { offences: OffenceRecord[]; state?: StateRecord }
const { offences, state } = Astro.props;
---
<div class="table-wrap">
<table>
  <thead>
    <tr>
      <th>Offence</th><th>Section</th><th>First offence</th><th>Repeat</th>
      {state && <th>In {state.name}</th>}
    </tr>
  </thead>
  <tbody>
    {offences.map((o) => (
      <tr>
        <td><a href={`/fines/${o.slug}/`}>{o.name}</a></td>
        <td>{o.mva_section.replace(', Motor Vehicles Act 1988', '').replace(' (as amended 2019)', '')}</td>
        <td>{o.base_fine_text}</td>
        <td>{o.repeat_fine_text}</td>
        {state && <td>{state.fine_overrides[o.slug]?.amount_text ?? 'Standard amount'}</td>}
      </tr>
    ))}
  </tbody>
</table>
</div>
```

- [ ] **Step 2: Write [slug].astro (state branch only for now)**

`src/pages/[slug].astro`:
```astro
---
import Base from '../layouts/Base.astro';
import AnswerBox from '../components/AnswerBox.astro';
import LastVerified from '../components/LastVerified.astro';
import SourceList from '../components/SourceList.astro';
import FaqSection from '../components/FaqSection.astro';
import StepList from '../components/StepList.astro';
import FineTable from '../components/FineTable.astro';
import { loadStates, loadOffences } from '../lib/data';
import { faqJsonLd, howToJsonLd } from '../lib/seo';
import type { StateRecord } from '../lib/schemas';

export async function getStaticPaths() {
  return loadStates().map((state) => ({
    params: { slug: `${state.slug}-e-challan` },
    props: { type: 'state' as const, state }
  }));
}

interface Props { type: 'state'; state: StateRecord }
const { state } = Astro.props;
const offences = loadOffences();
const year = new Date().getFullYear();
const path = `/${state.slug}-e-challan/`;
const primaryPortal = state.portals[0];
const jsonld = [
  howToJsonLd(`How to check ${state.name} e-challan`, state.check_steps),
  faqJsonLd(state.faqs)
];
---
<Base
  title={`${state.name} e-Challan ${year}: Check Status & Pay Online`}
  description={`How to check and pay ${state.name} traffic e-challans online — official portals, step-by-step process, fine amounts and FAQs. Independently verified.`}
  path={path}
  jsonld={jsonld}
  breadcrumbs={[{ name: 'Home', path: '/' }, { name: `${state.name} e-Challan`, path }]}
>
  <h1>{state.name} e-Challan: Check Status &amp; Pay Online</h1>
  <AnswerBox>
    To check a traffic challan in {state.name}, enter your vehicle number on
    <a href={primaryPortal.url} rel="noopener">{primaryPortal.label}</a> or the national portal
    <a href="https://echallan.parivahan.gov.in/" rel="noopener">echallan.parivahan.gov.in</a>.
    Payment is done on the same official portal via {state.payment_methods.join(', ')}.
  </AnswerBox>
  <LastVerified date={state.last_verified} />

  <h2>How to check your {state.name} challan</h2>
  <StepList steps={state.check_steps} />

  <h2>How to pay a {state.name} challan online</h2>
  <StepList steps={state.pay_steps} />

  <h2>Official portals for {state.name}</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>Portal</th><th>Use for</th></tr></thead>
    <tbody>{state.portals.map((p) => <tr><td><a href={p.url} rel="noopener">{p.label}</a></td><td>{p.scope === 'both' ? 'Check & pay' : p.scope}</td></tr>)}</tbody>
  </table></div>

  {state.sms_app_methods.length > 0 && <>
    <h2>Check by SMS or app</h2>
    <ul>{state.sms_app_methods.map((m) => <li>{m}</li>)}</ul>
  </>}

  <h2>Court challans in {state.name}</h2>
  <p>{state.court_challan_process}</p>

  <h2>Traffic fine amounts in {state.name}</h2>
  <FineTable offences={offences} state={state} />

  {state.quirks.length > 0 && <>
    <h2>Things specific to {state.name}</h2>
    <ul>{state.quirks.map((q) => <li>{q}</li>)}</ul>
  </>}

  <FaqSection faqs={state.faqs} />
  <SourceList sources={state.sources} />
</Base>
```

- [ ] **Step 3: Verify build output**

Run: `npm run build`
Expected: `dist/delhi-e-challan/index.html`, `dist/telangana-e-challan/index.html`, `dist/maharashtra-e-challan/index.html` exist. Grep one:
Run (Git Bash): `grep -c 'application/ld+json' dist/delhi-e-challan/index.html` → ≥4 (Org, WebSite, Breadcrumb, HowTo, FAQ). `grep -c 'answer-box' dist/delhi-e-challan/index.html` → ≥1.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: state e-challan pages rendered from data layer"
```

---

### Task 9: Offence pages + fines hub

**Files:**
- Create: `src/pages/fines/[offence].astro`, `src/pages/fines/index.astro`
- Test: build output assertions

**Interfaces:**
- Consumes: `loadStates`, `loadOffences` (Task 2), `faqJsonLd`, `datasetJsonLd` (Task 5), Task 7 components, `FineTable` (Task 8).
- Produces: `/fines/{offence.slug}/` pages and `/fines/` hub.

- [ ] **Step 1: Write offence page**

`src/pages/fines/[offence].astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import AnswerBox from '../../components/AnswerBox.astro';
import LastVerified from '../../components/LastVerified.astro';
import SourceList from '../../components/SourceList.astro';
import FaqSection from '../../components/FaqSection.astro';
import { loadStates, loadOffences } from '../../lib/data';
import { faqJsonLd } from '../../lib/seo';
import type { OffenceRecord } from '../../lib/schemas';

export async function getStaticPaths() {
  return loadOffences().map((offence) => ({
    params: { offence: offence.slug },
    props: { offence }
  }));
}
interface Props { offence: OffenceRecord }
const { offence } = Astro.props;
const states = loadStates();
const overriding = states.filter((s) => offence.slug in s.fine_overrides);
const path = `/fines/${offence.slug}/`;
---
<Base
  title={`${offence.name}: Fine Amount & Rules`}
  description={`${offence.name} under the Motor Vehicles Act — current fine (first and repeat offence), licence impact and how to pay. Independently verified.`}
  path={path}
  jsonld={[faqJsonLd(offence.faqs)]}
  breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Fines', path: '/fines/' }, { name: offence.name, path }]}
>
  <h1>{offence.name}: fine amount and rules</h1>
  <AnswerBox>
    The fine for {offence.name.toLowerCase()} is {offence.base_fine_text} for a first offence
    ({offence.mva_section}); a repeat offence costs {offence.repeat_fine_text}. {offence.licence_impact}
  </AnswerBox>
  <LastVerified date={offence.last_verified} />

  <h2>What the law says</h2>
  <p>{offence.description}</p>

  <h2>Fine amounts</h2>
  <div class="table-wrap"><table>
    <thead><tr><th></th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>First offence</td><td>{offence.base_fine_text}</td></tr>
      <tr><td>Repeat offence</td><td>{offence.repeat_fine_text}</td></tr>
      <tr><td>Licence impact</td><td>{offence.licence_impact}</td></tr>
      <tr><td>Payable online</td><td>{offence.compoundable_online ? 'Yes, on official e-challan portals' : 'Usually requires court appearance'}</td></tr>
    </tbody>
  </table></div>

  {overriding.length > 0 && <>
    <h2>States with different notified amounts</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>State</th><th>Amount</th></tr></thead>
      <tbody>{overriding.map((s) => <tr>
        <td><a href={`/${s.slug}-e-challan/`}>{s.name}</a></td>
        <td>{s.fine_overrides[offence.slug].amount_text}</td>
      </tr>)}</tbody>
    </table></div>
  </>}

  <FaqSection faqs={offence.faqs} />
  <SourceList sources={offence.sources} />
</Base>
```

- [ ] **Step 2: Write fines hub**

`src/pages/fines/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import AnswerBox from '../../components/AnswerBox.astro';
import FineTable from '../../components/FineTable.astro';
import { loadOffences, loadStates } from '../../lib/data';
import { datasetJsonLd } from '../../lib/seo';

const offences = loadOffences();
const newest = offences.map((o) => o.last_verified).sort().at(-1)!;
const year = new Date().getFullYear();
---
<Base
  title={`Traffic Fine List India ${year}: All Challan Amounts (MV Act)`}
  description={`Complete list of Indian traffic fines under the Motor Vehicles Act ${year} — offence, section, first and repeat penalty. Sourced and independently verified.`}
  path="/fines/"
  jsonld={[datasetJsonLd('Indian traffic fine schedule (MV Act, as amended)', 'Offence-wise penalties under the Motor Vehicles Act with state variations, sourced from official notifications.', '/fines/')]}
  breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Fines', path: '/fines/' }]}
>
  <h1>Traffic fine list: every challan amount in India</h1>
  <AnswerBox>
    Traffic fines in India are set by the Motor Vehicles Act (amended 2019). Common penalties: riding
    without a helmet or driving without a licence or insurance run from ₹1,000 to ₹5,000 for a first
    offence. Some states have notified different amounts — each offence page lists them.
  </AnswerBox>
  <p class="verified">Table last verified: {newest}</p>
  <FineTable offences={offences} />
  <p>Select any offence for the exact legal section, repeat-offence penalty, licence consequences and state-wise variations.</p>
</Base>
```

- [ ] **Step 3: Verify build output**

Run: `npm run build`
Expected: `dist/fines/index.html` + one directory per offence slug (10). Grep: `grep -c 'Dataset' dist/fines/index.html` → ≥1.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: offence fine pages and fines hub with Dataset markup"
```

---

### Task 10: Calculator page (vanilla island)

**Files:**
- Create: `src/pages/calculator.astro`
- Test: `npm run build` + manual dev-server interaction; logic already unit-tested (Task 6)

**Interfaces:**
- Consumes: `loadStates`, `loadOffences` (Task 2), `computeFine` (Task 6), Task 7 components.
- Produces: `/calculator/` page with client-side offence×state×repeat lookup, no framework — a `<script>` module importing `computeFine` and reading inlined JSON.

- [ ] **Step 1: Write calculator.astro**

```astro
---
import Base from '../layouts/Base.astro';
import AnswerBox from '../components/AnswerBox.astro';
import { loadStates, loadOffences } from '../lib/data';

const states = loadStates();
const offences = loadOffences();
const calcData = {
  offences: offences.map((o) => ({
    slug: o.slug, name: o.name, mva_section: o.mva_section, licence_impact: o.licence_impact,
    base_fine_text: o.base_fine_text, repeat_fine_text: o.repeat_fine_text
  })),
  states: states.map((s) => ({ slug: s.slug, name: s.name, fine_overrides: s.fine_overrides }))
};
---
<Base
  title="Traffic Fine Calculator: What Will Your Challan Cost?"
  description="Pick an offence and state to see the current challan amount under the Motor Vehicles Act, including state-notified variations and repeat-offence penalties."
  path="/calculator/"
  breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Fine calculator', path: '/calculator/' }]}
>
  <h1>Traffic fine calculator</h1>
  <AnswerBox>
    Choose the offence and your state to see the current fine amount, including any state-notified
    variation and the repeat-offence penalty. Amounts come from our sourced fine dataset.
  </AnswerBox>

  <form id="calc" class="answer-box" style="display:grid;gap:0.8rem;">
    <label>Offence
      <select id="offence" style="width:100%;padding:0.4rem;">
        {calcData.offences.map((o) => <option value={o.slug}>{o.name}</option>)}
      </select>
    </label>
    <label>State
      <select id="state" style="width:100%;padding:0.4rem;">
        <option value="">All-India standard</option>
        {calcData.states.map((s) => <option value={s.slug}>{s.name}</option>)}
      </select>
    </label>
    <label><input type="checkbox" id="repeat" /> Repeat offence</label>
    <output id="result" style="font-size:1.15rem;font-weight:600;"></output>
    <p id="note" class="verified"></p>
  </form>

  <script type="application/json" id="calc-data" set:html={JSON.stringify(calcData)} />
  <script>
    import { computeFine } from '../lib/fine-calc';
    const data = JSON.parse(document.getElementById('calc-data')!.textContent!);
    const $ = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
    function update() {
      const offence = data.offences.find((o: any) => o.slug === $('offence').value);
      const state = data.states.find((s: any) => s.slug === $('state').value) ?? null;
      const r = computeFine(offence, state, ($('repeat') as HTMLInputElement).checked);
      document.getElementById('result')!.textContent = r.text;
      document.getElementById('note')!.textContent =
        r.sectionNote + (r.overridden ? ' State-notified amount.' : '');
    }
    ['offence', 'state', 'repeat'].forEach((id) => $(id).addEventListener('change', update));
    update();
  </script>
</Base>
```

Note: `computeFine` only touches the fields present in the trimmed `calcData` objects, so the structural cast is safe; if TypeScript complains in the script block, cast via `as any` at the call site.

- [ ] **Step 2: Verify**

Run: `npm run build` → succeeds; `dist/calculator/index.html` exists and contains `calc-data`.
Run: `npm run dev`, open /calculator/, switch offence/state/repeat → result updates without page reload.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: client-side fine calculator over static dataset"
```

---

### Task 11: Internal-linking engine (TDD) + wiring

**Files:**
- Create: `src/lib/links.ts`, `src/components/RelatedLinks.astro`
- Modify: `src/pages/[slug].astro`, `src/pages/fines/[offence].astro` (append RelatedLinks before FaqSection)
- Test: `tests/links.test.ts`

**Interfaces:**
- Consumes: `StateRecord`, `OffenceRecord` (Task 2).
- Produces: `relatedForState(state, offences, guideSlugs): LinkItem[]` and `relatedForOffence(offence, states, guideSlugs): LinkItem[]` where `LinkItem = { href: string; label: string }`; deterministic, ≤8 items, always includes `/fines/` (state pages) and ≥2 state links (offence pages). `guideSlugs: string[]` may be empty (guides arrive in Task 12). `RelatedLinks.astro` props `{ items: LinkItem[] }`.

- [ ] **Step 1: Write failing tests**

`tests/links.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { relatedForState, relatedForOffence } from '../src/lib/links';
import type { StateRecord, OffenceRecord } from '../src/lib/schemas';

const mkOffence = (slug: string): OffenceRecord => ({
  slug, name: slug, target_keyword: slug, mva_section: 'S', description: 'D'.repeat(100),
  base_fine_text: '₹1', base_fine_min: 1, base_fine_max: 1, repeat_fine_text: '₹2',
  licence_impact: 'None', compoundable_online: true,
  faqs: [{ q: 'Question?', a: 'A'.repeat(50) }, { q: 'Question2?', a: 'B'.repeat(50) }],
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as OffenceRecord);

const mkState = (slug: string, overrides: string[] = []): StateRecord => ({
  slug, name: slug.toUpperCase(), target_keyword: slug, portals: [{ label: 'P', url: 'https://x.gov.in/', scope: 'both' }],
  check_steps: ['Step number one', 'Step number two', 'Step number three'],
  pay_steps: ['Step number one', 'Step number two', 'Step number three'],
  sms_app_methods: [], court_challan_process: 'C'.repeat(120), payment_methods: ['UPI'],
  contacts: [], quirks: [],
  faqs: [{ q: 'Question one?', a: 'A'.repeat(50) }, { q: 'Question two?', a: 'B'.repeat(50) }, { q: 'Question three?', a: 'C'.repeat(50) }],
  fine_overrides: Object.fromEntries(overrides.map((o) => [o, { amount_text: '₹1', source: 'https://x.gov.in/' }])),
  sources: ['https://x.gov.in/'], last_verified: '2026-08-01'
} as StateRecord);

describe('relatedForState', () => {
  it('prioritizes overridden offences, caps at 8, includes fines hub', () => {
    const offences = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map(mkOffence);
    const items = relatedForState(mkState('delhi', ['h', 'i']), offences, []);
    expect(items.length).toBeLessThanOrEqual(8);
    expect(items.some((l) => l.href === '/fines/')).toBe(true);
    expect(items[0].href).toBe('/fines/h/');
  });
});

describe('relatedForOffence', () => {
  it('links states with overrides first, then others, ≥2 states', () => {
    const states = [mkState('delhi'), mkState('telangana', ['x']), mkState('maharashtra')];
    const items = relatedForOffence(mkOffence('x'), states, []);
    expect(items[0].href).toBe('/telangana-e-challan/');
    expect(items.filter((l) => l.href.endsWith('-e-challan/')).length).toBeGreaterThanOrEqual(2);
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement**

`src/lib/links.ts`:
```ts
import type { StateRecord, OffenceRecord } from './schemas';

export interface LinkItem { href: string; label: string }

export function relatedForState(state: StateRecord, offences: OffenceRecord[], guideSlugs: string[]): LinkItem[] {
  const overridden = offences.filter((o) => o.slug in state.fine_overrides);
  const rest = offences.filter((o) => !(o.slug in state.fine_overrides));
  const picks = [...overridden, ...rest].slice(0, 5);
  return [
    ...picks.map((o) => ({ href: `/fines/${o.slug}/`, label: `${o.name}: fine amount` })),
    { href: '/fines/', label: 'Full traffic fine list' },
    ...guideSlugs.slice(0, 2).map((g) => ({ href: `/${g}/`, label: g.replace(/-/g, ' ') }))
  ].slice(0, 8);
}

export function relatedForOffence(offence: OffenceRecord, states: StateRecord[], guideSlugs: string[]): LinkItem[] {
  const withOverride = states.filter((s) => offence.slug in s.fine_overrides);
  const rest = states.filter((s) => !(offence.slug in s.fine_overrides));
  const picks = [...withOverride, ...rest].slice(0, 5);
  return [
    ...picks.map((s) => ({ href: `/${s.slug}-e-challan/`, label: `${s.name} e-challan: check & pay` })),
    { href: '/calculator/', label: 'Fine calculator' },
    ...guideSlugs.slice(0, 2).map((g) => ({ href: `/${g}/`, label: g.replace(/-/g, ' ') }))
  ].slice(0, 8);
}
```

`src/components/RelatedLinks.astro`:
```astro
---
import type { LinkItem } from '../lib/links';
interface Props { items: LinkItem[] }
const { items } = Astro.props;
---
<section>
  <h2>Related</h2>
  <ul>{items.map((l) => <li><a href={l.href}>{l.label}</a></li>)}</ul>
</section>
```

Run: `npm test` → PASS.

- [ ] **Step 3: Wire into templates**

In `src/pages/[slug].astro` state branch, before `<FaqSection ...>`:
```astro
<RelatedLinks items={relatedForState(state, offences, [])} />
```
In `src/pages/fines/[offence].astro`, before `<FaqSection ...>`:
```astro
<RelatedLinks items={relatedForOffence(offence, states, [])} />
```
(with the matching imports). The empty `[]` guide list gets replaced in Task 12.

Run: `npm run build` → succeeds; grep `Related` appears in `dist/delhi-e-challan/index.html`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: deterministic internal-linking engine wired into state and offence pages"
```

---

### Task 12: Guides content collection + rendering

**Files:**
- Create: `src/content.config.ts`, `src/content/guides/.gitkeep`, `src/components/GuideLayoutBody.astro` (optional helper — skip if unneeded)
- Modify: `src/pages/[slug].astro` (extend getStaticPaths + add guide branch), `src/lib/links.ts` callers (pass real guide slugs)
- Test: temporary sample guide builds, then deleted (real guides arrive in Task 18)

**Interfaces:**
- Consumes: Task 7 components, `faqJsonLd` (Task 5).
- Produces: markdown guides in `src/content/guides/*.md` render at `/{filename-without-md}/`. Frontmatter contract (also enforced by gate Task 3):
  ```yaml
  title: string            # H1 + <title>
  description: string      # meta description ≤160 chars
  target_keyword: string
  last_verified: YYYY-MM-DD
  sources: [url, ...]      # ≥1
  faqs:                    # optional
    - q: string
      a: string
  ```

- [ ] **Step 1: Content collection config**

`src/content.config.ts`:
```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string().min(10),
    description: z.string().min(50).max(160),
    target_keyword: z.string().min(3),
    last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sources: z.array(z.string().url()).min(1),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).default([])
  })
});
export const collections = { guides };
```

- [ ] **Step 2: Extend [slug].astro**

Replace `getStaticPaths` and the props interface in `src/pages/[slug].astro`:
```astro
---
// ...existing imports...
import { getCollection, render } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export async function getStaticPaths() {
  const statePaths = loadStates().map((state) => ({
    params: { slug: `${state.slug}-e-challan` },
    props: { type: 'state' as const, state, guide: undefined }
  }));
  const guides = await getCollection('guides');
  const guidePaths = guides.map((guide) => ({
    params: { slug: guide.id },
    props: { type: 'guide' as const, state: undefined, guide }
  }));
  return [...statePaths, ...guidePaths];
}

type Props =
  | { type: 'state'; state: StateRecord; guide: undefined }
  | { type: 'guide'; state: undefined; guide: CollectionEntry<'guides'> };
const props = Astro.props;
const guideSlugs = (await getCollection('guides')).map((g) => g.id);
---
{props.type === 'state' ? (
  /* existing state markup, with RelatedLinks now: relatedForState(props.state, offences, guideSlugs) */
) : (
  /* guide branch below */
)}
```

Guide branch markup:
```astro
---
const { guide } = props;
const { Content } = await render(guide);
const path = `/${guide.id}/`;
---
<Base
  title={guide.data.title}
  description={guide.data.description}
  path={path}
  jsonld={guide.data.faqs.length ? [faqJsonLd(guide.data.faqs)] : []}
  breadcrumbs={[{ name: 'Home', path: '/' }, { name: guide.data.title, path }]}
>
  <h1>{guide.data.title}</h1>
  <LastVerified date={guide.data.last_verified} />
  <Content />
  {guide.data.faqs.length > 0 && <FaqSection faqs={guide.data.faqs} />}
  <SourceList sources={guide.data.sources} />
</Base>
```
Note: Astro components can't early-return; structure the file as one template with a ternary or two clearly separated conditional blocks. Guides open with an AnswerBox authored IN the markdown itself (first element: `<div class="answer-box">...</div>` — raw HTML in markdown is fine).

- [ ] **Step 3: Verify with a throwaway guide**

Create `src/content/guides/test-guide.md`:
```markdown
---
title: "Test guide for build verification"
description: "Temporary guide used to verify the guides collection renders through the combined dynamic route correctly."
target_keyword: "test guide tc"
last_verified: "2026-08-12"
sources: ["https://echallan.parivahan.gov.in/"]
---
<div class="answer-box">Direct answer paragraph.</div>

Body text.
```
Run: `npm run gate && npm run build` → `dist/test-guide/index.html` exists. Then DELETE the file:
`rm src/content/guides/test-guide.md`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: guides content collection rendered through combined dynamic route"
```

---

### Task 13: Trust pages (About, Editorial policy, Contact, Privacy)

**Files:**
- Create: `src/pages/about.astro`, `src/pages/editorial-policy.astro`, `src/pages/contact.astro`, `src/pages/privacy.astro`
- Test: build output exists

**Interfaces:**
- Consumes: `Base` layout (Task 7).
- Produces: the four AdSense-prerequisite trust pages. Contact email: `contact@trafficchallan.com` (routed via Cloudflare Email Routing — user step in SETUP.md, Task 16).

- [ ] **Step 1: Write the four pages**

Each uses `Base` with breadcrumbs `[Home, <Page>]`. Required content (write full, real prose — 150–400 words each, brand voice, no placeholders):
- **about.astro** (`/about/`): what the site is (independent reference on Indian traffic e-challans), what it is NOT (not a government site, never collects payments), how data is maintained (every fact sourced to official portals/notifications, dated `last_verified`, 90-day re-verification policy), who runs it ("Team TrafficChallan").
- **editorial-policy.astro** (`/editorial-policy/`): sources policy (official government sources only for facts), correction policy (email contact@trafficchallan.com, corrections within 7 days), update policy (automated re-verification cycle, dates shown on every page), AI-assistance disclosure (content is researched and drafted with AI assistance and held to the sourcing standards above — honest, not hidden).
- **contact.astro** (`/contact/`): contact email, what to report (wrong fine amount, dead portal link, correction requests), expected response time.
- **privacy.astro** (`/privacy/`): no accounts, no personal data collected by the site itself, links to official portals have their own policies, privacy-respecting analytics (Cloudflare Web Analytics, cookieless) if enabled, contact for privacy questions. Include a section placeholder-free statement that advertising, if later introduced, will update this policy.

- [ ] **Step 2: Verify + commit**

Run: `npm run build` → all four dirs in `dist/`.
```bash
git add -A && git commit -m "content: trust pages — about, editorial policy, contact, privacy"
```

---

### Task 14: Site plumbing — llms.txt, 404, OG image, favicon, headers

**Files:**
- Create: `src/pages/llms.txt.ts`, `src/pages/404.astro`, `public/favicon.svg`, `public/_headers`, `scripts/make-og.ts` (one-off), `public/og-default.png` (generated)
- Test: build output checks

**Interfaces:**
- Consumes: `loadStates`, `loadOffences` (Task 2).
- Produces: `/llms.txt` (generated from data at build), 404 page, favicon, default OG image, Cloudflare `_headers`.

- [ ] **Step 1: llms.txt endpoint**

`src/pages/llms.txt.ts`:
```ts
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
```

- [ ] **Step 2: 404, favicon, headers**

`src/pages/404.astro`: Base layout, title "Page not found", links to `/`, `/fines/`, `/calculator/`.

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0b57d0"/><text x="16" y="22" font-family="system-ui" font-size="16" font-weight="700" fill="#fff" text-anchor="middle">TC</text></svg>
```

`public/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
```

- [ ] **Step 3: OG image (one-off script)**

`scripts/make-og.ts` — render a 1200×630 PNG from an inline SVG using sharp (install as devDep for this step: `npm i -D sharp`):
```ts
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b57d0"/>
  <text x="600" y="290" font-family="Segoe UI, sans-serif" font-size="88" font-weight="700" fill="#fff" text-anchor="middle">TrafficChallan</text>
  <text x="600" y="380" font-family="Segoe UI, sans-serif" font-size="36" fill="#cfe0ff" text-anchor="middle">Check &amp; pay Indian traffic e-challans — verified, sourced, current</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('og-default.png written');
```
Run: `npx tsx scripts/make-og.ts` → commit the PNG.

- [ ] **Step 4: Verify + commit**

Run: `npm run build`; check `dist/llms.txt` contains all state slugs, `dist/404.html` exists.
```bash
git add -A && git commit -m "feat: llms.txt endpoint, 404, favicon, OG image, security headers"
```

---

### Task 15: Link checker + publish pipeline + IndexNow

**Files:**
- Create: `src/lib/linkcheck.ts`, `scripts/check-links.ts`, `scripts/publish.ts`, `public/` IndexNow key file (generated once)
- Test: `tests/linkcheck.test.ts`

**Interfaces:**
- Consumes: built `dist/` directory.
- Produces:
  - `extractLocalHrefs(html: string): string[]` and `resolveToDistFile(href: string): string` from `src/lib/linkcheck.ts` (pure, tested).
  - `npm run check:links` — internal check always (exit 1 on broken); `npm run check:links -- --external` also GETs every external href with 15s timeout, 3 retries, UA `TrafficChallanBot/1.0 (+https://trafficchallan.com/about/)`; exit 1 on persistent failure.
  - `npm run publish:site` — full pipeline: `gate` → `astro build` → internal+external link check → `git add -A && git commit` (message from `--message` arg, default `content: scheduled update`) → `git push` → IndexNow ping of changed URLs. Also enforces velocity cap: counts NEW page files (`data/states/*.json`, `data/fines/*.json`, `src/content/guides/*.md`) added in git over the past 7 days; if > 5, abort with error (override flag `--force-velocity` exists but the agent playbook forbids it).
- IndexNow: key = one UUID generated once, stored as `public/<uuid>.txt` containing the uuid; ping via `POST https://api.indexnow.org/indexnow` JSON `{ host, key, urlList }`.

- [ ] **Step 1: Write failing linkcheck tests**

`tests/linkcheck.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractLocalHrefs, resolveToDistFile } from '../src/lib/linkcheck';

describe('extractLocalHrefs', () => {
  it('finds root-relative hrefs, ignores external and anchors', () => {
    const html = `<a href="/fines/">x</a> <a href="https://parivahan.gov.in/">y</a>
      <a href="#top">z</a> <a href="/delhi-e-challan/">d</a>`;
    expect(extractLocalHrefs(html).sort()).toEqual(['/delhi-e-challan/', '/fines/']);
  });
});
describe('resolveToDistFile', () => {
  it('maps directory URLs to index.html', () => {
    expect(resolveToDistFile('/fines/')).toBe('dist/fines/index.html');
    expect(resolveToDistFile('/llms.txt')).toBe('dist/llms.txt');
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement linkcheck lib + CLI**

`src/lib/linkcheck.ts`:
```ts
export function extractLocalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  for (const m of html.matchAll(/href="([^"#]+)"/g)) {
    const h = m[1];
    if (h.startsWith('/')) hrefs.add(h);
  }
  return [...hrefs];
}
export function extractExternalHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    if (!m[1].startsWith('https://trafficchallan.com')) hrefs.add(m[1]);
  }
  return [...hrefs];
}
export function resolveToDistFile(href: string): string {
  const clean = href.split('?')[0];
  if (/\.[a-z0-9]+$/i.test(clean)) return 'dist' + clean;
  return 'dist' + clean.replace(/\/?$/, '/') + 'index.html';
}
```

`scripts/check-links.ts`: glob `dist/**/*.html`, run extractors, verify each internal href's `resolveToDistFile` exists (`existsSync`); with `--external`, fetch each unique external URL (GET, redirect: 'follow', 15_000ms AbortSignal.timeout, 3 attempts with 2s backoff, the UA above; treat any 2xx/3xx as alive, and 403 as alive-with-warning since some gov sites block bots). Print a summary; exit 1 on any internal failure or persistent external failure (non-403).

Run: `npm test` → PASS. Then `npm run build && npm run check:links` → passes on current site.

- [ ] **Step 3: IndexNow key + publish pipeline**

Generate key once (PowerShell): `[guid]::NewGuid().ToString("N")` → save as `public/<key>.txt` whose content is the key itself.

`scripts/publish.ts`:
```ts
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const run = (cmd: string) => execSync(cmd, { stdio: 'inherit' });
const capture = (cmd: string) => execSync(cmd, { encoding: 'utf-8' }).trim();

const msgIdx = process.argv.indexOf('--message');
const message = msgIdx > -1 ? process.argv[msgIdx + 1] : 'content: scheduled update';
const forceVelocity = process.argv.includes('--force-velocity');

// 1. Velocity cap: new page files added in the last 7 days (including uncommitted)
const newInGit = capture(`git log --since="7 days ago" --diff-filter=A --name-only --pretty=format:`)
  .split('\n').filter(Boolean);
const newUncommitted = capture('git ls-files --others --exclude-standard').split('\n').filter(Boolean);
const isPageFile = (f: string) =>
  /^data\/(states|fines)\/.*\.json$/.test(f) || /^src\/content\/guides\/.*\.md$/.test(f);
const newPages = new Set([...newInGit, ...newUncommitted].filter(isPageFile));
if (newPages.size > 5 && !forceVelocity) {
  console.error(`VELOCITY CAP: ${newPages.size} new pages in 7 days (max 5). Aborting.`);
  process.exit(1);
}

// 2. Gates, build, links
run('npm run gate');
run('npx astro build');
run('npm run check:links -- --external');

// 3. Changed URLs for IndexNow (from files about to be committed)
const changed = capture('git status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3));
const urls = new Set<string>();
for (const f of changed) {
  const mState = f.match(/^data\/states\/(.+)\.json$/);
  const mFine = f.match(/^data\/fines\/(.+)\.json$/);
  const mGuide = f.match(/^src\/content\/guides\/(.+)\.md$/);
  if (mState) urls.add(`https://trafficchallan.com/${mState[1]}-e-challan/`);
  if (mFine) urls.add(`https://trafficchallan.com/fines/${mFine[1]}/`);
  if (mGuide) urls.add(`https://trafficchallan.com/${mGuide[1]}/`);
}

// 4. Commit + push
run('git add -A');
run(`git commit -m "${message.replace(/"/g, '\\"')}"`);
run('git push origin main');

// 5. IndexNow ping
const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (keyFile && urls.size) {
  const key = keyFile.replace('.txt', '');
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host: 'trafficchallan.com', key, urlList: [...urls] })
  });
  console.log(`IndexNow: ${res.status} for ${urls.size} url(s)`);
}
console.log('publish: done');
```

- [ ] **Step 4: Verify + commit**

Run: `npm run check:links -- --external` on the built site → passes (gov 403s warn only).
```bash
git add -A && git commit -m "feat: link checker, IndexNow, velocity-capped publish pipeline"
```

---

### Task 16: GitHub push + SETUP.md user handoff

**Files:**
- Create: `SETUP.md`, `README.md`
- Action: create GitHub repo, push

**Interfaces:**
- Produces: remote `origin` on GitHub (`ynreddy7/trafficchallan`, public — Cloudflare Pages free tier works with private too, but public is fine here since no secrets exist in the repo; NOTE: repo must contain zero secrets — IndexNow key is public by design).

- [ ] **Step 1: README.md**

Short: what the repo is, `npm run dev/build/test/publish:site`, pointer to `CONTENT_STANDARDS.md` + `AGENT_PLAYBOOK.md` (Task 21) and `docs/superpowers/specs/`.

- [ ] **Step 2: SETUP.md — the user's one-time checklist (exact steps)**

```markdown
# One-time setup (owner)

## 1. Cloudflare Pages (~10 min)
1. Sign in at dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.
2. Authorize GitHub, pick `ynreddy7/trafficchallan`.
3. Build command: `npm run build`  · Output directory: `dist` · Framework preset: Astro.
4. Deploy. Then Pages project → Custom domains → add `trafficchallan.com`.
5. Add site `trafficchallan.com` to Cloudflare (Free plan) and change nameservers
   at your registrar to the two Cloudflare gives you. Wait for "Active".
6. Bulk Redirects (or a Page Rule): `www.trafficchallan.com/*` → `https://trafficchallan.com/$1` (301).

## 2. Email routing (~3 min)
Cloudflare → Email → Email Routing → enable; route `contact@trafficchallan.com` → ynitishreddy96@gmail.com.

## 3. Search Console (~5 min)
1. search.google.com/search-console → Add property → Domain → `trafficchallan.com`.
2. Copy the TXT record into Cloudflare DNS. Verify.
3. Sitemaps → submit `https://trafficchallan.com/sitemap-index.xml`.

## 4. Bing Webmaster Tools (~2 min)
bing.com/webmasters → Import from Google Search Console.

## 5. (Optional now) Cloudflare Web Analytics
Cloudflare → Analytics → Web Analytics → add site → copy the token → tell Claude to wire it in.

## Later (after ~30 pages indexed)
- AdSense: adsense.google.com → apply with trafficchallan.com.
- Affiliate: ACKO / InsuranceDekho / FASTag partner signups.
```

- [ ] **Step 3: Create repo and push**

```bash
gh repo create ynreddy7/trafficchallan --public --source . --push
```
(If `gh` is not authenticated, `gh auth login` is a user step — flag it and pause.)

- [ ] **Step 4: Commit docs (if not already in push)**

```bash
git add -A && git commit -m "docs: README and owner setup checklist" && git push
```

---

### Task 17: Content batch — remaining 9 launch states (research fan-out)

**Files:**
- Create: `data/states/uttar-pradesh.json`, `karnataka.json`, `tamil-nadu.json`, `andhra-pradesh.json`, `haryana.json`, `rajasthan.json`, `gujarat.json`, `west-bengal.json`, `madhya-pradesh.json`

**Interfaces:**
- Consumes: `StateSchema` (Task 2), gate (Task 3), rendering (Task 8). Same record shape as Task 4's three states — open `data/states/delhi.json` as the reference example.
- Produces: 12 total launch state pages.

- [ ] **Step 1: Research each state (may fan out via Workflow tool — one agent per state, schema-validated output)**

Per state, find and verify: the state's own e-challan portal (some rely wholly on `echallan.parivahan.gov.in` — record that truthfully), real check/pay steps walked on the live portal, court-challan/Lok-Adalat handling, payment methods, helpline contacts, any notified fine deviations (Gujarat notified REDUCED fines in 2019 — capture in `fine_overrides` with the notification source; Karnataka and West Bengal also notified state schedules — verify current amounts). Starting portal candidates to verify (do not trust, verify): UP — parivahan national portal + `uppolice.gov.in` challan section; Karnataka — Bengaluru Traffic Police `btp.karnataka.gov.in` / Karnataka One; Tamil Nadu — `echallan.tnpolice.gov.in`; AP — `apechallan.org` or AP Police portal; Haryana — national portal + `haryanapolice.gov.in`; Rajasthan — national portal; Gujarat — `payechallan.gujarat.gov.in` or police portal; West Bengal — Kolkata Police `kolkatatrafficpolice.gov.in` + national portal; MP — `mptrafficpolice.gov.in` / citizen portal.

- [ ] **Step 2: Validate + review**

Run: `npm run gate` → passes; `npm run build` → 12 state dirs in `dist/`. Human-quality spot check: read 2 random records fully against their cited sources.

- [ ] **Step 3: Commit**

```bash
git add data/states && git commit -m "data: 9 remaining launch states, verified against official portals"
```
NOTE: this task adds 9 pages in one week — pre-launch this is fine (the velocity cap governs the POST-launch scheduled agent; publish these via plain `git push`, not `publish:site`, before the site goes live / before launch is announced).

---

### Task 18: Content batch — 6 pillar guides (research + adversarial fact-check)

**Files:**
- Create in `src/content/guides/`: `how-to-check-e-challan.md`, `how-to-pay-e-challan-online.md`, `unpaid-e-challan-consequences.md`, `wrong-e-challan-dispute.md`, `e-challan-lok-adalat.md`, `court-challan-vs-on-spot-challan.md`

**Interfaces:**
- Consumes: guides collection (Task 12), gate (Task 3). Frontmatter contract from Task 12.
- Produces: 6 pillar guides at root URLs; guide slugs are EXACTLY the six filenames above minus `.md` (Task 19 homepage links to them; RelatedLinks wiring in Task 12 picks them up automatically).

- [ ] **Step 1: Write each guide (fan out via Workflow: per guide, one research/draft agent + one independent fact-check agent that verifies every factual claim against its cited source and FAILS the guide on any unsupported claim)**

Per guide: 900–1,500 words; opens with `<div class="answer-box">` 2–3 sentence direct answer; H2s phrased as real questions; every fine amount/legal claim cited to an official source listed in frontmatter `sources`; internal links to relevant state pages (`/delhi-e-challan/` etc.), offence pages (`/fines/...`), and `/calculator/`; 3–5 frontmatter FAQs; `target_keyword` set to (respectively): `how to check e challan`, `how to pay e challan online`, `what happens if e challan is not paid`, `wrong challan complaint`, `e challan lok adalat`, `court challan vs on spot challan`. Content facts to research properly: NCRB/court process for unpaid challans, licence suspension provisions, Virtual Courts (vcourts.gov.in) flow, Lok Adalat schedules/waiver practice, grievance channels per major state.

- [ ] **Step 2: Validate + commit**

Run: `npm run gate && npm run build` → all 6 render at root URLs; internal links resolve (`npm run check:links`).
```bash
git add src/content && git commit -m "content: six pillar guides, researched and fact-checked"
```

---

### Task 19: Homepage

**Files:**
- Modify: `src/pages/index.astro` (replace placeholder)

**Interfaces:**
- Consumes: `loadStates`, `loadOffences` (Task 2), Task 7 components, guide slugs (Task 18 filenames).
- Produces: real homepage targeting `e challan` / `traffic challan` head intent.

- [ ] **Step 1: Write the homepage**

Structure: H1 "Check & pay traffic e-challan online — every Indian state"; AnswerBox (check on echallan.parivahan.gov.in or your state portal — link the two most popular state pages); "Check your state" grid of ALL state page links (loadStates, sorted by name); "Common fines" table (top 6 offences via FineTable slice); links to all 6 guides with one-line descriptions; short "Why trust this site" block (sourced, dated, independent — link `/editorial-policy/`); FAQ section (4 site-level FAQs: is this official? how current is the data? can I pay here? what is an e-challan?) with `faqJsonLd`. Meta description mentions "all states, verified {year}".

- [ ] **Step 2: Verify + commit**

Run: `npm run build && npm run check:links`.
```bash
git add -A && git commit -m "feat: homepage with state grid, fines preview and trust block"
```

---

### Task 20: Keyword map ingestion

**Files:**
- Create: `scripts/keyword-map.ts`, `data/keywords/keyword-map.json` (generated), `data/keywords/queue.json` (generated then hand-curated)
- Already in repo: `data/keywords/source/ubersuggest-traffic-challan-2026-08.csv` (owner's export, 389 keywords)
- Test: `tests/keyword-map.test.ts`

**Interfaces:**
- Consumes: the export CSV at `data/keywords/source/ubersuggest-traffic-challan-2026-08.csv`. Real columns (header row, UTF-8 BOM present — strip it): `No,Keyword,Volume,CPC,Paid Difficulty,SEO Difficulty`. Detect columns case-insensitively anyway so future exports also parse. Known content of this export: head terms `e challan ts` (246k), `traffic challan` (165k), `traffic challan in delhi` (110k); strong clusters around Lok Adalat (`traffic challan lok adalat` 1.9k + token/date/delhi variants) and challan discount schemes (`traffic challan discount telangana`, `e challan 50 discount 2025 date`); long tail of 10–70-volume specifics.
- Produces:
  - `mapKeywords(rows: { keyword: string; volume: number }[], known: { slug: string; target_keyword: string; type: string }[]): KeywordMap` from the script's exported function, where `KeywordMap = { assigned: Record<string, { keyword: string; volume: number }[]>; unassigned: { keyword: string; volume: number }[] }` — keywords are assigned to an existing page when they contain the page's state name/offence topic/target keyword tokens; the rest go to `unassigned`, clustered later by hand.
  - `data/keywords/queue.json`: ordered list `{ slug_suggestion, target_keyword, cluster_keywords: [], est_volume, max_cpc, min_seo_difficulty, type: 'guide'|'state'|'offence', status: 'pending' }` — the scheduled agent (Task 21) consumes from the top. Order by `est_volume / max(min_seo_difficulty, 10)` descending (volume-adjusted winnability).
- CLI: `npx tsx scripts/keyword-map.ts [path-to-export]` (default: the repo CSV above) writes both JSON files and prints a summary (assigned %, top 20 unassigned clusters by volume).

- [ ] **Step 1: Write failing test for the mapper**

`tests/keyword-map.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapKeywords } from '../scripts/keyword-map';

const known = [
  { slug: 'delhi-e-challan', target_keyword: 'delhi e challan', type: 'state' },
  { slug: 'fines/driving-without-helmet', target_keyword: 'helmet challan fine', type: 'offence' }
];

describe('mapKeywords', () => {
  it('assigns state-name keywords to state pages', () => {
    const r = mapKeywords([{ keyword: 'e challan delhi check online', volume: 5000 }], known);
    expect(r.assigned['delhi-e-challan'][0].volume).toBe(5000);
  });
  it('assigns topic keywords to offence pages', () => {
    const r = mapKeywords([{ keyword: 'helmet fine in india', volume: 900 }], known);
    expect(r.assigned['fines/driving-without-helmet']).toHaveLength(1);
  });
  it('leaves unmatched keywords unassigned', () => {
    const r = mapKeywords([{ keyword: 'fancy number plate cost', volume: 700 }], known);
    expect(r.unassigned).toHaveLength(1);
  });
});
```

Run: `npm test` → FAIL.

- [ ] **Step 2: Implement mapper + CLI**

`scripts/keyword-map.ts` — export `mapKeywords` (token-overlap assignment: normalize keyword; a page matches if the keyword contains the state name token (e.g. 'delhi') for state pages, or ≥2 significant tokens of the page's `target_keyword`/topic for other pages; highest-overlap page wins); `if (process.argv[1]?.endsWith('keyword-map.ts'))` main block reads the export via `xlsx` (`XLSX.readFile`, first sheet, `sheet_to_json`, detect keyword/volume columns case-insensitively), builds `known` from `loadStates()` + `loadOffences()` + guide files, writes `data/keywords/keyword-map.json` and derives `queue.json` from unassigned clusters (group unassigned by shared leading bigram, sum volume, sort desc, status 'pending').

Run: `npm test` → PASS.

- [ ] **Step 3: Run on the real export**

Run: `npx tsx scripts/keyword-map.ts` (uses the repo CSV); review the summary; hand-fix obvious mis-assignments (e.g. `e challan ts` must map to the telangana state page; `traffic challan lok adalat*` cluster must map to the `e-challan-lok-adalat` guide, not spawn new pages); commit generated files.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: keyword-to-page mapper and publishing queue generator"
```

---

### Task 21: Autonomy — content standards, agent playbook, scheduled routines

**Files:**
- Create: `CONTENT_STANDARDS.md`, `AGENT_PLAYBOOK.md`, `data/keywords/queue.json` (seed manually if Task 20 Step 3 still blocked)
- Action: create two scheduled cloud agents (schedule skill), dry-run one cycle

**Interfaces:**
- Consumes: publish pipeline (Task 15), queue format (Task 20), all schemas/gates.
- Produces: the running autonomous loop.

- [ ] **Step 1: CONTENT_STANDARDS.md**

Full text (commit verbatim, this is the agent's law):
```markdown
# Content Standards — TrafficChallan

1. FACTS: Every fine amount, legal section, portal URL, and process claim MUST cite an
   official source (parivahan.gov.in, state transport/police portals, indiacode.nic.in,
   gazette notifications, morth.nic.in, PIB, vcourts.gov.in). Blogs, news aggregators and
   other challan sites are NEVER sources for facts.
2. VERIFY, THEN WRITE: Open the source and confirm the fact TODAY before writing it.
   Set last_verified to today's date only if you actually verified today.
3. ANSWER FIRST: Every page opens with a 2–3 sentence direct answer to its target_keyword.
4. NO FILLER: No "in today's fast-paced world" openers, no padded intros, no repeated
   sections, no keyword stuffing. If a section adds no information, delete it.
5. ONE INTENT, ONE PAGE: Before creating a page, check the target_keyword does not overlap
   an existing page (the gate enforces exact dupes; you enforce near-dupes).
6. BYLINE: Team TrafficChallan. Never invent an author.
7. VELOCITY: Max 5 NEW pages per calendar week (publish pipeline enforces; do not use
   --force-velocity).
8. UPDATES BEAT ADDITIONS: If a fact changed (portal moved, fine revised), fixing existing
   records takes priority over new content.
9. HONESTY: If a state's process is genuinely unclear or its portal is down, say so on the
   page rather than inventing certainty.
```

- [ ] **Step 2: AGENT_PLAYBOOK.md**

Full text (commit verbatim — this is the scheduled agent's operating procedure):
```markdown
# Agent Playbook — scheduled content run

You are the TrafficChallan content agent. Repo: github.com/ynreddy7/trafficchallan.

## Every run
1. `git pull`. Read CONTENT_STANDARDS.md. Run `npm install` if lockfile changed.
2. Take the TOP item with status "pending" from data/keywords/queue.json.
3. Research it per CONTENT_STANDARDS (official sources only, verify today).
4. Produce it as the right page type:
   - state → data/states/<slug>.json (schema: src/lib/schemas.ts StateSchema)
   - offence → data/fines/<slug>.json (OffenceSchema)
   - guide → src/content/guides/<slug>.md (frontmatter per src/content.config.ts)
5. Mark the queue item status "done" with today's date.
6. `npm test` must pass. Then `npm run publish:site -- --message "content: <what you added>"`.
   If the gate, tests, links or velocity cap fail: fix the cause or stop WITHOUT pushing;
   never bypass a gate.

## Monthly verification run (separate schedule)
1. `git pull`. For EVERY file in data/states and data/fines, open each source URL and
   portal URL. Confirm every amount/step/URL is still correct.
2. Fix drift; update last_verified to today for records actually re-verified.
3. `npm run publish:site -- --message "data: monthly re-verification"`.
```

- [ ] **Step 3: Extend the queue**

Append to `data/keywords/queue.json` (below the export-derived items) the spec drip that keyword data alone won't surface, in priority order: remaining states/UTs as `type: 'state'` items (Kerala, Punjab, Bihar, Odisha, Jharkhand, Chhattisgarh, Uttarakhand, Assam, Goa, Himachal Pradesh, J&K, Chandigarh, Puducherry, ...), then offence expansions (`no-parking`, `wrong-side-driving`, `triple-riding`, `minor-driving`, `overloading`, `defective-number-plate`), then question guides (`e-challan-payment-failed`, `challan-on-sold-vehicle`, `e-challan-fake-sms-scam`).

- [ ] **Step 4: Create the scheduled routines (schedule skill)**

Two cloud routines:
1. **Content run** — Mon/Wed/Fri 07:00 IST: prompt = "Clone/pull github.com/ynreddy7/trafficchallan and execute AGENT_PLAYBOOK.md '## Every run' exactly."
2. **Monthly verification** — 1st of month 06:00 IST: prompt = "Clone/pull github.com/ynreddy7/trafficchallan and execute AGENT_PLAYBOOK.md '## Monthly verification run' exactly."
(If scheduled cloud agents lack GitHub push access in this account, fall back to local `schtasks` on this machine invoking `claude -p` with the same prompts — note the laptop-uptime caveat to the owner.)

- [ ] **Step 5: Dry-run one full cycle NOW, manually**

Execute the '## Every run' procedure yourself once end-to-end (take queue top item → research → produce → publish:site). This proves the loop before it runs unattended.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: content standards, agent playbook, seeded queue; scheduled routines live" && git push
```

---

## Post-launch (explicitly OUT of this plan)

- AdSense integration (`ads.txt`, consent, placements) — after owner's approved application.
- Affiliate CTAs — after owner's affiliate accounts exist.
- Hindi `/hi/` mirror, live challan-check tool (paid API), GSC-API feedback loop — phase 2 per spec §11–12.

## Execution notes

- Tasks 1–3 are strictly sequential. Tasks 5, 6 can run in parallel after Task 2. Task 4 (research) can run in parallel with Tasks 5–7. Tasks 8–15 depend on 4+7. Tasks 17, 18 can fan out via the Workflow tool (schema-validated per-item agents + fact-check verifiers). The owner's keyword export is already in the repo — Task 20 is fully unblocked.
- The site can soft-launch (Task 16 user steps) any time after Task 16; Tasks 17–19 should land before announcing/submitting sitemaps.
```
