import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');

describe('E2E API contract gate (#457)', () => {
  const scriptPath = join(ROOT, 'packages/e2e/scripts/check-api-contract.mjs');

  it('check-api-contract script and package script exist', () => {
    expect(existsSync(scriptPath)).toBe(true);
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages/e2e/package.json'), 'utf-8'));
    expect(pkg.scripts['check:contract']).toContain('check-api-contract');
  });

  it('expected contract matches packages/api API_CONTRACT_VERSION', () => {
    const script = readFileSync(scriptPath, 'utf-8');
    const api = readFileSync(join(ROOT, 'packages/api/src/index.ts'), 'utf-8');
    const expected = script.match(/EXPECTED_API_CONTRACT_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    const actual = api.match(/API_CONTRACT_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1];
    expect(expected).toBeTruthy();
    expect(actual).toBeTruthy();
    expect(expected).toBe(actual);
  });

  it.each([
    'e2e-tests.yml',
    'ci.yml',
    'e2e-cross-browser.yml',
  ])('%s runs contract check before Playwright browsers', (file) => {
    const content = readFileSync(join(ROOT, '.github/workflows', file), 'utf-8');
    const contractIdx = content.indexOf('Check API contract before browsers');
    const browsersIdx = content.indexOf('Install Playwright browsers');
    expect(contractIdx).toBeGreaterThanOrEqual(0);
    expect(browsersIdx).toBeGreaterThan(contractIdx);
    expect(content).toContain('check:contract');
  });

  it('E2E guide documents the before-browsers gate', () => {
    const guide = readFileSync(join(ROOT, 'packages/e2e/E2E_TESTING_GUIDE.md'), 'utf-8');
    expect(guide).toContain('e2e-api-contract-gate: before-browsers');
    expect(guide).toContain('check:contract');
  });
});
