import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QUEUE_STATUSES } from '../scripts/keyword-map';

// Integrity checks over the hand-curated keyword queue. There is no zod schema
// for this file (it is workflow state, not page data), so this test is the
// guard that keeps its status vocabulary in sync with scripts/keyword-map.ts
// and AGENT_PLAYBOOK step 6.

interface RawQueueItem {
  slug_suggestion: string;
  status: string;
  covered_by?: string;
  note?: string;
  completed?: string;
}

const queue = JSON.parse(
  readFileSync(join(process.cwd(), 'data', 'keywords', 'queue.json'), 'utf-8')
) as { _curated: boolean; items: RawQueueItem[] };

describe('data/keywords/queue.json', () => {
  it('is the hand-curated queue', () => {
    expect(queue._curated).toBe(true);
    expect(queue.items.length).toBeGreaterThan(0);
  });

  it('every item carries a known status', () => {
    const allowed = new Set<string>(QUEUE_STATUSES);
    for (const item of queue.items) {
      expect(allowed.has(item.status), `unknown status "${item.status}" on ${item.slug_suggestion}`).toBe(true);
    }
  });

  it('covered/superseded items name the page that captures them', () => {
    for (const item of queue.items) {
      if (item.status === 'covered' || item.status === 'superseded') {
        expect(
          typeof item.covered_by === 'string' && item.covered_by.length > 0,
          `${item.status} item ${item.slug_suggestion} has no covered_by`
        ).toBe(true);
      }
    }
  });

  it('retired items say why (audit trail for the never-pick-up rule)', () => {
    for (const item of queue.items) {
      if (item.status === 'retired') {
        expect(
          typeof item.note === 'string' && item.note.length > 0,
          `retired item ${item.slug_suggestion} has no note`
        ).toBe(true);
      }
    }
  });

  it('done items carry an ISO completed date', () => {
    for (const item of queue.items) {
      if (item.status === 'done') {
        expect(item.completed, `done item ${item.slug_suggestion} has no completed date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('slug_suggestions are unique', () => {
    const seen = new Set<string>();
    for (const item of queue.items) {
      expect(seen.has(item.slug_suggestion), `duplicate slug_suggestion "${item.slug_suggestion}"`).toBe(false);
      seen.add(item.slug_suggestion);
    }
  });
});
