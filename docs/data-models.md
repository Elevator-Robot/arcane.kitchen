# Data Models

This document gives a simple overview of the app's current backend models.

Source of truth: `amplify/data/resource.ts`.

## `Recipe`

Purpose: stores recipe posts shown in the shared feed.

Main fields:

- `id`
- `name` (required)
- `ownerId` (required)
- `createdBy` (required)
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

## `UserProfile`

Purpose: stores the backend profile and moderation state for an authenticated
user.

Main fields:

- `userId` (required)
- `username` (required)
- `displayName` (required)
- `bio`
- `avatar`
- `needsUsernameSetup`
- `isBanned`
- `isDeleted`
- `contentHidden`
- `moderationUpdatedAt`
- `moderationUpdatedBy`

Auth:

- Owner can read/create/update their profile
- Members of the Cognito `Admins` group can read/create/update profiles

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
