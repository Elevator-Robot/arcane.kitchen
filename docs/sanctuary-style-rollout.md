# Sanctuary style rollout

Branch: `deploy/sanctuary-style-rollout`

## Shared design language

The profile's parchment surfaces, jewel-tone atmosphere, serif headings, fine
borders, and quiet constellation details now extend to the rest of the app.

- `SanctuaryMotif` is decorative artwork shared by profile banners, page headers,
  and recipe photo placeholders. It is hidden from assistive technology.
- `SanctuaryHeading` provides a functional page title, small section label,
  optional description, and actions. Backgrounds come from the existing kitchen
  atmosphere presets, not a second competing palette.
- Shared CSS classes provide panels, recipe cards, empty states, eyebrow labels,
  and readable controls on dark headers.
- Shared page backgrounds, recipe placeholders, and accents now follow the viewer's
  saved profile atmosphere. Guests use Moonlit; another cook's profile banner keeps
  that cook's own choice. The theme changes immediately after a successful profile save.
- Button, Input, Card, and Badge use the shared palette; animated button particles
  and unrelated dark/green input styling are removed.

## Surfaces

- **Discover:** compact heading, search/sort/create controls, roomier filter targets,
  and editorial recipe cards with descriptions. No welcome hero or promotional copy.
- **Expanded recipe:** a cookbook-style title, metadata strip, ingredient/instruction
  panels, and a clearly separated conversation section. Missing photos are illustrated
  placeholders rather than nonfunctional “Add Photo” prompts.
- **Build:** personalized workshop header, grouped form fields, a clearer publish action,
  and a preview styled like a recipe card. Mobile uses one scrolling column; desktop
  keeps two work panes. Guests receive a normal sign-in panel instead of a floating
  panel obscuring disabled fields.
- **Saved / Drafts:** collection headers using the viewer's saved atmosphere, consistent empty states,
  and matching recipe/draft cards.
- **Authentication:** the original member-kitchen image beside the form on desktop
  and above it on mobile, with parchment form controls,
  including the default Amplify screens. Shared inputs have associated labels and
  error descriptions; existing sign-in, Google, and password-recovery flows remain.
- **Admin:** moderation header using the viewer's saved atmosphere, matching panels, labeled transfer selectors,
  and readable danger/warning text on light surfaces.
- **Recovery / install:** shared parchment panels; catwitch remains uncropped.

## Verification

- All 67 Vitest tests passed, including saved-theme propagation, immediate theme changes after saving, and isolation from another cook's profile atmosphere; the production build passed.
- Changed frontend files lint with zero errors and eight existing hook/fast-refresh warnings.
- Existing automated tests cover recipe navigation, search/sort, author collections,
  saving, draft autosave, publishing, profiles, and error recovery.
- Desktop and 390px mobile checks cover Discover, Saved, Drafts, Build, sign-in,
  and the admin access screen.
- Signed-in visuals use isolated in-browser model stubs. Live data verification is
  still limited by the missing Identity Pool referenced by local outputs. No fixture
  records or mocked clients are included in the application source.
- Keyboard opening of recipe cards, dialog dismissal, input labels, and mobile
  editor scrolling are checked in the browser.
- Admin Recipes/Comments/Users tabs were exercised with read-only fixture data;
  the Users table stays within the viewport on mobile.
- No backend/schema changes are part of this visual rollout.
