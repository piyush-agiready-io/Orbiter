/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import { mkdirSync, createWriteStream, existsSync, statSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const extensionDir = resolve(repoRoot, 'extension');
const extensionNodeModules = resolve(extensionDir, 'node_modules');
const buildDir = resolve(extensionDir, 'build');
const outDir = resolve(repoRoot, 'public');
const outZip = resolve(outDir, 'orbiter-extension.zip');

function run(cmd, cwd) {
  console.log(`> ${cmd}  (cwd=${cwd})`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

async function zipDirectory(sourceDir, outPath) {
  await new Promise((resolvePromise, reject) => {
    const output = createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolvePromise);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

async function main() {
  if (!existsSync(extensionDir)) {
    console.warn('No extension/ directory found, skipping extension build.');
    return;
  }

  // Vercel restores partial caches that have left this dir in odd states.
  // Wipe and reinstall from the lockfile so vite/etc. are guaranteed present.
  if (existsSync(extensionNodeModules)) {
    console.log(`> rm -rf ${extensionNodeModules}`);
    rmSync(extensionNodeModules, { recursive: true, force: true });
  }
  // --include=dev forces devDependencies even when NODE_ENV=production
  // (which Vercel sets during builds). Without it, npm skips vite + the
  // vite plugins entirely and the build can't run.
  run('npm ci --include=dev --no-audit --no-fund', extensionDir);
  run('npx --no-install vite build', extensionDir);

  if (!existsSync(buildDir)) {
    throw new Error(`Extension build did not produce ${buildDir}`);
  }

  mkdirSync(outDir, { recursive: true });
  await zipDirectory(buildDir, outZip);
  const { size } = statSync(outZip);
  console.log(`✔ Wrote ${outZip} (${(size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('Extension build failed:', err);
  process.exit(1);
});
