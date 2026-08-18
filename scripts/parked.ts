/**
 * Parked work — how a blocked scheduled run keeps what it produced.
 *
 * A scheduled run works inside a throwaway cloud sandbox. When publish.ts
 * refuses to publish (velocity cap), everything the run wrote dies with that
 * sandbox unless it is pushed somewhere. That is not hypothetical: the runs of
 * 14 and 17 Aug 2026 both researched and wrote the same Mumbai city guide, both
 * hit the cap, and both lost it — the 17th repeated the 14th's research from
 * scratch and threw away the same file again.
 *
 * So a blocked run PARKS instead of discarding: it commits and pushes to the
 * `content-queue` branch. That branch is never deployed — Cloudflare Pages
 * builds `main` only — so parking publishes nothing. The next run DRAINS the
 * branch into its working copy before doing anything else, and the work goes
 * live the first time the gate allows it.
 *
 * This module NEVER pushes to main. Publishing is publish.ts's job, and only
 * once every gate has passed.
 */
import { execFileSync, execSync } from 'node:child_process';

export const PARKED_BRANCH = 'content-queue';

const capture = (cmd: string) => execSync(cmd, { encoding: 'utf-8' }).trim();
const run = (cmd: string) => execSync(cmd, { stdio: 'inherit' });

/* ---------- pure helpers (unit-tested) ---------- */

/**
 * Does `git status --porcelain` output describe anything worth committing?
 * Whitespace-only output means a clean tree.
 */
export function hasWorkToPark(porcelain: string): boolean {
  return porcelain.split('\n').some((l) => l.trim().length > 0);
}

/**
 * What a drain should do, given whether the remote parked branch exists and
 * whether it is already contained in HEAD.
 *   none          — no parked branch on the remote
 *   already-drained — parked commits are already ancestors of HEAD
 *   merge         — parked work is waiting and must be merged in
 */
export type DrainAction = 'none' | 'already-drained' | 'merge';
export function drainAction(parkedExists: boolean, isAncestorOfHead: boolean): DrainAction {
  if (!parkedExists) return 'none';
  return isAncestorOfHead ? 'already-drained' : 'merge';
}

/**
 * Commit subject for parked work. Names the blocking gate so the next run's
 * log (and a human reading the branch) can see why it never published.
 */
export function parkMessage(reason: string, message: string): string {
  return `parked: ${message}\n\nBlocked by: ${reason}\nPushed to the ${PARKED_BRANCH} branch instead of main so the work survives the sandbox. The next run drains it and publishes once the gate allows.`;
}

/* ---------- git side effects ---------- */

/** Remote branch's sha, or null when the branch does not exist. */
function remoteParkedSha(): string | null {
  try {
    const out = capture(`git ls-remote --heads origin ${PARKED_BRANCH}`);
    return out ? out.split('\t')[0] : null;
  } catch {
    return null;
  }
}

/** HEAD's sha, or null when the repo has no checked-out commit. */
function headSha(): string | null {
  try {
    return capture('git rev-parse HEAD');
  } catch {
    return null;
  }
}

function isAncestor(maybeAncestor: string, descendant: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${maybeAncestor} ${descendant}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Commit the working tree and push it to the parked branch. Returns true when
 * work was parked. A non-fast-forward push (the remote branch moved under us,
 * e.g. this run never drained) falls back to a sha-suffixed branch rather than
 * clobbering or discarding — nothing is ever lost silently.
 */
export function park(reason: string, message: string): boolean {
  if (!hasWorkToPark(capture('git status --porcelain'))) {
    console.log('park: working tree clean, nothing to park.');
    return false;
  }
  run('git add -A');
  execFileSync('git', ['commit', '-m', parkMessage(reason, message)], { stdio: 'inherit' });

  try {
    run(`git push origin HEAD:refs/heads/${PARKED_BRANCH}`);
    console.log(`park: pushed to origin/${PARKED_BRANCH}. The next run will drain and publish it.`);
  } catch {
    const sha = capture('git rev-parse --short HEAD');
    const fallback = `${PARKED_BRANCH}-${sha}`;
    console.error(`park: could not fast-forward origin/${PARKED_BRANCH} (it moved). Pushing ${fallback} instead.`);
    run(`git push origin HEAD:refs/heads/${fallback}`);
    console.error(`park: work is safe on ${fallback} — merge it by hand; automatic drain only reads ${PARKED_BRANCH}.`);
  }
  return true;
}

/**
 * Merge any parked work into the current branch before a run starts.
 * Exits non-zero on conflict: a half-merged tree must stop the run, not be
 * quietly published.
 */
export function drain(): DrainAction {
  try {
    run('git fetch origin --quiet');
  } catch {
    console.error('drain: git fetch failed — cannot tell whether work is parked.');
    process.exit(1);
  }
  const head = headSha();
  if (!head) {
    console.error('drain: no HEAD commit — the repository is not checked out. Stopping rather than guessing.');
    process.exit(1);
  }
  const parked = remoteParkedSha();
  const action = drainAction(parked !== null, parked !== null && isAncestor(parked, head));

  if (action === 'none') {
    console.log('drain: nothing parked.');
    return action;
  }
  if (action === 'already-drained') {
    console.log(`drain: origin/${PARKED_BRANCH} is already in this branch.`);
    return action;
  }

  console.log(`drain: parked work found on origin/${PARKED_BRANCH} — merging before this run starts.`);
  try {
    run(`git merge --no-edit ${parked}`);
  } catch {
    console.error('drain: MERGE CONFLICT with parked work. Stopping — resolve by hand, do not publish over it.');
    try {
      run('git merge --abort');
    } catch { /* nothing to abort */ }
    process.exit(1);
  }
  const files = capture(`git diff --name-only ORIG_HEAD HEAD`).split('\n').filter(Boolean);
  console.log(`drain: picked up ${files.length} file(s) from a previous blocked run:`);
  for (const f of files) console.log(`  ${f}`);
  console.log('drain: the queue items these cover are already marked done — take the next pending item.');
  return action;
}

/**
 * After main has been published, retire the parked branch if everything on it
 * is now in main. Failure here never fails a publish.
 */
export function cleanupParked(): void {
  const parked = remoteParkedSha();
  if (!parked) return;
  const head = headSha();
  if (!head) return;
  if (!isAncestor(parked, head)) {
    console.log(`cleanup: origin/${PARKED_BRANCH} still holds unpublished work — leaving it.`);
    return;
  }
  try {
    run(`git push origin --delete ${PARKED_BRANCH}`);
    console.log(`cleanup: origin/${PARKED_BRANCH} published and deleted.`);
  } catch {
    console.log(`cleanup: could not delete origin/${PARKED_BRANCH} (harmless — it is fully merged).`);
  }
}

/* ---------- CLI ---------- */

const isMain = process.argv[1] && /parked\.ts$/.test(process.argv[1]);
if (isMain) {
  const cmd = process.argv[2];
  if (cmd === 'drain') drain();
  else if (cmd === 'park') park(process.argv[3] ?? 'manual', process.argv[4] ?? 'work in progress');
  else if (cmd === 'cleanup') cleanupParked();
  else {
    console.error('usage: tsx scripts/parked.ts <drain|park|cleanup>');
    process.exit(2);
  }
}
