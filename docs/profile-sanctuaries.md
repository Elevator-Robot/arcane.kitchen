# Kitchen Sanctuaries

Profiles borrow the expressive cover, curated highlights, and compact identity of
social communities, with a cooking/fantasy character-sheet vocabulary.

## Personalization

- **Birthsign:** The Lantern, The Greenwarden, The Wyrm, The Stargazer, The Sunbearer, The Tidecaller, The Reveler, The Pale Hart, or the unaligned omen The Moth. The selected Birthsign controls the application palette.
- **Station:** Moon Archivist — Lamplit Archive; Hearth Steward — Grand Kitchen; House Apothecary — Lantern Dispensary; Stillhouse Alchemist — Crooked Still; Garden Herbalist — Physic Garden; or Deep Cellarer — Underpantry.
- **Familiar:** Cauldron cat, Pocket dragon, Pantry owl, Foraging fox, Potion frog, Flour-dusted rabbit.
- **Tenet:** up to 80 characters in the profile banner.
- **Main quest and side quest:** separate fields of up to 140 characters for current pursuits.
- **Pantry:** up to three curated favorite ingredients.
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

## Verification

- Public/private rendering and removal of the single Recipes tab.
- Birthsign, Station, familiar, Tenet, main and side quests, ingredient limits, and signature selection.
- Cancel/reset staging, failed-save retention, and successful save feedback.
- Legacy/malformed JSON normalization and preservation through unrelated profile edits.
- Owner-authenticated, paginated backend lookups and failure propagation.
- Desktop/mobile visual checks, dialog Escape behavior, and signature recipe navigation.
