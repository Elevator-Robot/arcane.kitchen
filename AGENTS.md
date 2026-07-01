# AGNET

This file is the always-current quick guide for AI/code agents working in this repo.

## Rule 1

When the project changes, update this file in the same PR.

## When AGNET.md must be updated

- New or changed product behavior
- Backend/data model changes
- Auth or permission changes
- Deployment/infrastructure workflow changes
- New contributor or review process changes
- License or legal changes
- New dev-only features that affect the development workflow

## Recipe Data Structure

Recipes now include a `utensils` field (array of strings) for kitchen tools needed:
- Displayed in recipe previews as a bulleted list
- Included in recipe fingerprint for deduplication
- Optional (empty if not provided)

## Profile & Avatars

- Profile data (display name, bio, avatar) is stored in localStorage under `arcaneKitchen.profileData.{userId}`
- The profile menu includes a Saved Recipes view that surfaces recipes already saved through the existing favorites flow; it uses the same saved recipe IDs and does not introduce a second save system.
- Avatars are preset fantasy/D&D-themed portraits in `public/images/avatars/` (36 PNG files)
- Users select an avatar from a grid in the Profile page — no custom photo upload
- Selected avatar filename is saved in `profileData.avatar`; displayed via `<img src="/images/avatars/{filename}" />`
- Fallback: if no avatar selected, shows the initial letter of the display name

## Fake Backend (`src/fake-backend/`)

- In `development` mode (`npm run dev`), a localStorage-backed fake backend replaces Amplify (Cognito, AppSync, S3) entirely
- Auth is auto-authenticated with a hardcoded fake user (`fakelog@arcane.kitchen`)
- Recipes, ingredients, favorites, and images are all stored in `localStorage` under `arcaneKitchen.fakeDb` and `arcaneKitchen.fakeImages`
- Storage config is injected via `Amplify.configure()` so `hasStorageConfig()` returns `true`
- The selection is driven by `import.meta.env.MODE === 'development'` checks; Vite statically replaces this in builds so production bundles don't activate the fake path
- No sandbox or `amplify_outputs.json` is needed in dev mode

## Agent checklist for every PR

1. Check whether any change made AGNET.md inaccurate.
2. If yes, update AGNET.md before opening or merging the PR.
3. Keep updates short, factual, and specific.
4. Update related docs (`README.md`, `docs/*`) when needed.

## Writing style

- Prefer simple bullets over long paragraphs.
- Remove outdated statements instead of stacking contradictions.
- If something is not final, mark it clearly as temporary.
