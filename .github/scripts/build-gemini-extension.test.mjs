import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { buildGeminiExtension, geminiArchiveEntries } from './build-gemini-extension.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function tempDir(context) {
  const dir = mkdtempSync(path.join(tmpdir(), 'trayo-gemini-extension-'));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function listFiles(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relativePath) : [relativePath];
  });
}

test('builds a Gemini CLI extension with the manifest at its root and every plugin skill', (context) => {
  const outDir = path.join(tempDir(context), 'extension');
  buildGeminiExtension(repoRoot, outDir);

  assert.deepEqual(readdirSync(outDir).sort(), [...geminiArchiveEntries].sort());
  for (const file of ['gemini-extension.json', 'GEMINI.md', 'LICENSE']) {
    assert.equal(readFileSync(path.join(outDir, file), 'utf8'), readFileSync(path.join(repoRoot, file), 'utf8'));
  }

  const pluginSkills = path.join(repoRoot, 'trayo', 'skills');
  const skillFiles = listFiles(pluginSkills).sort();
  assert.deepEqual(listFiles(path.join(outDir, 'skills')).sort(), skillFiles);
  assert.ok(skillFiles.includes(path.join('plan-gtm-work', 'SKILL.md')));
  for (const file of skillFiles) {
    assert.equal(
      readFileSync(path.join(outDir, 'skills', file), 'utf8'),
      readFileSync(path.join(pluginSkills, file), 'utf8'),
    );
  }
});

test('archives the extension with gemini-extension.json at the archive root', (context) => {
  const dir = tempDir(context);
  const archive = path.join(dir, 'trayo-gemini-extension.tar.gz');
  buildGeminiExtension(repoRoot, path.join(dir, 'extension'), archive);

  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(entries.includes('gemini-extension.json'));
  assert.ok(entries.includes('GEMINI.md'));
  assert.ok(entries.includes('skills/research-account/SKILL.md'));
  assert.ok(entries.every((entry) => geminiArchiveEntries.some((root) => entry === root || entry.startsWith(`${root}/`))));
});

test('refuses to build into a non-empty directory', (context) => {
  const outDir = tempDir(context);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'stale.txt'), 'old build\n');
  assert.throws(() => buildGeminiExtension(repoRoot, outDir), /output directory must be empty/);
});

test('refuses to build an invalid plugin', (context) => {
  const root = tempDir(context);
  assert.throws(() => buildGeminiExtension(root, path.join(root, 'extension')), /Could not read/);
});
