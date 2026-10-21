#!/usr/bin/env node
/**
 * check-api-contract.mjs
 *
 * Static gate that verifies the E2E suite’s expected API contract version
 * matches `API_CONTRACT_VERSION` in packages/api before Playwright browsers
 * are installed. Fails fast so browser download is skipped on mismatch.
 *
 * Usage:
 *   pnpm --filter @stellar-analytics/e2e check:contract
 *   node packages/e2e/scripts/check-api-contract.mjs
 *
 * Exit codes:
 *   0  Contract versions match
 *   1  Mismatch or unable to read API contract version
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/** Expected public API contract for this E2E package (bump with API_CONTRACT_VERSION). */
export const EXPECTED_API_CONTRACT_VERSION = 'v1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const API_INDEX = join(ROOT, 'packages/api/src/index.ts');

function readApiContractVersion(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`API source not found: ${filePath}`);
  }
  const source = readFileSync(filePath, 'utf-8');
  const match = source.match(/API_CONTRACT_VERSION\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    throw new Error(`API_CONTRACT_VERSION not found in ${filePath}`);
  }
  return match[1];
}

export function assertApiContract(expected = EXPECTED_API_CONTRACT_VERSION) {
  const actual = readApiContractVersion(API_INDEX);
  if (actual !== expected) {
    throw new Error(
      `API contract mismatch: e2e expects "${expected}" but packages/api declares "${actual}". ` +
        `Update EXPECTED_API_CONTRACT_VERSION in packages/e2e/scripts/check-api-contract.mjs ` +
        `or bump API_CONTRACT_VERSION intentionally (see docs/api-versioning.md).`,
    );
  }
  return actual;
}

try {
  const version = assertApiContract();
  console.log(`[e2e] API contract OK: ${version}`);
  process.exit(0);
} catch (err) {
  console.error(`[e2e] ${err.message}`);
  process.exit(1);
}
