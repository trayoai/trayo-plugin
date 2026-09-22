import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('manual releases are restricted to public main', () => {
  const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  assert.match(
    workflow,
    /if: github\.repository == 'trayoai\/trayo-plugin' && github\.ref == 'refs\/heads\/main'/,
  );
});
