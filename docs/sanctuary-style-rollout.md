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
- Button, Input, Card, and Badge use the shared palette; animated button particles
  and unrelated dark/green input styling are removed.

## Surfaces

- **Discover:** compact heading, search/sort/create controls, roomier filter targets,
  and editorial recipe cards with descriptions. No welcome hero or promotional copy.
- **Expanded recipe:** a cookbook-style title, metadata strip, ingredient/instruction
  panels, and a clearly separated conversation section. Missing photos are illustrated
  placeholders rather than nonfunctional “Add Photo” prompts.
- **Build:** moonlit workshop header, grouped form fields, a clearer publish action,
  and a preview styled like a recipe card. Mobile uses one scrolling column; desktop
  keeps two work panes. Guests receive a normal sign-in panel instead of a floating
  panel obscuring disabled fields.
- **Saved / Drafts:** grove and moonlit collection headers, consistent empty states,
  and matching recipe/draft cards.
- **Authentication:** compact sanctuary-framed dialog and parchment form controls,
  including the default Amplify screens. Shared inputs have associated labels and
  error descriptions; existing sign-in, Google, and password-recovery flows remain.
- **Admin:** celestial moderation header, matching panels, labeled transfer selectors,
  and readable danger/warning text on light surfaces.
- **Recovery / install:** shared parchment panels; catwitch remains uncropped.

## Verification

- All 62 Vitest tests passed; the separate Node CLI test and production build passed.
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
