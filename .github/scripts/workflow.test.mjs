import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the Cursor marketplace manifest is part of the published plugin', () => {
  const validate = readFileSync(path.join(repoRoot, '.github', 'workflows', 'validate.yml'), 'utf8');
  const release = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  assert.match(validate, /git diff --quiet origin\/main\.\.\.HEAD -- \.claude-plugin \.cursor-plugin README\.md trayo/);
  assert.match(release, /- "\.cursor-plugin\/\*\*"/);
  assert.match(release, /git diff --quiet "\$tag" "\$GITHUB_SHA" -- \.claude-plugin \.cursor-plugin README\.md trayo/);
});

test('manual releases are restricted to public main', () => {
  const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  assert.match(
    workflow,
    /if: github\.repository == 'trayoai\/trayo-plugin' && github\.ref == 'refs\/heads\/main'/,
  );
});
