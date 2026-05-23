const { existsSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

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
    '--once',
    '--outputs-out-dir',
    'public',
  ],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      AK_COGNITO_DOMAIN_PREFIX: (() => {
        const identifier =
          process.env.AMPLIFY_SANDBOX_IDENTIFIER ||
          process.env.USER ||
          'sandbox';
        const projectHash = createHash('sha1')
          .update(projectRoot)
          .digest('hex')
          .slice(0, 6);
        return `arcanekitchen-${identifier}-${projectHash}`;
      })(),
    },
    stdio: 'inherit',
  }
);

process.exit(result.status ?? 1);
