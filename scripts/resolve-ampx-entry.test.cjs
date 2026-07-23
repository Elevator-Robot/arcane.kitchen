const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join } = require('node:path');

const { resolveAmpxEntryPath } = require('./resolve-ampx-entry.cjs');

test('resolveAmpxEntryPath resolves the Amplify CLI JavaScript entrypoint instead of the shell wrapper', () => {
  const projectRoot = join(__dirname, '..');
  const resolved = resolveAmpxEntryPath(projectRoot);

  assert.match(resolved, /node_modules[\\/]@aws-amplify[\\/]backend-cli[\\/]lib[\\/]ampx\.js$/);
  assert.doesNotMatch(resolved, /node_modules[\\/]\.bin[\\/]ampx$/);
});
