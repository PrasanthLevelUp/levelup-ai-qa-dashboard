#!/usr/bin/env node
/**
 * Rebuilds the downloadable starter-framework ZIP served by the
 * "Download Framework" button on the Script Generation page.
 *
 * Source of truth:  framework-template/   (versioned in this repo)
 * Output:           public/levelup-playwright-framework.zip  (static asset)
 *
 * Usage:  node scripts/build-framework-zip.mjs
 *
 * Requires the `zip` CLI (present on macOS/Linux). Excludes build artifacts
 * and dependencies so the archive stays small and clean.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const templateDir = resolve(repoRoot, 'framework-template');
const outDir = resolve(repoRoot, 'public');
const outFile = resolve(outDir, 'levelup-playwright-framework.zip');

if (!existsSync(templateDir)) {
  console.error(`✗ Template directory not found: ${templateDir}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
if (existsSync(outFile)) rmSync(outFile);

const excludes = [
  '*/node_modules/*',
  '*/test-results/*',
  '*/playwright-report/*',
  '*/playwright/.cache/*',
  '*.tsbuildinfo',
  '*/.DS_Store',
];

const cmd = [
  'zip -r -q',
  JSON.stringify(outFile),
  '.',
  '-x',
  ...excludes.map((e) => JSON.stringify(e)),
].join(' ');

try {
  execSync(cmd, { cwd: templateDir, stdio: 'inherit' });
  console.log(`✓ Built ${outFile}`);
} catch (err) {
  console.error('✗ Failed to build framework ZIP:', err.message);
  process.exit(1);
}
