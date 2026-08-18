/**
 * Parser and validator for public/_redirects (Cloudflare Pages).
 *
 * Format and limits confirmed against Cloudflare's own documentation on
 * 2026-08-19 — https://developers.cloudflare.com/pages/configuration/redirects/
 *   • one rule per line: "[source] [destination] [code?]"
 *   • lines starting with # are comments; malformed lines "will be ignored"
 *   • 2,000 static + 100 dynamic redirects, 2,100 combined
 *   • "Each redirect declaration has a 1,000-character limit."
 *   • "If there are multiple redirects for the same source path, the top-most
 *     redirect is applied."
 *   • "Redirects are always followed, regardless of whether or not an asset
 *     matches the incoming request." — so a rule whose source collides with a
 *     path this site builds would SHADOW that live page. checkRedirects()
 *     rejects that outright.
 *   • query strings cannot be matched in the source (unsupported).
 *
 * The validator is deliberately stricter than Cloudflare: this file only ever
 * carries exact, permanent, one-to-one moves of URLs the previous owner's site
 * really served. Splats and placeholders are refused because a pattern rule
 * cannot know whether the path it swallows is topically related to its
 * destination, and Google's site-move guidance warns that redirecting many old
 * URLs to one irrelevant destination "can be treated as a soft 404 error"
 * (https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes,
 * read 2026-08-19).
 */

export const MAX_STATIC_RULES = 2000;
export const MAX_DYNAMIC_RULES = 100;
export const MAX_TOTAL_RULES = 2100;
export const MAX_LINE_LENGTH = 1000;

export interface RedirectRule {
  source: string;
  destination: string;
  status: number;
  /** 1-based line number in the source file, for error messages. */
  line: number;
  /** The full line as written, for the 1,000-character limit check. */
  raw: string;
}

/**
 * Reads the rules out of a _redirects file. Blank lines and # comments are
 * skipped exactly as Cloudflare skips them; every other line is returned even
 * if it is malformed, so checkRedirects() can complain about it rather than
 * letting Cloudflare silently ignore it.
 */
export function parseRedirects(text: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    rules.push({
      source: parts[0] ?? '',
      destination: parts[1] ?? '',
      // Cloudflare defaults to 302 when no code is given; NaN marks a
      // non-numeric third field so the checker can name it.
      status: parts.length >= 3 ? Number(parts[2]) : 302,
      line: i + 1,
      raw
    });
  }
  return rules;
}

/**
 * The percent-decoded form of a source path, or the path unchanged when it
 * carries no escapes or cannot be decoded.
 *
 * public/_redirects is mostly non-Latin: the previous owner's WordPress
 * install emitted Gujarati tag slugs as percent-encoded UTF-8, and 8 of the 47
 * shipped lines are in that form. Anything that inspects a source for MEANING
 * has to look at the decoded text as well, or it is reading hex.
 * decodeURIComponent throws on a malformed escape ("%zz"), so a failure falls
 * back to the raw string rather than taking the whole check down.
 */
export function decodeSource(source: string): string {
  try {
    return decodeURIComponent(source);
  } catch {
    return source;
  }
}

/**
 * Marker terms for the previous owner's off-topic content — exam results,
 * government-job recruitment, celebrity finance, and the Gujarati-language
 * news churn. Redirecting any of it at a challan page is the expired-domain
 * topic flip Google's spam policy targets, and public/_redirects commits in
 * writing to leaving those paths at 404.
 *
 * Latin and Gujarati both, because the file's own header records that the
 * recovered set contains Gujarati news tags — an ASCII-only pattern would
 * wave through the exact URL class the file promises to refuse, in the
 * encoded shape that is the NORM here rather than the exception:
 * સમાચાર / ન્યૂઝ (news), પરિણામ (result), ભરતી (recruitment), નોકરી (job),
 * અભ્યાસક્રમ (syllabus). "vtv" is in the Latin half for the same reason — it is
 * a Gujarati news broadcaster, not a challan topic.
 *
 * A marker can only ever REFUSE a redirect, never create a wrong one, so the
 * list errs wide on purpose. The Indic terms are written as \u escapes so the
 * pattern itself stays ASCII and cannot be damaged by an encoding round-trip;
 * the comment above is the readable copy.
 */
