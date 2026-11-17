# Contributing

Thanks for contributing to Arcane Kitchen.

## Pull request process

1. Create a new branch from `main`.
2. Make your change and push your branch.
3. Open a pull request into `main`.
4. Wait for CI checks to pass.
5. Get at least 2 approvals before merging.

## PR checks

- [PR checks](.github/workflows/pr-checks.yml) runs when a pull request opens,
  reopens, becomes ready for review, or receives a new push.
- Four independent checks cover lint, Vitest, Node CLI tests, and the TypeScript
  production build. A failing check leaves the other checks running; a newer
  push cancels the previous run for that PR.
- CI uses Node.js 24, `npm ci`, and a lockfile-keyed npm download cache.
  These checks run from a clean checkout with read-only repository permissions
  and need no AWS credentials or generated Amplify outputs.
- Lint uses the existing `npm run lint` policy: errors fail; warnings are reported.

Run the same checks locally with Node.js 24:

```bash
npm ci
npm run lint
npm run test:run
node --test scripts/resolve-ampx-entry.test.cjs scripts/migrate-aws-account.test.cjs
npm run build
```

## That's it

- Keep each pull request focused on one change.
- If you get feedback, update the same pull request.
