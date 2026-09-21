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

Recipe identity fields:
- `Recipe.ownerId` is the authoritative owner and authorization key
- `Recipe.createdBy` is denormalized display metadata and must match the owner's `@username`
- Recipe creation, edits, username changes, and ownership transfers synchronize `createdBy`

UserProfile login reconciliation:
- On every successful login, the backend `UserProfile` row is checked first and wins over Cognito/local cache values
- Cognito attributes seed a `UserProfile` only when the backend row is missing
- Missing first-signup profiles receive one random preset avatar and keep it until changed

Authentication submission:
- Custom sign-in and account creation requests are deduplicated while in flight so one attempt cannot send multiple confirmation codes
- Recipe ownership uses the Cognito subject (`sub`/`userId`), never the Cognito login username, when publishing or mutating recipes

## User-Facing Errors

- `ErrorArtwork` uses the supplied catwitch image at `/images/catwitch.webp` on unavailable-content and recovery screens. Keep the complete image and caption visible; do not crop it.
- `AppErrorBoundary` and startup/configuration fallbacks show catwitch artwork and reload recovery instead of a blank application. The production service worker precaches the artwork and `offline.html` for unavailable navigations.
- `src/utils/userFacingErrors.ts` is the shared boundary for displaying backend, Cognito, storage, and network errors to users.
- Use `getUserFacingErrorMessage()` for UI messages and keep raw errors in `console.error` diagnostics only; do not render raw `error.message` or serialized error objects.

## Profile Route Resolution

- Profile routes track the requested sanitized username independently from the resolved profile record, so loading or failed `/u/:username` lookups cannot fall through to the signed-in user's profile.
- A profile route renders the private profile only when its requested username matches the signed-in user's username; unresolved routes render a loading or not-found state.

## Hosting And Image Fallbacks

- Amplify Hosting serves client-side routes through the SPA rewrite in `amplify.yml`; direct `/discover` and `/discover/` visits must resolve to `index.html`.
- Profile and recipe cards use local/inline fallbacks for missing images and must not reference nonexistent `/api/placeholder/*` endpoints.

## Cognito Hosted-UI Domains

- The production `main-branch` stack owns the `arcanekitchen` Cognito domain prefix.
- Other Amplify branch stacks retain Amplify-managed unique domains; do not reuse the production prefix across branch deployments.

## Recipe Save Counts

- Save counts ("hearts") are DERIVED from the `Favorite` records, not a stored counter: the count on a recipe is the number of `Favorite` rows whose `recipeId` matches it — i.e. how many people currently have it saved.
- To make this queryable, `Favorite` authorization includes `read` for authenticated users and guests (in addition to the owner write via `ownerDefinedIn('userId')`).
- `RecipeBuilder.tsx` loads all favorites once (`Favorite.list`) and builds a `recipeId → count` map (`recipeSaves` state); `toggleFavoriteRecipe` updates the map optimistically (±1) alongside the `Favorite` create/delete.
- The save-count load falls back from `userPool` to `identityPool` auth (same pattern as the recipe feed) so guests get real counts too; `Favorite.list` with no `authMode` fails for guests.
- Card previews, the expanded view, and the Profile page (published + saved card counts) all read from `recipeSaves`; clicking the heart toggles the save (the heart was removed from the image overlay). The legacy `FeedRecipe.saves` string field (`'New'`) is NOT a count and must not be used for display.

## Routing (React Router)

- Unknown routes show a dedicated recovery page; route-aware document titles distinguish Discover, Build, Saved, Drafts, Profile, and Admin. Admin matching is exact, not a prefix match.
- Shared recipe/profile paths accept trailing slashes and malformed URI escapes cannot crash route parsing. Query-string recipe IDs are decoded once.
- Returning to a profile URL without `?recipe=` dismisses the recipe overlay; renaming your profile replaces its route with the new handle.
- Account menus link directly to Saved recipes and Recipe drafts. Guests receive contextual sign-in invitations on those routes and on personal Discover filters.
- Auth, recipe, and full-size image overlays use `AccessibleDialog` for keyboard containment, Escape dismissal, and focus restoration.
- Discover distinguishes request failures (with Retry), empty collections, empty filters (with Clear all filters), and successful search counts. Search covers recipe text, tags, and authors; it does not claim to index ingredient records.
- Nonempty drafts autosave without requiring a photo or ingredients, and the debounce survives navigation between workspace views. Browser refresh/unmount during the debounce is still a follow-up.
- Authentication initialization waits for the live session check before showing the workspace, including when cached auth exists.
- Shared styles provide visible keyboard focus, higher-contrast muted text, and reduced-motion support.

