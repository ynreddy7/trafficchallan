import { describe, it, expect } from 'vitest';
import { hasWorkToPark, drainAction, parkMessage, PARKED_BRANCH } from '../scripts/parked';

describe('hasWorkToPark', () => {
  it('is false for a clean tree', () => {
    expect(hasWorkToPark('')).toBe(false);
    expect(hasWorkToPark('\n')).toBe(false);
    expect(hasWorkToPark('   \n  \n')).toBe(false);
  });

  it('is true for modified, untracked and staged entries', () => {
    expect(hasWorkToPark(' M data/schemes/bihar.json')).toBe(true);
    expect(hasWorkToPark('?? src/content/guides/mumbai-traffic-challan.md')).toBe(true);
    expect(hasWorkToPark('A  src/content/guides/mumbai-traffic-challan.md\n M data/keywords/queue.json')).toBe(true);
  });
});

describe('drainAction', () => {
  it('does nothing when no parked branch exists', () => {
    expect(drainAction(false, false)).toBe('none');
  });

  it('does nothing when the parked commits are already in HEAD', () => {
    // The published-then-not-yet-deleted case: the branch exists but adds nothing.
    expect(drainAction(true, true)).toBe('already-drained');
  });

  it('merges when parked work is not yet in HEAD', () => {
    expect(drainAction(true, false)).toBe('merge');
  });
});

describe('parkMessage', () => {
  it('leads with the original intent and records the blocking gate', () => {
    const m = parkMessage('velocity cap (29 new pages in 7 days, max 5)', 'content: add Mumbai city guide');
    expect(m.startsWith('parked: content: add Mumbai city guide')).toBe(true);
    expect(m).toContain('velocity cap (29 new pages in 7 days, max 5)');
  });

  it('names the branch so a reader knows where the work went', () => {
    expect(parkMessage('velocity cap', 'x')).toContain(PARKED_BRANCH);
  });

  it('never suggests the work was published', () => {
    const m = parkMessage('velocity cap', 'content: something').toLowerCase();
    expect(m).toContain('instead of main');
    expect(m).not.toContain('published to main');
  });
});

describe('the parked branch is not the deploy branch', () => {
  it('is never main — Cloudflare Pages builds main, so parking must not deploy', () => {
    expect(PARKED_BRANCH).not.toBe('main');
    expect(PARKED_BRANCH).toBe('content-queue');
  });
});
