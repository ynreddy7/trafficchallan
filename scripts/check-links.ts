import { existsSync, readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { extractLocalHrefs, extractExternalHrefs, resolveToDistFile, classifyExternalFailure, classifyExternalStatus } from '../src/lib/linkcheck';
import { parseRedirects, checkRedirects } from '../src/lib/redirects';

const UA = 'TrafficChallanBot/1.0 (+https://trafficchallan.com/about/)';
const checkExternalFlag = process.argv.includes('--external');

type ExternalResult = {
  url: string;
  status: 'alive' | 'warning' | 'dead';
  detail: string;
  kind?: 'tls-legacy' | '403';
  code?: string;
};

function causeCode(e: unknown): string | undefined {
  const cause = e instanceof Error ? (e.cause as { code?: string } | undefined) : undefined;
  return cause?.code;
}

async function checkExternal(url: string): Promise<ExternalResult> {
  let lastError = 'unknown error';
  let lastCode: string | undefined;
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
        headers: { 'User-Agent': UA }
      });
      if (res.status === 403) return { url, status: 'warning', kind: '403', detail: '403 Forbidden (bot-blocked, treated as alive)' };
      if (res.status >= 200 && res.status < 400) return { url, status: 'alive', detail: `HTTP ${res.status}` };
      lastError = `HTTP ${res.status}`;
      lastStatus = res.status;
      lastCode = undefined;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      lastCode = causeCode(e);
      lastStatus = undefined;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 2000));
  }
  if (lastStatus !== undefined) {
    // The server answered — only an affirmative "gone" (404/410) is dead.
    if (classifyExternalStatus(lastStatus) === 'dead') return { url, status: 'dead', detail: lastError };
    return { url, status: 'warning', kind: 'http-error', detail: `${lastError} (server alive but refusing this request; verify manually)` };
  }
  const cls = lastCode ? classifyExternalFailure(lastCode) : 'net-warn';
  if (cls === 'dns-dead') return { url, status: 'dead', detail: `${lastError} (host no longer resolves)` };
  if (cls === 'legacy-tls-warn') {
    return {
      url,
      status: 'warning',
      kind: 'tls-legacy',
      code: lastCode,
      detail: 'server responded but our TLS client rejects its legacy config; curl/browsers load it fine'
    };
  }
  // Timeouts, resets, protocol quirks on a host that resolves: NIC/gov infra
  // is routinely this flaky from automated clients — loud warning, not dead.
  return { url, status: 'warning', kind: 'unreachable', code: lastCode, detail: `${lastError} (could not connect after 3 attempts; verify manually)` };
}

async function main() {
  const files = await fg('dist/**/*.html');
  if (!files.length) {
    console.error('check-links: no HTML files found under dist/ — did you run `npm run build`?');
    process.exit(1);
  }

  let internalChecked = 0;
  const internalBroken: { file: string; href: string }[] = [];
  const externalUrls = new Set<string>();

  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    for (const href of extractLocalHrefs(html)) {
      internalChecked++;
      if (!existsSync(resolveToDistFile(href))) internalBroken.push({ file, href });
    }
    if (checkExternalFlag) {
      for (const href of extractExternalHrefs(html)) externalUrls.add(href);
    }
  }

  console.log(`internal: ${files.length} page(s), ${internalChecked} link(s) checked, ${internalBroken.length} broken`);
  for (const b of internalBroken) console.error(`  BROKEN internal: ${b.href}  (found in ${b.file})`);

  // public/_redirects, checked against the real build rather than a derived
  // route list: every legacy URL we forward must land on a page that exists
  // in dist/. tests/redirects.test.ts runs the same checker against paths
  // derived from source, so this stays a second, stronger witness.
  const redirectProblems: string[] = [];
  const redirectsFile = 'dist/_redirects';
  if (!existsSync(redirectsFile)) {
    redirectProblems.push('dist/_redirects is missing — public/_redirects did not reach the build output');
  } else {
    const rules = parseRedirects(readFileSync(redirectsFile, 'utf-8'));
    const distPaths = new Set(
      files.map((f) => '/' + f.replace(/^dist\//, '').replace(/index\.html$/, ''))
    );
    redirectProblems.push(...checkRedirects(rules, distPaths));
    console.log(`redirects: ${rules.length} rule(s) checked, ${redirectProblems.length} problem(s)`);
  }
  for (const p of redirectProblems) console.error(`  BAD redirect: ${p}`);

  const externalDead: ExternalResult[] = [];
  const externalWarned: ExternalResult[] = [];

  if (checkExternalFlag) {
    const urls = [...externalUrls];
    console.log(`external: checking ${urls.length} unique url(s) (UA: ${UA})...`);
    const results = await Promise.all(urls.map(checkExternal));
    for (const r of results) {
      if (r.status === 'dead') externalDead.push(r);
      else if (r.status === 'warning') externalWarned.push(r);
    }
    const alive = urls.length - externalDead.length;
    console.log(`external: ${alive}/${urls.length} alive (${externalWarned.length} warning(s), ${externalDead.length} dead)`);
    for (const w of externalWarned) {
      if (w.kind === 'tls-legacy') console.warn(`  WARN tls-legacy ${w.url} (${w.code})`);
      else console.warn(`  WARNING external: ${w.url} — ${w.detail}`);
    }
    for (const d of externalDead) console.error(`  DEAD external: ${d.url} — ${d.detail}`);
  }

  if (internalBroken.length || externalDead.length || redirectProblems.length) {
    console.error('check-links: FAILED');
    process.exit(1);
  }
  console.log('check-links: all checks passed');
}

main();
