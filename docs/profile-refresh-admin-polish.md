# Profile refresh and admin polish

Branch: `deploy/profile-refresh-admin-polish`, created from `main` after PR #107.

## Profile refresh

Two rendering transitions caused the refresh flicker:

1. The initial workspace used the last localStorage tab, then corrected itself to
   the requested URL in an effect.
2. Profile checks replaced an already-rendered cached profile with a loading message,
   unmounting the header and any open editor before restoring the profile.

The initial workspace now follows the URL. The requested handle is derived directly
from the route, so a pending lookup cannot briefly show the viewer's own profile.
Cached/resolved profiles stay mounted during revalidation; an uncached route uses a
stable profile-shaped skeleton. Empty recipe collections are not announced before
the initial feed request completes, and later refreshes do not replace existing
collections with a loading skeleton.

## Admin console

See `admin-dashboard.md` for search/filter/paging, confirmation, and mutation-feedback
behavior. Backend pagination is collected before client-side search and result paging.
Backend operations and authorization are unchanged. The ownership-transfer UI now
uses the existing admin action with preflight validation and auditing rather than
directly updating ownership fields.

## Verification

- 81 Vitest tests pass. The production build passes; changed frontend files lint
  without errors, with existing RecipeBuilder hook warnings remaining.
- Regression tests cover a cached profile staying mounted during a delayed lookup,
  including an in-progress bio edit, and cold profile routes avoiding viewer identity.
- Admin tests cover non-admin access, backend pagination, search/filter reset,
  confirmation cancellation, rejected GraphQL mutations, in-flight deduplication,
  success feedback, user-status updates, and failed refresh retention.
- Browser checks use isolated data/auth fixtures, not live moderation mutations.
  A delayed profile revalidation was sampled over 101 animation frames with no
  loading-screen or wrong-view flashes after the cached profile appeared.
- Desktop/mobile checks cover admin pagination, search, status filters, dialog
  dismissal, and table overflow. Live authenticated verification still requires a
  working backend configuration.
