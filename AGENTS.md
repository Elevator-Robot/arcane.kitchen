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

- **Cognito is the DB for user profiles.** Every profile edit is mirrored into Cognito user attributes via `syncProfileToCognito` (`src/utils/cognitoProfileSync.ts` → `updateUserAttributes`):
  - displayName → `name`
  - username → `preferred_username`
  - bio → `custom:bio`
  - avatar → `custom:avatar`
- `amplify/auth/resource.ts` declares the mutable attributes: `name`, `preferred_username`, `nickname`, `custom:bio`, `custom:avatar`, plus character-preference customs (`custom:cookingStyle`, `custom:magicalSpecialty`, `custom:favoriteIngredients`)
- For offline/first-paint, profile data is cached in localStorage under `arcaneKitchen.userProfiles` (a record keyed by user id). The cache is seeded from Cognito attributes on sign-in (reads prefer `userAttributes` values) and is NOT the source of truth
- Profile edits also sync to the DynamoDB-backed `UserProfile` model via `syncUserProfilesToBackend` (best-effort)
- Avatars are preset fantasy/D&D-themed portraits in `src/assets/avatars/` (21 PNG files, 1024×1024); users select from a grid — no custom photo upload
- Optimized at build time via `vite-plugin-image-optimizer` (sharp, ~74% size reduction); all avatar `<img>` tags use `loading="lazy"`
- Selected avatar filename is saved to `custom:avatar` + `profileData.avatar`; displayed via `<img src={url} />`
- Fallback: if no avatar selected, shows the initial letter of the display name

## CloudFront CDN

- `amplify/backend.ts` creates a CloudFront distribution (via CDK escape hatch) and exports its domain via `CfnOutput` + `backend.addOutput({ custom: { CloudFrontDomain } })`
- On bootstrap, `src/main.tsx` reads `outputs.custom.CloudFrontDomain` from `amplify_outputs.json` and stores it via `setCloudFrontDomain()` in `src/amplifyConfig.ts`
- `getRecipeImageSource` in `RecipeBuilder.tsx` reads it dynamically at image-resolution time via `getCloudFrontDomain()`, falling back to `VITE_CLOUDFRONT_DOMAIN` env var
- No env var needed after `npx ampx sandbox deploy` — the domain is auto-detected from the outputs

## Agent checklist for every PR

1. Check whether any change made AGNET.md inaccurate.
2. If yes, update AGNET.md before opening or merging the PR.
3. Keep updates short, factual, and specific.
4. Update related docs (`README.md`, `docs/*`) when needed.

## Writing style

- Prefer simple bullets over long paragraphs.
- Remove outdated statements instead of stacking contradictions.
- If something is not final, mark it clearly as temporary.