- The SPA is wrapped in `BrowserRouter` (in `src/main.tsx`). `react-router-dom` is a dependency.
- The recipe "modal" opens in-place on top of the current page: opening a recipe calls `navigate('<current-pathname>?recipe=<id>')` so the base page stays in the URL (open-from-Discover, -Saved, -Profile all work; no more `stayInView` hack).
- Recipe attribution links (`by @username`) activate an exact author filter in Discover from every recipe view; the selected author appears only in the dismissible Author Collection banner, which includes a `View author profile` action to `/u/:username`.
- Author profiles are full pages only, never popups. Comment authors and mentions navigate directly to `/u/:username`.
- Usernames render without a leading `@` in profile/account identity and editor-preview displays; `@username` is reserved for clickable published recipe attribution and comment mentions.
- Recipe sharing copies the recipe URL directly to the clipboard and shows temporary `Copied!` feedback; it does not open a share menu or render a green status banner.
- `RecipeBuilder` derives view + modal from the URL via `useLocation`/`useNavigate`:
  - `recipeId = getRecipeIdFromPath(pathname + search)` → expanded recipe modal (`expandRecipe`), resolved from the feed or a direct `Recipe.get` for deep links.
  - `/u/:username` (`getProfileUsernameFromPath`) → Profile view.
  - `/discover` `/build` `/saved` `/drafts` → mapped by `viewForPath`; bare `/` redirects to `/discover`.
- Closing the modal navigates back to the bare base path (legacy `/recipe/:id` deep links fall back to Home on close).
- A `/u/:username` route matching the signed-in user's normalized username renders the editable private profile view, including published recipes, drafts, and saved recipes; other matching profiles render the read-only public view.
- Public profiles show published recipes only; Drafts and Saved tabs are private and must not render for another user's profile.
- `UserProfileView`'s `RecipeCard` click must only fall back to `window.location.assign('/recipe/<id>')` when there is NO `onOpenRecipe` handler — never use `onOpenRecipe?.(id) ?? window.location.assign(...)`, because `onOpenRecipe` returns `undefined` (void) and `??` would then always hard-navigate to the legacy deep-link route, forcing a `Recipe.get` load instead of the in-place modal.
- The route-sync `useEffect` (`syncRecipeRoute`) must NOT re-open a recipe that was just dismissed: the effect depends on `expandedRecipeId`, so `collapseExpandedRecipe` sets `justClosedRecipeIdRef` to the id being closed and the effect skips re-expanding that id while the URL's `?recipe=` param is still pending a `navigate` flush. Without this guard, closing would reset `expandedRecipeId` → the effect re-runs → finds the recipe still in the URL → reopens the modal.
- Keep all URL writes on `navigate()`/`useNavigate()` — do NOT mix raw `history.pushState`/`replaceState` with the router.
- Discover and Build are not global navigation tabs. The recipe explorer is the home surface, its search row owns the responsive `Create recipe` action, and the editor header owns the contextual `Back to recipes` action.
- The Discover search bar groups standard search, clear, and newest/oldest sort controls in one responsive surface; sorting is a labeled icon toggle rather than a separate select.
- Discover opens directly with search, Create recipe, filters, and the feed; there is no promotional welcome card above the search controls.
- Primary content uses centered `max-w-6xl` rails where practical; profile cards use shared theme tokens, profile identity stacks on narrow screens, and forms/body copy remain left-aligned for readability.

## Profile & Avatars

