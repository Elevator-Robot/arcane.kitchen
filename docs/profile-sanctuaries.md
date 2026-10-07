# Kitchen Sanctuaries

Profiles borrow the expressive cover, curated highlights, and compact identity of
social communities, with a cooking/fantasy character-sheet vocabulary.

## Personalization

Arcane Kitchen is an old culinary archive, kept alive by the people who cook from
it. Its recipes have crossed thresholds, survived abandoned houses, and acquired
notes in unfamiliar hands. Each cook adds a page; each sanctuary reveals something
of its keeper.

The voice is restrained and specific: ash, roots, salt, old folios, a lamp left
burning. Unease comes from what is implied. Familiar spirits have names and
histories. Avoid cheerful magic slogans or borrowed franchise lore. Functional
labels and cooking instructions remain clear and practical.

- **Birthsign:** The Wanderer, The Raven, The Wyrm, The Watcher, The Sage, The Fae, The Witch, The Sorcerer, or The Mage. The selected Birthsign controls the application palette. Existing stored theme IDs remain compatible; names follow this order. The Mage uses mulberry, the Witch muted yellow-green, and the Sorcerer crimson/deep blue with pale blue reading surfaces.
- Birthsign selection uses uncropped 3:2 cards with names on hover/focus and always on touchscreens. Click the feathered artwork behind the profile portrait to choose a Birthsign.
- **Sanctuary:** The Library, The Cottage, The Inn, The Garden, The Observatory, or The Manor. Click the profile banner to open its focused picker; Share remains an independent action. The existing `calling` field and option IDs remain compatible.
- Sanctuary selection uses local 3:1 light/dark artwork pairs. Overlapping image layers follow the device's `prefers-color-scheme` and crossfade when it changes. All six pairs live in `src/assets/sanctuaries/` and map to stable `calling` IDs through `src/theme/sanctuaryArtwork.ts`.
- The selected artwork is the Sanctuary indicator on profiles; do not repeat its icon or name as an identity tag. Discover and Build use the signed-in viewer's Sanctuary artwork in their banners.
- Profile banners omit generic Sanctuary headings, Birthsign names, symbols, and lore lines. They show the username on one truncated line over the artwork without repeating it below. The profile section uses the former username space for the bio.
- **Familiar:** Salem (black cat), Veyr (dragon), Orin (owl), Vesper (fox), Morrow (frog), Luna (rabbit).
- Click the familiar image to open its owner-only picker. Artwork controls react on hover, focus, and press, respecting reduced motion. Save preserves other identity fields; Cancel and retry after errors are supported.
- The portrait picker is titled “Who are you?” and shows character names on hover/focus (always on touch). Its grid expands without internal scrolling; the outer overlay remains scrollable when the viewport cannot fit all portraits.
- Familiar selection uses uncropped 3:2 light/dark artwork cards, with names shown on hover/focus and always on touchscreens. The selected portrait appears in public profile details. Assets live in `src/assets/familiars/` and map to stable IDs through `src/theme/familiarArtwork.ts`.
- **Main quest and side quest:** separate fields of up to 140 characters for current pursuits.
- Each quest heading has its own edit action. Pin recipe/Change pinned recipe lives beside the Recipes collection heading and offers published recipes plus No pinned recipe. Focused editors save/reset only their own field; there is no general customization menu.
- Legacy Tenet and pantry values remain in stored JSON for compatibility; neither is displayed or editable.
- **Signature creation:** one of the cook's own published recipes, featured above the collection.
- Existing avatar presets and the 500-character bio remain available. The About editor shares the read view's width and typography and shows the full existing text immediately, without a height cap or internal scrolling. A text mirror keeps its height responsive while editing; bio copy encourages kitchen lore.

## Public and owner views

- Visitors see the sanctuary, identity, creative details, optional signature recipe,
  and published recipe grimoire. The redundant single Recipes tab is removed.
- Owners switch between two collection panels: Recipes (their published work) and Saved (private inspiration), with counts and descriptive labels. Drafts stay in the account menu at `/drafts`.
- Saved is selected with `?collection=saved` on the owner's profile URL. The menu shortcut opens that collection; legacy `/saved` links redirect there after sign-in. Recipe overlays preserve the selected collection when opened and closed.
- Drafts uses the viewer's light/dark Sanctuary banner and is labeled “Drafts” in the menu. Dialog backdrops dismiss on click unless a save is pending; clicks inside the content do not dismiss.
- Sharing lives in the artwork banner. The bio is a quiet “A note from the cook” section beside the portrait, with seamless full-length inline editing.
- The Witch portrait is retired from the picker and random signup assignment; existing saved portraits remain compatible.
- Saved collections and draft titles are never rendered for visitors. Public recipe
  cards have no inert edit menu. Recipe titles support keyboard activation.
- Public totals are published-recipe counts and their real community saves; no fake
  followers, experience points, streaks, or achievement badges.

## Saving

`UserProfile.kitchenIdentity` is optional JSON. Older profiles use safe defaults.
The form previews changes locally; Cancel discards them. Successful owner-authenticated
backend writes update local caches and both public-profile lookup maps. Failed writes
keep the choices in the editor and offer another save attempt. Reset choices changes
only the form until saved.

The new field requires an Amplify backend deployment and refreshed outputs. Cognito's
immutable attribute schema is unchanged. Local browser visual checks use fixture data
while the configured Identity Pool is unavailable; backend behavior is covered by
mocked persistence tests, not a live deployment.

## Verification

- Public/private rendering and removal of the single Recipes tab.
- Birthsign, Sanctuary, named familiar, main and side quests, and signature selection; legacy Tenet and pantry preservation without their former UI.
- Cancel/reset staging, failed-save retention, and successful save feedback.
- Legacy/malformed JSON normalization and preservation through unrelated profile edits.
- Owner-authenticated, paginated backend lookups and failure propagation.
- Desktop/mobile visual checks, dialog Escape behavior, and signature recipe navigation.
