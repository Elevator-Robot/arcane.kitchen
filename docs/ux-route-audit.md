# UX and route audit — September 2026

## Improvements

- Supplied catwitch artwork appears on feed failures, missing recipes/profiles, unknown routes, rendering crashes, configuration failures, script-load failures, and the service worker's offline/server-error fallback. The original caption is preserved in the responsive image.
- Discover has a clearer welcome, truthful search counts, distinct empty/error states, filter reset, and retry recovery.
- Search no longer matches unrelated recipes against the viewer's own username. The placeholder accurately describes indexed content.
- Saved recipes and recipe drafts are reachable through the shared account dropdown. Guest routes explain the benefit and offer sign-in in context.
- Shared recipe and profile links accept trailing slashes. Invalid URI escapes are handled safely and query-string recipe IDs are decoded once.
- Unknown URLs show a recovery page. Admin route matching is exact. Each primary route has a descriptive browser title.
- Auth, recipe, and image dialogs contain keyboard focus, close with Escape, and restore focus. Account dropdowns close on Escape or when focus leaves.
- Drafts save incomplete ideas and survive navigation between workspace sections during the autosave debounce.
- Profile username edits start with the current handle and replace the profile URL after a rename.
- Higher-contrast muted text, visible keyboard focus, and reduced-motion styles support more users.

## Route coverage

| Route | Expected journey | Verification |
| --- | --- | --- |
| `/` | Redirect to Discover | Desktop browser |
| `/discover`, `/discover/` | Browse, search, sort, create | Desktop/mobile browser; mocked-data integration tests |
| `/build` | Contextual back action; guest sign-in invitation | Desktop/mobile browser; editor/autosave/publish integration tests |
| `/saved` | Saved collection or guest invitation | Desktop/mobile browser; authenticated integration test |
| `/drafts` | Resume a draft or guest invitation | Desktop/mobile browser; autosave/resume/delete/publish integration tests |
| `/u/:username`, `/profile/:username/` | Public profile or recovery | Desktop/mobile browser for missing profile; profile/author integration tests |
| `/recipe/:id`, `?recipe=:id` | In-place recipe with close/back behavior | Browser failure path; mocked-data open/close/share integration tests |
| `/admin` | Admin-only dashboard or access-required state | Guest desktop browser; privileged mutations need live verification |
| Unknown and admin-prefix lookalikes | 404 with Discover link | Desktop/mobile browser and route tests |

The external creator and support links use HTTPS and open separately. Live authenticated posting, comments, saves, account verification, and admin actions still require testing against a working backend.

## Release follow-ups

- The local Amplify configuration references a missing Cognito Identity Pool. Guest API requests fail with `ResourceNotFoundException`; refresh outputs from the intended environment before live acceptance testing.
- Refreshing or leaving the application entirely within the draft autosave debounce can still lose the latest edit. In-workspace navigation is covered.
- The production build reports a large main JavaScript bundle. Route/editor code splitting is a follow-up performance task.
- Repository-wide lint includes formatting debt in untouched files; check changed files independently when reviewing this pass.

## Checks

- Final automated suite: 54 tests across five Vitest files; separate Node CLI test passes.
- Production build passes. Changed TypeScript files lint with no errors; existing hook/fast-refresh warnings remain.
- Browser fault injection confirmed catwitch recovery when configuration requests fail and when the application script is blocked.
- Production service worker verified with a fresh browser context: artwork and recovery HTML are precached, and offline navigation shows the image successfully.
- `npm run test:run`
- `node --test scripts/resolve-ampx-entry.test.cjs`
- `npm run build`
- Desktop and 390px mobile browser route checks; dialog focus containment, Escape dismissal, and focus restoration.
