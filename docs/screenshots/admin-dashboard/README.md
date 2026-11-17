# Backrooms redesign review

Captured for [PR #115](https://github.com/Elevator-Robot/arcane.kitchen/pull/115)
on November 17, 2026, from application commit
[`498ff05`](https://github.com/Elevator-Robot/arcane.kitchen/commit/498ff05d75dbe8904be9a3fb68ec4ecbf210720c).

## Capture details

- Chromium, light color scheme, reduced motion, 1× pixel density, and US English.
- Desktop: **1440 × 1080**. Mobile: **390 × 844**.
- Actual browser viewports saved as lossless WebP, with the local-preview strip
  visible. Detail views scroll the workspace to the relevant controls.
- Start with `VITE_MOCK_PREVIEW=true npm run dev`, choose **Preview admin**, then
  open Rowan's profile and **Backrooms**.
- All accounts, emails, recipes, comments, and audit entries are fictional.
  The existing preview adapter was supplemented in the browser with six accounts,
  active/hidden/banned/deleted account states, one password-reset status, and
  visible/hidden comments and recipes.
- The activity screenshot uses a read-only fixture with four initial entries and
  two more behind a `nextToken`. This demonstrates the UI's pagination;
  the default preview adapter does not include an audit-log model.
- Destructive and ownership-transfer dialogs were opened and canceled. These are
  local UI review captures, not evidence of deployed backend authorization.

## Screenshot guide

| Screenshot | What to review |
| --- | --- |
| [Recipes overview](recipes-overview-desktop.webp) | Profile workspace context, five-section icon rail, monogram cards, visibility badges, featured-recipe sidebar, and profile pin control. |
| [Inline ownership transfer](ownership-transfer-desktop.webp) | Owner chip opens a searchable cook list; Sage is selected. The current owner and banned/deleted accounts are excluded. |
| [Comment moderation](comments-moderation-desktop.webp) | Author initials, visible/hidden states, Hide/Show and Edit actions, and Delete comment in the open more menu. |
| [User management](users-moderation-desktop.webp) | Cognito status alongside merged profile flags, Password change pending, moderation actions, and a separate danger-zone column. |
| [Account deletion guard](delete-account-guard-desktop.webp) | Owned-recipe count, optional Reassign first, email confirmation, and disabled Delete account before a match. |
| [Activity log](activity-log-desktop.webp) | Human-readable actions, actor/target metadata, timestamps, category filter, and Load more for the next fixture page. |
| [Reports placeholder](reports-placeholder-desktop.webp) | Open/Resolved/Dismissed controls and the explicit message that reporting has not shipped. |
| [Recipes on mobile](recipes-mobile.webp) | Horizontal icon rail and stacked filters; also exposes the recipe-card layout regression described below. |
| [Reports on mobile](reports-placeholder-mobile.webp) | Wrapped status controls and the complete empty-state explanation at 390px. |

## Interaction checks

- Ownership reassignment opens a confirmation; Cancel keeps the current owner.
- Comment deletion requires the more menu and a cancelable confirmation.
- Account deletion stays disabled until the typed email matches.
- Reassign first opens recipe search with the selected user's name.
- Activity Load more passes the returned token, appends the second fixture page,
  and disappears when exhausted; category filtering works on the loaded entries.
- All three report categories render their corresponding empty states.
- No uncaught browser errors occurred. The 390px viewport has no document or
  workspace horizontal overflow, but recipe-card text still collapses internally.

## Findings at the captured commit

These remain open in this snapshot:

1. **Build fails:** `AdminDashboard.tsx` passes `recipeHref` to panels that do not
   accept it, leaves the `onFeature` callback parameter implicitly typed, and
   reads `imageUrl` missing from `AdminRecipe`.
2. **Feature selection is missing:** `RecipesPanel` no longer renders a Feature
   action, although the sidebar still instructs admins to use one. Clearing the
   existing slot remains available.
3. **Recipe/conversation links leave Backrooms:** both extracted panels hard-code
   `/discover?recipe=…` instead of using the workspace-preserving `recipeHref`.
4. **Mobile recipe cards are unreadable:** at 390px, the nonshrinking action group
   crowds the title and compresses the description to approximately one character
   per line. See [the mobile capture](recipes-mobile.webp).
5. **Reassign first is not an exact owner filter:** Sage owns two recipes, but the
   resulting `sage` text search also returns Rowan's pasta because its description
   mentions sage.

Local validation:

- `npm run test:run` — **148 passed, 3 failed**. Failures cover embedded recipe
  links and the two featured-selection workflows.
- `npm run build` — **failed** with the four TypeScript errors summarized above.
- `npm run lint` — passed with seven warnings.
- `node --test scripts/resolve-ampx-entry.test.cjs scripts/migrate-aws-account.test.cjs`
  — all 14 passed.
