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
- Birthsign selection uses supplied constellation artwork in uncropped 3:2 cards, with names shown on hover or keyboard focus and always on touchscreens. The live preview includes the selected image and name. Assets are local optimized WebP files in `src/assets/birthsigns/`.
- **Sanctuary:** The Library, The Cottage, The Inn, The Garden, The Observatory, or The Manor, in this order. Show names without numbers or subtitles. The existing `calling` field and option IDs remain compatible. The editor is titled **Customize profile**, with **Save changes** as its submit action.
- Sanctuary selection uses local 3:1 light/dark artwork pairs. `<picture>` follows the device's `prefers-color-scheme`. All six pairs live in `src/assets/sanctuaries/` and map to stable `calling` IDs through `src/theme/sanctuaryArtwork.ts`.
- The selected artwork is the Sanctuary indicator on profiles; do not repeat its icon or name as an identity tag. Discover uses the signed-in viewer's Sanctuary artwork behind the Emporium search banner.
- Profile banners omit generic Sanctuary headings, Birthsign names, symbols, and lore lines. They show the user-entered Tenet when present. For an authenticated owner with no Tenet, the app requests an in-memory random quote placeholder; public viewers and failed requests use “Good food, made often.”
- **Familiar:** Salem (black cat), Veyr (dragon), Orin (owl), Vesper (fox), Morrow (frog), Luna (rabbit).
- Familiar selection uses uncropped 3:2 light/dark artwork cards, with names shown on hover or keyboard focus and always on touchscreens. The selected portrait appears in the live preview and public profile details. Assets live in `src/assets/familiars/` and map to stable familiar IDs through `src/theme/familiarArtwork.ts`.
- **Tenet:** up to 80 characters in the profile banner.
- **Main quest and side quest:** separate fields of up to 140 characters for current pursuits.
- Legacy pantry choices remain in stored JSON for compatibility; no pantry section is displayed or editable.
- **Signature creation:** one of the cook's own published recipes, featured above the collection.
- Existing avatar presets and bio remain available; bio copy encourages kitchen lore.

## Public and owner views

- Visitors see the sanctuary, identity, creative details, optional signature recipe,
  and published recipe grimoire. The redundant single Recipes tab is removed.
- Owners additionally see Customize sanctuary and private Recipes/Drafts/Saved navigation.
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

## Quote placeholder

`randomProfileQuote` is an authenticated Amplify Data query backed by `amplify/functions/random-profile-quote`. The function randomly selects one of API Ninjas' supported categories: wisdom, philosophy, life, truth, inspirational, relationships, love, faith, humor, success, courage, happiness, art, writing, fear, nature, time, freedom, death, or leadership. It calls `/v2/randomquotes` with the API key kept in the `API_NINJAS_API_KEY` Amplify secret.

Set the secret independently in every deployed environment before deploying the schema:

```sh
npx ampx sandbox secret set API_NINJAS_API_KEY
```

The returned quote is cached only in the current JavaScript session and is passed to both the banner and Tenet input as placeholder copy. It is never written to `UserProfile`, Cognito, localStorage, or sessionStorage. API errors and missing deployment support fall back locally without blocking profiles. API Ninjas states that commercial use requires a premium subscription; confirm the deployed application's plan complies with its terms.

## Verification

- Public/private rendering and removal of the single Recipes tab.
- Birthsign, Sanctuary, named familiar, Tenet, main and side quests, and signature selection; legacy pantry preservation without pantry UI.
- Cancel/reset staging, failed-save retention, and successful save feedback.
- Legacy/malformed JSON normalization and preservation through unrelated profile edits.
- Owner-authenticated, paginated backend lookups and failure propagation.
- Desktop/mobile visual checks, dialog Escape behavior, and signature recipe navigation.
