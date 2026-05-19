const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = join(__dirname, '..');
const ampxBin = join(projectRoot, 'node_modules', '.bin', 'ampx');
const shim = join(__dirname, 'node-localstorage-shim.cjs');

const findLtsNode = () => {
  const versionsDir = join(process.env.HOME || '', '.nvm', 'versions', 'node');

  if (!existsSync(versionsDir)) return process.execPath;

  const candidates = readdirSync(versionsDir)
    .filter((version) => /^v(20|22)\./.test(version))
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true })
    )
    .map((version) => join(versionsDir, version, 'bin', 'node'))
    .filter((nodePath) => existsSync(nodePath));

  return candidates[0] || process.execPath;
};

const result = spawnSync(
  findLtsNode(),
  [
    '--require',
    shim,
    ampxBin,
    'sandbox',
    'delete',
    '--yes',
  ],
  {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  }
);

process.exit(result.status ?? 1);
