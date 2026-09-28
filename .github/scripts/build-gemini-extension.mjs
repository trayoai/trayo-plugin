import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { validatePlugin } from './validate-plugin.mjs';

// Gemini CLI loads skills only from skills/ next to gemini-extension.json, so the release asset
// carries a copy of trayo/skills there instead of the repository keeping two copies.
export const geminiArchiveEntries = ['gemini-extension.json', 'GEMINI.md', 'LICENSE', 'skills'];

export function buildGeminiExtension(root, outDir, archivePath) {
  validatePlugin(root);
  mkdirSync(outDir, { recursive: true });
  if (readdirSync(outDir).length > 0) {
    throw new Error(`Gemini extension output directory must be empty: ${outDir}`);
  }

  for (const file of ['gemini-extension.json', 'GEMINI.md', 'LICENSE']) {
    cpSync(path.join(root, file), path.join(outDir, file));
  }
  cpSync(path.join(root, 'trayo', 'skills'), path.join(outDir, 'skills'), { recursive: true });

  if (archivePath) {
    // COPYFILE_DISABLE keeps macOS tar from adding AppleDouble files to a local build.
    const env = { ...process.env, COPYFILE_DISABLE: '1' };
    execFileSync('tar', ['-czf', archivePath, '-C', outDir, ...geminiArchiveEntries], { env });
    const listed = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' }).split('\n');
    if (!listed.includes('gemini-extension.json')) {
      throw new Error(`Gemini extension archive has no root gemini-extension.json: ${archivePath}`);
    }
  }

  return geminiArchiveEntries;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    const [outDir, archivePath] = process.argv.slice(2);
    if (!outDir) throw new Error('Usage: build-gemini-extension.mjs <output-directory> [archive.tar.gz]');
    buildGeminiExtension(path.resolve('.'), path.resolve(outDir), archivePath && path.resolve(archivePath));
    console.log(archivePath ? path.resolve(archivePath) : path.resolve(outDir));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
