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

## Recipe Save Counts

- Save counts ("hearts") are DERIVED from the `Favorite` records, not a stored counter: the count on a recipe is the number of `Favorite` rows whose `recipeId` matches it — i.e. how many people currently have it saved.
- To make this queryable, `Favorite` authorization includes `read` for authenticated users and guests (in addition to the owner write via `ownerDefinedIn('userId')`).
- `RecipeBuilder.tsx` loads all favorites once (`Favorite.list`) and builds a `recipeId → count` map (`recipeSaves` state); `toggleFavoriteRecipe` updates the map optimistically (±1) alongside the `Favorite` create/delete.
- The save-count load falls back from `userPool` to `identityPool` auth (same pattern as the recipe feed) so guests get real counts too; `Favorite.list` with no `authMode` fails for guests.
- Card previews, the expanded view, and the Profile page (published + saved card counts) all read from `recipeSaves`; clicking the heart toggles the save (the heart was removed from the image overlay). The legacy `FeedRecipe.saves` string field (`'New'`) is NOT a count and must not be used for display.

## Routing (React Router)

- The SPA is wrapped in `BrowserRouter` (in `src/main.tsx`). `react-router-dom` is a dependency.
- The recipe "modal" opens in-place on top of the current page: opening a recipe calls `navigate('<current-pathname>?recipe=<id>')` so the base page stays in the URL (open-from-Discover, -Saved, -Profile all work; no more `stayInView` hack).
- `RecipeBuilder` derives view + modal from the URL via `useLocation`/`useNavigate`:
  - `recipeId = getRecipeIdFromPath(pathname + search)` → expanded recipe modal (`expandRecipe`), resolved from the feed or a direct `Recipe.get` for deep links.
  - `/u/:username` (`getProfileUsernameFromPath`) → Profile view.
  - `/discover` `/build` `/saved` `/drafts` → mapped by `viewForPath`; bare `/` redirects to `/discover`.
- Closing the modal navigates back to the bare base path (legacy `/recipe/:id` deep links fall back to Home on close).
- `UserProfileView`'s `RecipeCard` click must only fall back to `window.location.assign('/recipe/<id>')` when there is NO `onOpenRecipe` handler — never use `onOpenRecipe?.(id) ?? window.location.assign(...)`, because `onOpenRecipe` returns `undefined` (void) and `??` would then always hard-navigate to the legacy deep-link route, forcing a `Recipe.get` load instead of the in-place modal.
- The route-sync `useEffect` (`syncRecipeRoute`) must NOT re-open a recipe that was just dismissed: the effect depends on `expandedRecipeId`, so `collapseExpandedRecipe` sets `justClosedRecipeIdRef` to the id being closed and the effect skips re-expanding that id while the URL's `?recipe=` param is still pending a `navigate` flush. Without this guard, closing would reset `expandedRecipeId` → the effect re-runs → finds the recipe still in the URL → reopens the modal.
- Keep all URL writes on `navigate()`/`useNavigate()` — do NOT mix raw `history.pushState`/`replaceState` with the router.

## Profile & Avatars

- **Cognito is the DB for user profiles.** Every profile edit is mirrored into Cognito user attributes via `syncProfileToCognito` (`src/utils/cognitoProfileSync.ts` → `updateUserAttributes`):
  - displayName → `nickname`
  - bio → `custom:bio`
  - avatar → `custom:avatar`
- **The deployed Cognito pool schema is immutable.** Only attributes created when the pool was first deployed can be written (`nickname`, `custom:bio`, `custom:avatar`, character-preference customs). Adding new attributes to `amplify/auth/resource.ts` breaks the stack update — do not add any without recreating the pool (which deletes all users)
- `amplify/auth/resource.ts` declares the mutable attributes: `nickname`, `custom:bio`, `custom:avatar`, plus character-preference customs (`custom:cookingStyle`, `custom:magicalSpecialty`, `custom:favoriteIngredients`)
- The username/handle cannot be persisted to Cognito (no free attribute in the frozen schema), so it stays in localStorage + the DynamoDB `UserProfile` model
- For offline/first-paint, profile data is cached in localStorage under `arcaneKitchen.userProfiles` (a record keyed by user id). The cache is seeded from Cognito attributes on sign-in (reads prefer `userAttributes` values) and is NOT the source of truth
- Profile edits also sync to the DynamoDB-backed `UserProfile` model via `syncUserProfilesToBackend` (best-effort)
- Avatars are preset fantasy/D&D-themed portraits in `src/assets/avatars/` (21 PNG files, 1024×1024); users select from a grid — no custom photo upload
- Optimized at build time via `vite-plugin-image-optimizer` (sharp, ~74% size reduction); all avatar `<img>` tags use `loading="lazy"`
- Selected avatar filename is saved to `custom:avatar` + `profileData.avatar`; displayed via `<img src={url} />`
- New profiles without an existing avatar are seeded with one random preset avatar from `src/assets/avatars/` and persist it until changed
- Fallback: if no avatar selected, shows the initial letter of the display name

