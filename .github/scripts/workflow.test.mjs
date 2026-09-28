import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { publishedPaths } from './validate-plugin.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('the workflows treat every published path as plugin content', () => {
  const validate = readFileSync(path.join(repoRoot, '.github', 'workflows', 'validate.yml'), 'utf8');
  const release = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  const paths = escapeRegExp(publishedPaths.join(' '));
  assert.match(validate, new RegExp(`git diff --quiet origin/main\\.\\.\\.HEAD -- ${paths};`));
  assert.match(release, new RegExp(`git diff --quiet "\\$tag" "\\$GITHUB_SHA" -- ${paths};`));
  for (const published of publishedPaths) {
    const trigger = published.includes('.') && !published.startsWith('.') ? published : `${published}/**`;
    assert.ok(release.includes(`- "${trigger}"`), `release.yml does not run for ${trigger}`);
  }
});

test('every release carries the Gemini CLI extension archive as its only asset', () => {
  const release = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  const validate = readFileSync(path.join(repoRoot, '.github', 'workflows', 'validate.yml'), 'utf8');
  const build = 'node .github/scripts/build-gemini-extension.mjs "$RUNNER_TEMP/gemini-extension"';
  assert.ok(release.includes(`${build} "$archive"`));
  assert.ok(validate.includes(build));
  assert.equal(release.match(/--generate-notes \\\n\s+"\$GEMINI_ARCHIVE"/g)?.length, 2);
  assert.match(release, /gh release upload "\$tag" "\$GEMINI_ARCHIVE"/);
  assert.doesNotMatch(release, /--clobber/);
});

test('manual releases are restricted to public main', () => {
  const workflow = readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  assert.match(
    workflow,
    /if: github\.repository == 'trayoai\/trayo-plugin' && github\.ref == 'refs\/heads\/main'/,
  );
});
