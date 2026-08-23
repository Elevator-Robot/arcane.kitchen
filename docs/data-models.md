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

Auth:

- Owner can create/update/delete/read
- Members of the Cognito `Admins` group can create/update/delete/read
- Authenticated users can read

## Relationships at a glance

- A recipe can have many linked ingredients through `RecipeIngredient`.
- An ingredient can be reused across many recipes through `RecipeIngredient`.
- A user can have many favorite recipes through `Favorite`.

## Admin authorization

- The Cognito `Admins` group has backend-authorized mutation access to
  `Recipe` and `Comment` records, including records the admin does not own.
- User moderation, audit logging, content hiding, and ownership-transfer
  workflows are not yet implemented.
