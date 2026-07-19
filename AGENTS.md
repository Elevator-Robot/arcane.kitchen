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
- Avatars are preset fantasy/D&D-themed portraits in `src/assets/avatars/` (11 WebP files, originally PNG)
- Converted to WebP (avg ~92% size reduction via sharp) and optimized at build time via `vite-plugin-image-optimizer`
- All avatar `<img>` tags use `loading="lazy"`
- Users select an avatar from a grid in the Profile page — no custom photo upload
- Selected avatar filename is saved in `profileData.avatar`; displayed via `<img src={url} />`
- Fallback: if no avatar selected, shows the initial letter of the display name

## Recipe Drafts

- Drafts are stored locally per user and restored automatically when that user returns to Build
- Draft autosave is debounced and keeps title, ingredients, instructions, utensils, and image preview data
- The profile menu includes a Drafts view with resume and delete actions, alongside Saved Recipes
- Successful publish removes the active draft record

## CloudFront CDN

- `amplify/backend.ts` creates a CloudFront distribution (via CDK escape hatch) and exports its domain via `CfnOutput` + `backend.addOutput({ custom: { CloudFrontDomain } })`
- On bootstrap, `src/main.tsx` reads `outputs.custom.CloudFrontDomain` from `amplify_outputs.json` and stores it via `setCloudFrontDomain()` in `src/amplifyConfig.ts`
- `getRecipeImageSource` in `RecipeBuilder.tsx` reads it dynamically at image-resolution time via `getCloudFrontDomain()`, falling back to `VITE_CLOUDFRONT_DOMAIN` env var
- No env var needed after `npx ampx sandbox deploy` — the domain is auto-detected from the outputs
- Sandbox deploy scripts in `scripts/` invoke the Amplify CLI through the installed JavaScript entrypoint, which keeps `npm run deploy:sandbox` working reliably across Windows, macOS, and Linux

## Agent checklist for every PR

1. Check whether any change made AGNET.md inaccurate.
2. If yes, update AGNET.md before opening or merging the PR.
3. Keep updates short, factual, and specific.
4. Update related docs (`README.md`, `docs/*`) when needed.

## Writing style

- Prefer simple bullets over long paragraphs.
- Remove outdated statements instead of stacking contradictions.
- If something is not final, mark it clearly as temporary.
