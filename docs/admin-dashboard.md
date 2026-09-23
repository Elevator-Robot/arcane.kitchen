# Admin Dashboard

Status: planning

Branch: `feat/admin-dashboard`

This document is the source of truth for the admin-dashboard work. Update the
progress and decisions sections as implementation proceeds.

## Goal

Provide a protected admin dashboard for trusted administrators to moderate
recipes, comments, users, and recipe ownership without exposing those powers to
ordinary users.

## Required Features

### Admin access

- Define a durable admin role that is backed by the authentication and backend
  authorization layers, not only by frontend state.
- Allow only admin users to load the dashboard and execute admin mutations.
- Prevent a regular authenticated user from invoking admin operations by
  calling the API directly.
- Make admin actions visually obvious before they are invoked. Destructive or
  privilege-sensitive actions must show a clear admin context, explain what
  will happen, and require an explicit confirmation.

### Recipe moderation

- Show admins a list or searchable view of recipes.
- Allow admins to modify any recipe.
- Allow admins to delete any recipe.
- Make it clear when the current edit or delete action is being performed with
  admin privileges.
- Preserve or intentionally handle linked ingredients, favorites, comments,
  and images when a recipe is deleted.

### Comment moderation

- Show admins comments and the recipes/users associated with them.
- Allow admins to modify any comment.
- Allow admins to delete any comment.
- Make admin edit and delete actions obvious and confirmation-protected.

### User management

- Add a scrollable user-management table to the dashboard.
- Show enough information to identify each user and understand their current
  moderation state.
- Allow admins to delete users.
- Allow admins to ban users.
- Allow admins to unban users.
- Allow admins to hide a user's content.
- Clearly distinguish user deletion, banning, and content hiding in the UI and
  confirmation copy.
- Ensure moderation state is enforced by the backend and reflected consistently
  in feeds, profiles, recipe access, comments, and dashboard data.

### Recipe ownership

- Allow an admin to transfer a recipe from its current owner to another user.
- Support transferring multiple recipes between users, including swapping
  ownership of two recipes (for example, recipe A to user B and recipe B to
  user A).
- Require an explicit confirmation showing the recipe, current owner, and new
  owner for every transfer.
- Ensure the ownership change updates the authoritative owner field and all
  related application behavior.
- Define what happens to ownership when the source or destination user is
  deleted or banned.

## Acceptance Criteria

- A non-admin cannot see the admin dashboard or successfully perform any admin
  mutation, including through direct API requests.
- An admin can moderate recipes and comments regardless of their ownership.
- An admin can find users in the scrollable table and successfully delete,
  ban, unban, and hide content for a selected user.
- A user-content hide action affects all content surfaces covered by the
  product's moderation policy and does not silently delete data.
- An admin can transfer recipe ownership to another user and can complete a
  two-recipe ownership swap without losing either recipe.
- Every destructive or privilege-sensitive action has an unmistakable admin
  indicator and an explicit confirmation step.
- Authorization, moderation, ownership-transfer, and destructive-action paths
  have automated tests.

## Implementation Workstreams

- [ ] Choose and implement the authoritative admin-role mechanism.
- [x] Define the `Admins` Cognito group as the admin-role mechanism.
- [x] Add group-scoped backend authorization for recipe and comment mutations.
- [x] Define backend authorization rules for user and moderation operations.
- [x] Define user moderation state and content-visibility fields.
- [ ] Define safe deletion behavior and linked-record cleanup.
- [ ] Add backend operations for admin recipe/comment moderation.
- [x] Add the admin-authorized Cognito user-list operation.
- [x] Add backend operations for user delete, ban, unban, content hide, and restore through the admin-only `adminActions` mutation.
- [x] Add an ownership-transfer operation with preflight validation and compensating rollback on failed batches.
- [x] Build protected admin routing and access-denied behavior.
- [x] Build the initial admin dashboard shell and navigation.
- [x] Build initial recipe and comment moderation views with explicit admin
  action confirmations.
