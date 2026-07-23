const { existsSync, readFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

const resolveAmpxEntryPath = (projectRoot) => {
  try {
    const packageJsonResolution = require.resolve(
      '@aws-amplify/backend-cli/package.json',
      { paths: [projectRoot] }
    );
    const packageJson = JSON.parse(readFileSync(packageJsonResolution, 'utf8'));
    const binTarget = packageJson.bin?.ampx || packageJson.bin?.amplify;

    if (binTarget) {
      const resolvedEntryPoint = join(dirname(packageJsonResolution), binTarget);

      if (existsSync(resolvedEntryPoint)) {
        return resolvedEntryPoint;
      }
    }
  } catch {
    // Fall back to the local shim only if the package metadata cannot be resolved.
  }

  return join(projectRoot, 'node_modules', '.bin', 'ampx');
};

module.exports = { resolveAmpxEntryPath };
