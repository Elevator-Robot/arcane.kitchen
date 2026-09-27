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

- **Birthsign:** The Lantern, The Briar, The Wyrm, The Watcher, The Sunbearer, The Drowned, The Chalice, The Pale Hart, or the unaligned omen The Moth. The selected Birthsign controls the application palette.
- **Calling:** Hedge Witch, Ashkeeper, Alchemist, Ritualist, Root Seer, or Crypt Warden. Show the name without a workplace subtitle or description.
- **Familiar:** Salem (black cat), Veyr (dragon), Orin (owl), Vesper (fox), Morrow (frog), Thistle (rabbit).
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

## Verification

- Public/private rendering and removal of the single Recipes tab.
- Birthsign, Calling, named familiar, Tenet, main and side quests, and signature selection; legacy pantry preservation without pantry UI.
- Cancel/reset staging, failed-save retention, and successful save feedback.
- Legacy/malformed JSON normalization and preservation through unrelated profile edits.
- Owner-authenticated, paginated backend lookups and failure propagation.
- Desktop/mobile visual checks, dialog Escape behavior, and signature recipe navigation.