- Profiles are Kitchen Sanctuaries: four atmosphere presets, six culinary callings, six familiars, an 80-character motto, a 140-character cooking quest, up to three curated pantry ingredients, and one optional pinned published recipe. These are creative public details, not personal-information fields or earned ranks.
- `UserProfile.kitchenIdentity` is optional JSON, normalized through `src/utils/kitchenIdentity.ts` and persisted through `saveKitchenIdentityToBackend`. Customization waits for a successful owner-authenticated backend write before updating caches/UI; errors leave the editor open for retry. No Cognito attributes are added.
- Public profiles have no collection tab bar and no edit/customization controls. Owners retain Recipes/Drafts/Saved navigation. Signature recipes resolve only against that profile’s published collection; missing/deleted pins are hidden.
- Profile customization and avatar selection use `AccessibleDialog`; the customization form previews choices before save and Cancel discards them. Community save totals derive from published-recipe favorites, with no placeholder follower, level, or achievement counts.
- Deploy the updated Amplify data schema and regenerate outputs before using Kitchen Sanctuary persistence in a live environment.
- **The DynamoDB `UserProfile` model is the backend source of truth** for public profiles (`/u/:username` pages + recipe author attribution). One row per user: `userId` (owner), `username` (required, GSI key), `displayName` (required), `bio`, `avatar`, `needsUsernameSetup`. Auth is `ownerDefinedIn('userId')` for writes + authenticated/guest read, with `secondaryIndexes([index('username'), index('userId')])`. See `docs/data-models.md`.
- `RecipeBuilder` loads all public profiles once via `listUserProfilesFromBackend` into `backendProfilesByUserId`/`backendProfilesByUsername`; `/u/:username` (`profileRouteProfile`) and recipe author hydration read from these backend maps first, falling back to localStorage.
- Username uniqueness is enforced server-side by `isUsernameTakenServerSide` (backend list check) on create/rename — no Lambda; a tiny race window is accepted. Because `username` is a GSI key, renames delete + recreate the row (can't UpdateItem a GSI key).
- **Cognito is not the source of truth.** Every profile edit is still mirrored into Cognito attributes via `syncProfileToCognito` (`displayName`→`nickname`, `bio`→`custom:bio`, `avatar`→`custom:avatar`), and edits also sync to the `UserProfile` model via `syncUserProfilesToBackend` (owner-scoped, best-effort).
- **The deployed Cognito pool schema is immutable.** Only attributes created when the pool was first deployed can be written (`nickname`, `custom:bio`, `custom:avatar`, character-preference customs). Adding new attributes to `amplify/auth/resource.ts` breaks the stack update — do not add any without recreating the pool (which deletes all users)
- `amplify/auth/resource.ts` declares the mutable attributes: `nickname`, `custom:bio`, `custom:avatar`, plus character-preference customs (`custom:cookingStyle`, `custom:magicalSpecialty`, `custom:favoriteIngredients`)
- The username/handle has no free Cognito attribute in the frozen schema, so it lives only in the `UserProfile` model + localStorage cache
- For offline/first-paint, profile data is cached in localStorage under `arcaneKitchen.userProfiles` (a record keyed by user id), seeded from Cognito attributes on sign-in; reads prefer `userAttributes` values; it is NOT the source of truth
- Avatars are preset fantasy/D&D-themed portraits in `src/assets/avatars/` (21 PNG files, 1024×1024); users select from a grid — no custom photo upload (the broken Upload-Photo tab was removed from `ProfileHeader.tsx`; the avatar modal is presets-only)
- Optimized at build time via `vite-plugin-image-optimizer` (sharp, ~74% size reduction); all avatar `<img>` tags use `loading="lazy"`
- Selected avatar filename is saved to `custom:avatar` + `profileData.avatar` + the `UserProfile` row; displayed via `<img src={url} />`
- New profiles without an existing avatar are seeded with one random preset avatar from `src/assets/avatars/` and persist it until changed
- Fallback: if no avatar selected, shows the initial letter of the display name
- The external-profile block shows only `profileRouteProfile.avatar` (never the viewer's own avatar), and shares the profile handle via `shareProfile` → `onShareProfile`

## CloudFront CDN

- `amplify/backend.ts` creates a CloudFront distribution (via CDK escape hatch) and exports its domain via `CfnOutput` + `backend.addOutput({ custom: { CloudFrontDomain } })`
- On bootstrap, `src/main.tsx` reads `outputs.custom.CloudFrontDomain` from `amplify_outputs.json` and stores it via `setCloudFrontDomain()` in `src/amplifyConfig.ts`
- `getRecipeImageSource` in `RecipeBuilder.tsx` reads it dynamically at image-resolution time via `getCloudFrontDomain()`, falling back to `VITE_CLOUDFRONT_DOMAIN` env var
- No env var needed after `npx ampx sandbox deploy` — the domain is auto-detected from the outputs

## Sanctuary Design Language

- `SanctuaryHeading` and `SanctuaryMotif` in `src/components/ui/` share the profile atmosphere presets and constellation artwork across Saved, Drafts, Build, sign-in, and Admin. Profile banners use the same motif.
- Discover remains search-first with no promotional hero. Recipe cards and expanded recipes use parchment surfaces, clear serif headings, restrained jewel accents, and keyboard-activatable recipe titles.
- Shared `ak-panel`, `ak-recipe-card`, `ak-eyebrow`, `ak-banner-action`, and `ak-empty-state` classes live in `src/index.css`. Button/Input/Card/Badge use these theme tokens instead of separate dark/neon styling.
- The Build workspace scrolls as one column below 1024px, with preview following the form; desktop retains independently scrolling editor and preview panes. Keep the `ak-workspace-build` and `ak-editor-fields` hooks when adjusting layout.
- Catwitch remains the complete, uncropped recovery artwork. Shared auth inputs associate labels and errors with their fields; pale-on-parchment error colors must not be reintroduced.

## Merlin Color Palette

- `src/theme/merlinPalette.ts` is the centralized Merlin/wizard accent palette (`MERLIN_PALETTE`) plus `randomMerlinColor()`.
- Add/remove hex entries there; every consumer updates automatically.
- The Discover tag filters pick a random palette color on every filter click, applied as the selected button's background via inline `style` (Tailwind can't do dynamic arbitrary colors). All palette colors read well with white text.
- Recipe tags in the Build editor/preview and expanded recipe modal receive stable random colors from the same palette when they load; dynamic colors use inline `style` values.
- Profile navigation tabs use a cool-to-warm left-to-right progression from the same palette: Recipes, Drafts, then Saved.
- The `Preparing your kitchen…` loading message uses one random Merlin palette color per display and has no surrounding card container.
- The sign-in button (`Button` primary variant in `src/components/ui/Button.tsx`) uses amethyst/indigo tones from the palette.
- Active and selected controls use `randomMerlinColor()` from `src/theme/merlinPalette.ts`; do not add hard-coded orange or brown button states.

## Service Worker (PWA)

- The SW (`public/sw.js`) is registered **only in production** (`import.meta.env.PROD` in `src/main.tsx`). In dev mode any previously registered SW is unregistered and any leftover caches are purged instead.
- Why: `sw.js` serves same-origin static GETs cache-first, except runtime `amplify_outputs.json`, which is always fetched from the network. Caching Vite dev modules (`/node_modules/.vite/deps/*`) across optimize passes yields duplicate module instances in the browser ("Invalid hook call: dispatcher is null"). Hashed prod bundles are immutable and safe.
- `amplify_outputs.json` is never cached because stale branch Identity Pool IDs cause authentication and data requests to fail after an Amplify environment is replaced.
- Caches left behind by an unregistered dev SW can hold stale/mangled copies of unhashed source modules (e.g. the old pre-router `RecipeBuilder.tsx`), so dev boot also runs `caches.delete()` on every recognized cache name.
- If the dev console still shows the duplicate-React error after a code fix, unregister the SW + clear site data once (DevTools → Application → Service Workers).

## Admin Dashboard

- Planning and progress are tracked in `docs/admin-dashboard.md`.
- Admin membership uses the Cognito `Admins` group; the first administrator is assigned manually through Cognito/AWS administration.
- Recipe and comment admin mutations are authorized by the `Admins` group in `amplify/data/resource.ts`; frontend checks must not be treated as authorization.
- The initial protected admin UI is available at `/admin` and reads the live Cognito session group claim; group membership is not persisted in localStorage.
- Primary routes remain consistent: Discover is `/discover`, Build is `/build`, and the admin dashboard is `/admin` from the profile dropdown.
- The authenticated profile dropdown is shared by the main app and admin dashboard through `src/components/ProfileDropdown.tsx`; keep its identity data, menu items, icons, and styling consistent across routes.
- User deletion, banning, content hiding, restoration, audit logging, and ownership transfers use the admin-only `adminActions` backend mutation; public feed filtering and a fully atomic multi-record ownership transaction remain follow-up work.
- `Recipe` and `Comment` include moderation visibility metadata; `UserProfile` stores moderation state and `AdminAuditLog` stores admin-action history. Privileged operations and feed filtering must still be backend-enforced before these fields are used in production flows.
- The admin Users tab reads all Cognito users through the admin-authorized `listAdminUsers` query; `UserProfile` remains the source for app profile and moderation metadata.
- The `Admins` Cognito group uses a separate identity-pool role, so admin recipe-image uploads require an explicit `Admins` storage rule in addition to the authenticated rule.

## Agent checklist for every PR

- Vitest runs `src/**/*.{test,spec}.{ts,tsx}`; run the Node CLI test separately with `node --test scripts/resolve-ampx-entry.test.cjs`.

1. Check whether any change made AGNET.md inaccurate.
2. If yes, update AGNET.md before opening or merging the PR.
3. Keep updates short, factual, and specific.
4. Update related docs (`README.md`, `docs/*`) when needed.

## Writing style

- Prefer simple bullets over long paragraphs.
- Remove outdated statements instead of stacking contradictions.
- If something is not final, mark it clearly as temporary.
