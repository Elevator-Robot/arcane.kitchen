# Shared glass controls and community tags

## Implementation

- `src/components/ui/Button.tsx` is the reusable native-button primitive. It forwards
  refs, supports explicit submit semantics, and exposes loading through disabled and
  `aria-busy` states. Standard actions, profile menus/tabs, presets, and tag controls
  consume it; existing native controls can use the same variant classes.
- `src/index.css` owns the glass surfaces, inset highlights, blur, shadows, hover,
  selected, focus, and disabled states. Login controls use the shared blur token
  through their scoped Amplify adapter.
- Primary uses the viewer's accent; secondary is neutral frosted parchment; danger
  and danger-soft distinguish destructive actions. Choice controls retain their
  Merlin selection colors and pressed semantics. Menus and quiet icon actions stay
  subtle; clickable recipe titles and author links remain typographic.
- Banner/photo controls use readable dark glass with white text. The logo is an
  explicit exception: no visible button surface, a springy press, and keyboard focus.
- The sort control has a fixed width at each breakpoint. Its label changes without
  moving the search field or Create action.
- Buttons have a subtle 3% press bounce; the transparent logo retains its stronger
  10% spring. Both respect reduced motion. Independent CSS `scale` preserves existing
  translations on positioned icon controls.
- Headings and static login content are non-selectable, while credential inputs
  retain normal selection and editing. Discover feed failures show retry text without
  catwitch artwork; full-page recovery keeps the supplied image.

## Discover

- Filters are derived from community recipe tags rather than shortcut buttons or
  separate official/community sections. Tag suggestions in the recipe editor remain.
- There is no All, Favorites, New, or My recipes system chip, and no New card badge.
  Saved recipes and personal collections remain available through account navigation.
- A selected tag toggles off on a second click. An actual community tag named All
  has ordinary filtering semantics, rather than being a reserved shortcut.
- Discover has no loading tiles: pending empty requests leave the results area empty,
  and background requests retain existing cards. Screen-reader loading feedback remains.
- Counts represent recipes, deduplicating case variants within a recipe.
- The first twelve tags are visible by default; Show all exposes the rest in a
  bounded, wrapping list. A selected tag remains visible after collapsing the list.
- `RecipeTagFilters` renders the shared Button choice variant. Editor tag suggestions
  also support native keyboard activation.

## Checks

- Regression tests cover tag selection/deselection, removed shortcuts, ordinary
  reserved-looking tag names, unique recipe counts, overflow selection retention,
  keyboard suggestion activation, and the Button's ref/loading/submit behavior.
- Validate the sort width, invisible logo press, selected filters, disabled controls,
  menus, and no horizontal page overflow at narrow and wide viewport sizes.
- Login is intentionally preserved, including the compact error-dismiss column.
