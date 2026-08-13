import { execSync, execFileSync } from 'node:child_process';
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

// 2. Tests, gates, build, links
run('npm test');
run('npm run gate');
run('npm run build');
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
  if (/^data\/schemes\/.+\.json$/.test(f) || f === 'data/lok-adalat.json') {
    urls.add('https://trafficchallan.com/challan-discount/');
  }
  if (/^data\/rto\/.+\.json$/.test(f)) urls.add('https://trafficchallan.com/rto-codes/');
}

// 4. Commit + push
run('git add -A');
execFileSync('git', ['commit', '-m', message], { stdio: 'inherit' });
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