export const OFF_TOPIC_MARKERS =
  /(ugc-net|kset|dsssb|ap-tet|ap-dsc|recruitment|syllabus|result|sarkari|net-worth|income|ipo|toll|linguistic|rights|samachar|news|vtv|\u0938\u092E\u093E\u091A\u093E\u0930|\u0AB8\u0AAE\u0ABE\u0A9A\u0ABE\u0AB0|\u0AA8\u0ACD\u0AAF\u0AC2\u0A9D|\u0AAA\u0AB0\u0ABF\u0AA3\u0ABE\u0AAE|\u0AAD\u0AB0\u0AA4\u0AC0|\u0AA8\u0ACB\u0A95\u0AB0\u0AC0|\u0A85\u0AAD\u0ACD\u0AAF\u0ABE\u0AB8\u0A95\u0ACD\u0AB0\u0AAE)/i;

/**
 * True when a source path carries an off-topic marker in EITHER its raw or its
 * percent-decoded form. Both are tested because an encoded source is the
 * normal case in this file, so a guard that only reads the raw string would
 * pass an encoded off-topic rule straight through.
 */
export function isOffTopicSource(source: string): boolean {
  return OFF_TOPIC_MARKERS.test(source) || OFF_TOPIC_MARKERS.test(decodeSource(source));
}

/** A rule is "dynamic" (the 100-rule bucket) if it uses a splat or a placeholder. */
export function isDynamic(rule: RedirectRule): boolean {
  return rule.source.includes('*') || /:[A-Za-z]\w*/.test(rule.source);
}

/**
 * Returns a human-readable violation for every problem found. Empty array =
 * the file is shippable.
 *
 * `builtPaths` is the set of URL pathnames this site actually builds, in
 * directory form with a trailing slash ("/fines/gujarat/"). Callers supply it
 * from the real build (dist/) or from the same loaders the pages route from —
 * either way, a destination that is not in the set is a redirect to a 404,
 * which is worse than not redirecting at all.
 */
export function checkRedirects(rules: RedirectRule[], builtPaths: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();

  for (const rule of rules) {
    const at = `line ${rule.line}`;
    if (rule.raw.length > MAX_LINE_LENGTH) {
      problems.push(`${at}: ${rule.raw.length} characters — Cloudflare's limit is ${MAX_LINE_LENGTH}`);
    }
    if (!rule.source.startsWith('/')) {
      problems.push(`${at}: source "${rule.source}" must be a root-relative path starting with /`);
    }
    if (rule.source.includes('?')) {
      problems.push(`${at}: source "${rule.source}" contains a query string — Cloudflare cannot match those`);
    }
    if (isDynamic(rule)) {
      problems.push(`${at}: source "${rule.source}" uses a splat or placeholder — this file ships exact rules only`);
    }
    if (!rule.destination.startsWith('/')) {
      problems.push(`${at}: destination "${rule.destination}" must be a root-relative path on this site`);
    }
    if (rule.status !== 301) {
      problems.push(`${at}: status "${rule.raw.trim().split(/\s+/)[2] ?? '(none)'}" — every rule here is a permanent move, use 301`);
    }
    if (rule.source === rule.destination) {
      problems.push(`${at}: source and destination are both "${rule.source}" — an infinite redirect`);
    }
    const prev = seen.get(rule.source);
    if (prev !== undefined) {
      problems.push(`${at}: source "${rule.source}" already declared on line ${prev} — Cloudflare would silently apply the top-most rule`);
    } else {
      seen.set(rule.source, rule.line);
    }
    if (builtPaths.has(rule.source)) {
      problems.push(`${at}: source "${rule.source}" is a page this site builds — redirects are always followed and would shadow it`);
    }
    if (rule.destination.startsWith('/') && !builtPaths.has(rule.destination)) {
      problems.push(`${at}: destination "${rule.destination}" is not a page this site builds — that is a redirect to a 404`);
    }
  }

  const dynamic = rules.filter(isDynamic).length;
  const staticCount = rules.length - dynamic;
  if (staticCount > MAX_STATIC_RULES) problems.push(`${staticCount} static rules — Cloudflare's limit is ${MAX_STATIC_RULES}`);
  if (dynamic > MAX_DYNAMIC_RULES) problems.push(`${dynamic} dynamic rules — Cloudflare's limit is ${MAX_DYNAMIC_RULES}`);
  if (rules.length > MAX_TOTAL_RULES) problems.push(`${rules.length} rules — Cloudflare's combined limit is ${MAX_TOTAL_RULES}`);

  return problems;
}
