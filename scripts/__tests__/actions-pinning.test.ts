import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');
const WORKFLOWS_DIR = join(ROOT, '.github/workflows');
const SHA_RE = /^[0-9a-f]{40}$/;
const USES_RE = /^\s*-?\s*uses:\s*([^\s#]+)/;

describe('CI action immutable pinning (#458)', () => {
  it('workflows directory exists', () => {
    expect(existsSync(WORKFLOWS_DIR)).toBe(true);
  });

  it('every uses: entry is pinned to a 40-char commit SHA', () => {
    const files = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files.length).toBeGreaterThan(0);

    const unpinned: string[] = [];
    for (const file of files) {
      const content = readFileSync(join(WORKFLOWS_DIR, file), 'utf-8');
      for (const [index, line] of content.split('\n').entries()) {
        const match = line.match(USES_RE);
        if (!match) continue;
        const action = match[1];
        const ref = action.includes('@') ? action.split('@')[1] : '';
        if (!SHA_RE.test(ref)) {
          unpinned.push(`${file}:${index + 1}: ${action}`);
        }
      }
    }

    expect(unpinned).toEqual([]);
  });

  it('operational notes document immutable SHA pinning', () => {
    const notes = readFileSync(join(ROOT, 'docs/CI_OPERATIONAL_NOTES.md'), 'utf-8');
    expect(notes).toContain('ci-actions-pinning: immutable-sha');
    expect(notes).toMatch(/40-character commit SHA/i);

    const deps = readFileSync(join(ROOT, 'docs/dependency-management.md'), 'utf-8');
    expect(deps).toMatch(/full commit SHA/i);
  });
});