## CloudFront CDN

- `amplify/backend.ts` creates a CloudFront distribution (via CDK escape hatch) and exports its domain via `CfnOutput` + `backend.addOutput({ custom: { CloudFrontDomain } })`
- On bootstrap, `src/main.tsx` reads `outputs.custom.CloudFrontDomain` from `amplify_outputs.json` and stores it via `setCloudFrontDomain()` in `src/amplifyConfig.ts`
- `getRecipeImageSource` in `RecipeBuilder.tsx` reads it dynamically at image-resolution time via `getCloudFrontDomain()`, falling back to `VITE_CLOUDFRONT_DOMAIN` env var
- No env var needed after `npx ampx sandbox deploy` — the domain is auto-detected from the outputs

## Merlin Color Palette

- `src/theme/merlinPalette.ts` is the centralized Merlin/wizard accent palette (`MERLIN_PALETTE`) plus `randomMerlinColor()`.
- Add/remove hex entries there; every consumer updates automatically.
- The Discover tag filters pick a random palette color on every filter click, applied as the selected button's background via inline `style` (Tailwind can't do dynamic arbitrary colors). All palette colors read well with white text.
- Recipe tags in the Build editor/preview and expanded recipe modal receive stable random colors from the same palette when they load; dynamic colors use inline `style` values.
- Profile navigation tabs use a cool-to-warm left-to-right progression from the same palette: Recipes, Drafts, then Saved.
- The `Preparing your kitchen…` loading message uses one random Merlin palette color per display and has no surrounding card container.
- The sign-in button (`Button` primary variant in `src/components/ui/Button.tsx`) uses amethyst/indigo tones from the palette.

## Service Worker (PWA)

- The SW (`public/sw.js`) is registered **only in production** (`import.meta.env.PROD` in `src/main.tsx`). In dev mode any previously registered SW is unregistered and any leftover caches are purged instead.
- Why: `sw.js` serves every same-origin GET cache-first, including Vite dev modules (`/node_modules/.vite/deps/*`). Caching those across optimize passes yields duplicate module instances in the browser ("Invalid hook call: dispatcher is null"). Hashed prod bundles are immutable and safe.
- Caches left behind by an unregistered dev SW can hold stale/mangled copies of unhashed source modules (e.g. the old pre-router `RecipeBuilder.tsx`), so dev boot also runs `caches.delete()` on every recognized cache name.
- If the dev console still shows the duplicate-React error after a code fix, unregister the SW + clear site data once (DevTools → Application → Service Workers).

## Admin Dashboard

- Planning and progress are tracked in `docs/admin-dashboard.md`.
- Admin membership uses the Cognito `Admins` group; the first administrator is assigned manually through Cognito/AWS administration.
- Recipe and comment admin mutations are authorized by the `Admins` group in `amplify/data/resource.ts`; frontend checks must not be treated as authorization.
- The initial protected admin UI is available at `/admin` and reads the live Cognito session group claim; group membership is not persisted in localStorage.
- Primary navigation routes are consistent: Discover is `/discover`, Build is `/build`, and the admin dashboard is `/admin` from the profile dropdown.
- User deletion, banning, content hiding, restoration, audit logging, and safe ownership swaps remain implementation work and must use backend-enforced operations.
- `Recipe` and `Comment` include moderation visibility metadata; `UserProfile` stores moderation state and `AdminAuditLog` stores admin-action history. Privileged operations and feed filtering must still be backend-enforced before these fields are used in production flows.
- The admin Users tab reads all Cognito users through the admin-authorized `listAdminUsers` query; `UserProfile` remains the source for app profile and moderation metadata.

## Agent checklist for every PR

1. Check whether any change made AGNET.md inaccurate.
2. If yes, update AGNET.md before opening or merging the PR.
3. Keep updates short, factual, and specific.
4. Update related docs (`README.md`, `docs/*`) when needed.

## Writing style

- Prefer simple bullets over long paragraphs.
- Remove outdated statements instead of stacking contradictions.
- If something is not final, mark it clearly as temporary.