- [x] Build the initial scrollable user-management table.
- [x] Build ownership-transfer UI and confirmation flows.
- [ ] Add visible admin-context and destructive-action warnings.
- [ ] Add unit, integration, and authorization tests.
- [ ] Update application documentation and deployment notes.

## Decisions To Make

All initial product decisions below are confirmed. Implementation details may
still be refined as the backend capabilities are validated.

- [x] Admin membership uses a Cognito `Admins` group. The initial admin is
  assigned manually through Cognito/AWS administration.
- [x] User deletion is a soft delete: disable access and retain records.
- [x] Banning prevents sign-in and all content writes.
- [x] Hiding content removes it from public and owner views while retaining it
  for admin review.
- [x] Content hiding applies to recipes and comments.
- [x] Admin actions are recorded in an audit log with actor, action, target,
  timestamp, and relevant before/after values.
- [x] Ownership transfer makes the destination user the displayed owner and
  updates `createdBy` to the destination user's `@username`.
- [x] Ownership transfer must support safe multi-recipe swaps, not only
  one-recipe-at-a-time updates.
- [x] Soft deletion hides the user's recipes and comments as well as disabling
  the account.
- [x] Admins can restore a soft-deleted user from the user-management table,
  re-enable access, and restore content visibility.

## Current Context

- Authentication is Amazon Cognito through AWS Amplify Gen 2.
- The current data schema contains `Recipe`, `Ingredient`,
  `RecipeIngredient`, `Favorite`, and `Comment` models.
- `Recipe` currently uses `ownerId` for owner authorization.
- `Comment` currently uses `userId` for owner authorization.
- The admin role, moderation metadata, audit-log model, and admin dashboard
  route now exist; privileged user operations and enforcement are still being
  implemented.
- The deployed Cognito schema is treated as immutable in this project; any
  admin-role design must account for that constraint before changing auth
  attributes.

## Progress Log

### 2026-08-23

- Created branch `feat/admin-dashboard` from `main`.
- Added this planning and requirements document.
- Confirmed the current backend has owner-only mutations for recipes/comments
  and no admin authorization layer.
- Confirmed the initial admin model and moderation lifecycle decisions.
- Added the `Admins` Cognito group and group-scoped recipe/comment
  authorization as the first implementation slice.
- Added live Cognito group detection and a protected `/admin` route.
- Added a conditional `Admin dashboard` option to the authenticated profile
  dropdown for users in the `Admins` group.
- Standardized the three primary tabs on explicit routes: `Discover` uses `/discover`,
  `Build` uses `/build`, and `Admin` uses `/admin`.
- Added initial recipe/comment admin edit and delete controls.
- Added `UserProfile` moderation state, recipe/comment visibility metadata, and
  `AdminAuditLog` schema models as the next backend implementation slice.
- Added the initial admin Users tab and moderation-state actions backed by the
  privileged `adminActions` mutation.
- Added an admin-authorized Cognito user-list query with pagination, so the
  Users tab no longer depends on `UserProfile` rows existing for every user.
- Granted the user-list Lambda role `cognito-idp:ListUsers` access scoped to
  Cognito user pools in the deployed account and region.
- The admin UI reads group membership from a fresh Cognito session. Admins may
  need to sign out and back in after being added to the group so new token
  claims are issued.
- User actions now run through the `adminActions` Lambda-backed mutation. The
  function verifies the `Admins` claim, updates Cognito and moderation records,
  hides owned recipes/comments, and writes an `AdminAuditLog` record.
- Ownership transfers validate every source recipe and destination profile
  before updating, and compensate previously updated recipes if a later update
  fails. A DynamoDB-native transaction is still preferable for strict atomicity.
- The application feed and recipe comment view exclude records marked
  `isHidden`; backend read rules still need a dedicated filtered feed operation
  before hidden records can be considered inaccessible through direct API reads.
