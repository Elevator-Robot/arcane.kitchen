# Data Models

This document gives a simple overview of the app's current backend models.

Source of truth: `amplify/data/resource.ts`.

## `Recipe`

Purpose: stores recipe posts shown in the shared feed.

Main fields:

- `id`
- `name` (required)
- `ownerId` (required)
- `createdBy` (required; synchronized to the owner's `UserProfile.username`, stored as `@username`)
- `description`
- `instructions` (array of strings)
- `prepTime`
- `tags` (array of strings)
- `imageUrl`
- `recipeNameKey`
- `recipeFingerprint`
- `ratings` (array of JSON values)
- `isHidden`
- `hiddenAt`
- `hiddenBy`

Auth:

- Owner can create/update/delete/read
- Members of the Cognito `Admins` group can create/update/delete/read
- Authenticated users can read
- Guests can read

## `Ingredient`

Purpose: stores ingredient names.

Main fields:

- `id`
- `name` (required)

Auth:

- Authenticated users can create/update/delete/read
- Guests can read

## `RecipeIngredient`

Purpose: links recipes to ingredients and stores quantity details.

Main fields:

- `id`
- `recipeId` (required)
- `ingredientId` (required)
- `quantity` (required JSON; amount/unit payload)

Auth:

- Authenticated users can create/update/delete/read
- Guests can read

## `Favorite`

Purpose: stores which recipes a user has favorited.

Main fields:

- `id`
- `userId` (required)
- `recipeId` (required)

Auth:

- Owner-only access based on `userId`

## `Comment`

Purpose: stores comments attached to recipes.

Main fields:

- `id`
- `recipeId` (required)
- `userId` (required)
- `author` (required)
- `content` (required)
- `parentId`
- `isHidden`
- `hiddenAt`
- `hiddenBy`

Auth:

- Owner can create/update/delete/read
- Members of the Cognito `Admins` group can create/update/delete/read
- Authenticated users can read

## Relationships at a glance

- A recipe can have many linked ingredients through `RecipeIngredient`.
- An ingredient can be reused across many recipes through `RecipeIngredient`.
- A user can have many favorite recipes through `Favorite`.
- `Recipe.ownerId` identifies the owner; `Recipe.createdBy` is denormalized display metadata and must match that owner's username.

## `UserProfile`

Purpose: stores the public profile and moderation state for a user. Public
profiles power `/u/:username` pages and recipe author attribution.

Main fields:

- `id` (auto-generated)
- `userId` (required, owner)
- `username` (required; GSI key — renames delete + recreate the row, cannot UpdateItem a GSI key)
- `displayName` (required)
- `bio`
- `avatar` (preset filename)
- `kitchenIdentity` (optional JSON): `theme`, `calling`, `familiar`, `motto`, `quest`, `pantry`, `signatureRecipeId`. Defaults and limits live in `src/utils/kitchenIdentity.ts`; presets represent creative choices rather than earned achievements.
- `needsUsernameSetup`
- `isBanned`
- `isDeleted`
- `contentHidden`
- `moderationUpdatedAt`
- `moderationUpdatedBy`

Indexes:

- `secondaryIndexes([index('username'), index('userId')])`

Username uniqueness is enforced server-side by
`isUsernameTakenServerSide` (backend list check) on create/rename; a small
race window is accepted because no Lambda is involved.

On login, the backend profile is reconciled first. Cognito attributes are used
only to seed a missing `UserProfile` row and do not overwrite an existing row.

Kitchen Sanctuary customization uses the existing owner-write/public-read authorization.
The save path updates only `kitchenIdentity` on an existing profile and surfaces failed
mutations instead of caching an unsaved choice. Other profile edits preserve this field.
No new Cognito attributes are needed. Deploy the data schema and regenerate Amplify
outputs before validating live saves across accounts. A signature recipe is displayed
only if it belongs to the profile's currently published recipe collection.

Auth:

- Owners can create/update their profile through `ownerDefinedIn('userId')`
- Authenticated users and guests can read public profiles
- Members of the Cognito `Admins` group can access moderation operations

## `AdminAuditLog`

Purpose: records admin moderation and ownership actions.

Main fields:

- `actorUserId` (required)
- `action` (required)
- `targetType` (required)
- `targetId` (required)
- `before`
- `after`
- `createdAt` (required)

Auth:

- Members of the Cognito `Admins` group can read audit records

## Admin authorization

- The Cognito `Admins` group has backend-authorized mutation access to
  `Recipe` and `Comment` records, including records the admin does not own.
- Moderation fields, `UserProfile`, and `AdminAuditLog` are now represented in
  the schema; privileged moderation functions and content filtering are still
  implementation work.
