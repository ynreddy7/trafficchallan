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
