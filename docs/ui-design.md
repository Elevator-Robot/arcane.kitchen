# A living culinary guild

Arcane Kitchen is a place to cook, collect, and share recipes, with the personal
expression of an RPG character sheet. Food and people lead; sanctuary artwork,
familiars, and signs give the community its world.

## Visual language

- Warm parchment reading surfaces, ink-colored text, amethyst accents, fine rules,
  and restrained bookplate frames. The Wanderer is the neutral default; saved
  signs still theme the application.
- Almendra for the brand and illustrated banners, Fraunces for recipe titles,
  Nunito for practical controls and reading copy.
- Food-forward cards with author portraits, human-readable durations, and real
  save totals. A local CookingPot illustration handles absent or failed photos.
- Search stays in the Emporium banner. Community tags sit on the reading surface
  below it, with a compact disclosure and accessible selected states.
- Create recipe uses the upper-right banner action area on the Emporium and the
  owner's profile. Search fills the row beneath it.
- Banners have no outline or inset frame. Every page shares `ak-page-rail` widths
  and gutters, including profiles, the editor, Backrooms, and recovery screens.
  The editor banner spans its form and preview panes.
- `PageBanner` fixes all page/profile banner frames to 200px tall, or 180px below
  640px, with shared crop, padding, title sizing, and corners. Switching profile
  workspaces does not resize the banner.
- Feed, featured, and profile recipe cards use equal grid tracks and 16:10 photos.
  Profiles use four/three/two/one columns at the common breakpoints, even for short
  collections. A pinned recipe is the first ordinary card with a small badge.
- Sign and familiar artwork share 3:2 frames (160px wide on desktop), and both
  pickers use the same grid and dialog width. Editor photos and compact admin
  thumbnails also use the recipe crop ratio.

## Discovery and community

- Search matches all query words across titles, descriptions, tags, and authors.
- Tags are multi-select: results must match every chosen tag as well as search
  and author filters. Clear tags keeps the search; Clear all filters resets it.
- Search, selected tags/colors, author, and sort are remembered in sessionStorage
  for the current tab, including refresh.
- The Community cooks list links to authors represented in the loaded feed, with their
  actual recipe counts. The sidebar spotlights a recipe selected by an admin,
  with its photograph, attribution, preparation time, and an action to open it.
- Admins change or clear the feature in their profile's Backrooms tab. The persisted selection uses
  `FeaturedRecipe` with admin-only writes and public reads. It resolves outside
  feed pagination; empty, missing, hidden, or unavailable selections omit the card.
- A plain link beneath the sidebar cook list opens members' saved collections;
  guests get a text-only sign-in action. Existing author attribution filters and
  shared URLs remain.

## Cooking and creating

- Ingredient and numbered instruction checkboxes are always available, with a
  visible step-completion meter. Checking or unchecking a step updates progress
  immediately; there is no start/stop/reset panel.
- This is personal cooking progress, kept in `sessionStorage` for this tab.
  Reopening the same recipe restores it. Revised ingredients/instructions clear
  stale progress. Storage failure leaves controls usable.
- The editor has numbered manuscript sections and a four-part readiness strip.
  Each item jumps to its relevant form section. Publishing uses the existing
  required-field checks; the preview updates as the cook writes.
- There is no Drafts page or menu item. `/drafts` redirects to `/build`; the editor
  restores the signed-in owner's latest locally autosaved recipe directly.
- Chef details are collapsed by default and expand downward from A note from the
  chef. Bio, sign, familiar, and quest placeholders share the compact panel.
  Expansion is remembered per cook for this tab. Collapsed content is inert;
  portrait editing opens independently. Bio drafts survive closing/reopening the panel.
- Profile pin selection appears only in Backrooms under Your profile. The Backrooms
  tab is plain text, and the regular collection has no pin-management button.

## Implementation

- `ProfileLink` replaces the account dropdown with a direct, illuminated portrait
  link. Log out is a quiet owner-only text action at the profile's bottom-right; the footer contains X Feedback
  & Support.
- `UserProfileView` adds an admin-only Backrooms tab at `?workspace=backrooms`.
  It uses the shared banner and embeds the existing admin toolset, keeping recipe
  overlays in place. `/admin` remains a redirecting compatibility entry point for admins.

- `src/components/WorkspaceHeader.tsx`, `WorkspaceFooter.tsx`: the shared public
  and admin workspace frame.
- `src/styles/guild.css`: responsive layouts and culinary-guild components.
- `src/styles/admin.css`: matching admin collection controls, record rows,
  curation sidebar, and responsive tables/forms.
- `src/components/CommunityHearth.tsx`: community sidebar.
- `src/components/RecipeCookingGuide.tsx`: tab-local cooking companion.
- `src/components/RecipeReadiness.tsx`: editor section navigation.
- `src/components/ui/RecipeImage.tsx`, `CookAvatar.tsx`: shared imagery.
- `src/components/ui/PageBanner.tsx`: common banner artwork/layout frame.
- `src/components/profile/ChefNote.tsx`: accessible, persistent profile disclosure.
- `src/utils/discoverPreferences.ts`: validated tab-local explorer preferences.
- `src/utils/recipeDisplay.ts`: reading-friendly duration and portrait resolution.
- `src/utils/recipeImages.ts`: common CDN/storage image resolution. Admin
  `RecipePhoto` thumbnails resolve only while their rows are mounted.
- `src/preview/`: fictional recipes and profiles, local photography credits,
  session-persisted model adapter, and guest/member/admin preview controls. Demo
  model writes restore from `arcaneKitchen.previewData.v1` on reload. Preview login
  reconciles that profile before rendering. Fixtures load only in development when enabled.

## Verification

- [Desktop and mobile review screenshots](screenshots/culinary-guild/README.md) show the local demo preview used for PR #114.
- `npm run build`, `npm run lint`, and `npm run test:run`.
- `node --test scripts/resolve-ampx-entry.test.cjs scripts/migrate-aws-account.test.cjs`.
- Browser checks at desktop, tablet, 390px, and 320px: search/filter/sort, featured
  recipe selection/clearing, sharing, cook/recipe routing, ingredient and step progress, modal
  keyboard behavior, private/public profiles, familiar changes, photo selection,
  and publishing through the local preview adapter.
- Verify paired artwork with dark system colors and reduced-motion settings.
- Measure banner equality between Emporium, Profile, Backrooms, and Build at
  1440px, 1024px, 768px, 390px, and 320px. Compare gallery/featured/profile photo
  boxes, matching sign/familiar frames, and picker cells at the same widths.
