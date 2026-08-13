import type { StateRecord, OffenceRecord, SchemeRecord, LokAdalatRecord, RtoStateRecord } from './schemas';

export interface GuideMeta { file: string; target_keyword: string; last_verified: string; sources: string[] }
/** Feature pages (e.g. /challan-discount/) join the duplicate keyword/slug registries. */
export interface PageMeta { slug: string; target_keyword: string }
export interface GateInput {
  states: StateRecord[];
  offences: OffenceRecord[];
  guides: GuideMeta[];
  schemes?: SchemeRecord[];
  lokAdalat?: LokAdalatRecord;
  rtoFiles?: RtoStateRecord[];
  pages?: PageMeta[];
  now: Date;
}

const STALE_DAYS = 90;
// Volatile scheme statuses go stale fast: a "live" claim older than two weeks
// is a liability. This deliberately stalls publish runs until the Discount
// watch re-verifies — see AGENT_PLAYBOOK.
const SCHEME_VOLATILE_STALE_DAYS = 14;
const VOLATILE_STATUSES = new Set(['live', 'announced', 'rumour']);
// RTO office lists are slow-moving directory data.
const RTO_STALE_DAYS = 365;

export function runGates(input: GateInput): string[] {
  const v: string[] = [];
  const schemes = input.schemes ?? [];
  const rtoFiles = input.rtoFiles ?? [];
  const pages = input.pages ?? [];
  const staleBefore = new Date(input.now.getTime() - STALE_DAYS * 86400_000);
  const todayISO = input.now.toISOString().slice(0, 10);
  // Truncate `now` to UTC midnight for the 14-day window so a scheme verified
  // exactly 14 days ago passes for the whole of today, not just until the
  // clock time the gate happens to run at.
  const nowUtcMidnight = new Date(todayISO + 'T00:00:00Z');
  const volatileStaleBefore = new Date(nowUtcMidnight.getTime() - SCHEME_VOLATILE_STALE_DAYS * 86400_000);
  const rtoStaleBefore = new Date(input.now.getTime() - RTO_STALE_DAYS * 86400_000);

  const checkStale = (what: string, date: string) => {
    if (new Date(date + 'T00:00:00Z') < staleBefore) v.push(`${what}: stale last_verified ${date} (> ${STALE_DAYS} days)`);
  };
  input.states.forEach((s) => checkStale(`state ${s.slug}`, s.last_verified));
  input.offences.forEach((o) => checkStale(`offence ${o.slug}`, o.last_verified));
  input.guides.forEach((g) => {
    checkStale(`guide ${g.file}`, g.last_verified);
    if (!g.sources.length) v.push(`guide ${g.file}: no sources listed`);
  });

  schemes.forEach((s) => {
    checkStale(`scheme ${s.slug}`, s.last_verified);
    if (VOLATILE_STATUSES.has(s.status) && new Date(s.last_verified + 'T00:00:00Z') < volatileStaleBefore) {
      v.push(
        `scheme ${s.slug}: status "${s.status}" not re-verified in ${SCHEME_VOLATILE_STALE_DAYS} days (last_verified ${s.last_verified}) — ` +
        `re-verify against its sources and update last_verified (Discount watch in AGENT_PLAYBOOK)`
      );
    }
    if (s.status === 'live' && s.window?.end && s.window.end < todayISO) {
      v.push(`scheme ${s.slug}: status "live" but window ended ${s.window.end} — move to "closed" and add a history entry`);
    }
  });

  if (input.lokAdalat) {
    checkStale('lok-adalat', input.lokAdalat.last_verified);
    const hasFuture = input.lokAdalat.national_sittings.some((s) => s.date >= todayISO);
    if (!hasFuture) {
      v.push('lok-adalat: no national sitting on or after today — add the next cycle\'s dates from the first SLSA that publishes them');
    }
  }

  rtoFiles.forEach((r) => {
    if (new Date(r.last_verified + 'T00:00:00Z') < rtoStaleBefore) {
      v.push(`rto ${r.slug}: stale last_verified ${r.last_verified} (> ${RTO_STALE_DAYS} days)`);
    }
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
  pages.forEach((p) => claim(p.target_keyword, `page ${p.slug}`));

  const slugOwners = new Map<string, string>();
  const claimSlug = (slug: string, owner: string) => {
    const prev = slugOwners.get(slug);
    if (prev) v.push(`duplicate slug "${slug}" on ${prev} and ${owner}`);
    else slugOwners.set(slug, owner);
  };
  input.states.forEach((s) => claimSlug(`${s.slug}-e-challan`, `state ${s.slug}`));
  input.offences.forEach((o) => claimSlug(`fines/${o.slug}`, `offence ${o.slug}`));
  input.guides.forEach((g) => claimSlug(g.file.replace(/\.md$/, ''), `guide ${g.file}`));
  pages.forEach((p) => claimSlug(p.slug, `page ${p.slug}`));

  const offenceSlugs = new Set(input.offences.map((o) => o.slug));
  input.states.forEach((s) => {
    for (const key of Object.keys(s.fine_overrides)) {
      if (!offenceSlugs.has(key)) v.push(`state ${s.slug}: fine_overrides references unknown offence "${key}"`);
    }
  });

  return v;
}
