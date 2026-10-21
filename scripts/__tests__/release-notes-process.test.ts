import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');

describe('Release notes process docs (#338)', () => {
  const docPath = join(ROOT, 'docs/release-notes-process.md');
  const scriptPath = join(ROOT, 'scripts/generate-release-notes.mjs');

  it('maintainer docs and generator script exist', () => {
    expect(existsSync(docPath)).toBe(true);
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('documents preview, dry-run, issue labels, and changelog guidance', () => {
    const content = readFileSync(docPath, 'utf-8');
    expect(content).toContain('release-notes-docs: preview, dry-run, issue-labels, changelog');
    expect(content).toContain('pnpm release:notes:preview');
    expect(content).toContain('--dry-run');
    expect(content).toMatch(/Issue labels/i);
    expect(content).toContain('CHANGELOG');
  });

  it('generator supports dry-run and documents commit type mapping', () => {
    const script = readFileSync(scriptPath, 'utf-8');
    expect(script).toContain('--dry-run');
    expect(script).toContain('feat');
    expect(script).toContain('BREAKING CHANGE');
  });
});
