# Arcane Kitchen Data Migration Runbook

Last updated: 2026-10-03

Status: Production migration completed and reconciled. Google SSO callback deployment and native-user password resets remain pending.

## Purpose

This runbook covers the application data that must move when `arcane.kitchen` migrates from the Brain AWS account to the dedicated Arcane.Kitchen AWS account.

The migration scope is deliberately limited to:

- Cognito users and administrator group membership
- DynamoDB user profiles and their avatar references
- Recipes and the ingredient records required to keep recipes complete
- Favorites, which represent users' saved recipes
- Recipe comments
- Recipe images stored in S3

Public-domain, DNS, registrar, certificate, Amplify custom-domain, and Cognito hosted-domain handoff are owned and performed separately by the application owner. This runbook treats a working destination backend and authentication endpoint as prerequisites.

## Confirmed Accounts And Scope

| Item | Value |
| --- | --- |
| Source AWS account | Brain, `431515038332` |
| Source AWS profile | `opencode-brain` |
| Destination AWS account | Arcane.Kitchen, `617394174030` |
| Destination AWS profile | `opencode-arcane.kitchen` |
| AWS region | `us-east-1` |
| Environment | Production `main` only |
| Maintenance window | Accepted |
| Native Cognito users | Password reset accepted |
| Google OAuth project | Controlled by the owner |
| Domain and DNS work | Controlled by the owner; out of scope here |
| Source cleanup | Performed manually by the owner after acceptance |

## Explicit Non-Goals

- Do not migrate `deploy/discover-theme-cohesion`.
- Do not migrate the orphaned `deploy/recencile-users` backend stack family.
- Do not migrate `AdminAuditLog` records.
- Do not migrate CloudWatch logs or operational history.
- Do not migrate local browser drafts, localStorage, IndexedDB, or cached sessions.
- Do not manage the public domain, DNS, certificates, or hosted UI domain in this runbook.
- Do not delete source resources during the migration.
- Do not copy source physical resource names or IAM policies into the destination.

## Safety Rules

1. Keep the source data and image bucket intact until destination acceptance is complete.
2. Create independent backups before running any production migration step.
3. Never import records with source Cognito `sub` values left in ownership fields.
4. Stop if any source user cannot be mapped unambiguously to one destination user.
5. Stop if data counts, relationships, or image checksums do not reconcile.
6. Keep migration artifacts encrypted and outside the Git repository.
7. Never write passwords, tokens, OAuth secrets, or full private user exports to logs.
8. Run every migration utility in dry-run mode before allowing writes.
9. Keep source writes frozen from the final export until destination acceptance.
10. Do not delete the source S3 stack; it contains automatic object-deletion resources.

## Source Inventory Snapshot

Refresh this inventory immediately before rehearsal and production migration.

### Cognito

| Property | Value |
| --- | --- |
| User pool | `us-east-1_7FQKmE9yN` |
| Identity pool | `us-east-1:708d4f37-88d1-47ce-8362-46372c77f824` |
| App client | `keng3s63sos1rc96cvqv05uvq` |
| Total users | 14 |
| Google-federated users | 11 |
| Native confirmed users | 3 |
| `Admins` members | 3 |
| MFA | Off |
| User-pool deletion protection | Inactive |

The destination user pool must define the current mutable attributes before users are created:

- `nickname`
- `custom:cookingStyle`
- `custom:magicalSpecialty`
- `custom:favoriteIngredients`
- `custom:avatar`
- `custom:bio`

### AppSync And DynamoDB

| Property | Value |
| --- | --- |
| AppSync API ID | `mjs5ycxmbbgplagkglo6qbp5mi` |
| GraphQL endpoint | `https://3r63ejx2t5gojgnuzfme5xuake.appsync-api.us-east-1.amazonaws.com/graphql` |
| Primary authorization | Cognito user pool |
| Additional authorization | IAM |

In-scope inventory snapshot:

| Model | Approximate records | Approximate size | Migrate |
| --- | ---: | ---: | --- |
| `Comment` | 4 | Refresh before cutover | Yes |
| `Favorite` | 27 | Refresh before cutover | Yes |
| `Ingredient` | 157 | 23,011 B | Yes |
| `RecipeIngredient` | 129 | 32,345 B | Yes |
| `Recipe` | 12 | 26,767 B | Yes |
| `UserProfile` | 8 | Refresh before cutover | Yes |
| `AdminAuditLog` | 0 | 0 B | No |

The source tables currently have point-in-time recovery and deletion protection disabled. No on-demand backups were found during the inventory.

### Recipe Images

| Property | Value |
| --- | --- |
| Source bucket | `amplify-d22utsjgryn9pw-ma-recipeimagesbucket390b81-o17lj1aowgcj` |
| Object count | 17 |
| Total size | 31,813,837 bytes, approximately 30.4 MiB |
| Source CDN | `d3qvl3283ktwc8.cloudfront.net` |

Images normally use relative keys under `recipe-images/*`. Preserve exact keys, content types, and relevant metadata.

### Profile Pictures

Profile avatars are preset artwork bundled in `src/assets/avatars/`. Users do not upload independent profile-image objects to S3.

The migration must preserve each profile's `avatar` value and verify that it still resolves to a bundled destination asset. There is no separate profile-picture bucket to copy.

## Destination Prerequisites

The destination account was clean at inventory time. It had no Amplify app, Cognito pool, AppSync API, DynamoDB tables, recipe-image bucket, or CloudFront distribution.

Before this data runbook begins, the owner or infrastructure workflow must provide:

- [ ] Destination Amplify production backend deployed from the migration candidate commit
- [ ] Destination Cognito user pool with the required schema
- [ ] Destination identity pool and app client
- [ ] Google identity provider configured and tested
- [ ] Destination `Admins` group created
- [ ] Destination AppSync API available
- [ ] Empty destination tables for all current models
- [ ] Destination recipe-image S3 bucket available
- [ ] Destination recipe-image CDN available
- [ ] Destination generated `amplify_outputs.json` captured for validation
- [ ] Destination writes blocked from public traffic until migration acceptance

The destination Lambda concurrency quota was only 10 at inventory time. Increasing it is recommended before production testing, although it does not block the data copy itself.

The destination `OpenCode-ReadOnly` SSO permission set also had `AdministratorAccess` attached. Correct that permission set and use a separate deployment or migration identity with only the required permissions.

## Required Deployment Order

Amplify infrastructure must be deployed before any Cognito, DynamoDB, or S3 data is seeded. The production order is:

1. Create and connect the destination Amplify app.
2. Configure required Amplify secrets, including the Google OAuth client ID and secret.
3. Deploy production `main` to provision Cognito, AppSync, DynamoDB, S3, Lambda, and the recipe-image CDN.
4. Keep the destination unavailable to public writes.
5. Seed destination Cognito users and recreate `Admins` membership.
6. Retrieve destination Cognito `sub` values and finalize the old-to-new identity mapping.
7. Transform application records using that mapping.
8. Copy recipe images to the destination S3 bucket using their existing keys.
9. Seed DynamoDB in dependency order: `Ingredient`, `Recipe`, `UserProfile`, `RecipeIngredient`, `Favorite`, then `Comment`.
10. Run reconciliation and application acceptance tests.
11. Allow the owner to complete domain and traffic cutover only after data acceptance.

Do not seed DynamoDB before Cognito. Recipe, profile, favorite, and comment authorization depends on destination Cognito subjects, which do not exist until the destination users have been created.

## Data Relationships

Preserve these identifiers and relationships:

- `Recipe.id`
- `Ingredient.id`
- `RecipeIngredient.id`
- `RecipeIngredient.recipeId`
- `RecipeIngredient.ingredientId`
- `Favorite.id`
- `Favorite.recipeId`
- `Comment.id`
- `Comment.recipeId`
- `Comment.parentId`
- `UserProfile.kitchenIdentity.signatureRecipeId`
- Recipe image keys

Transform these Cognito identity references from the source `sub` to the destination `sub`:

- `Recipe.ownerId`
- `UserProfile.userId`
- `Favorite.userId`
- `Comment.userId`
- Recipe moderation fields such as `hiddenBy` and `moderationUpdatedBy`
- Comment moderation fields such as `hiddenBy` and `moderationUpdatedBy`
- User profile moderation identity fields, if populated

Rewrite denormalized `Recipe.createdBy` and comment `author` values from the explicitly selected destination profile so attribution remains consistent after identity merges.

## Required Migration Artifacts

The dry-run-first utility is implemented in:

- `scripts/migrate-aws-account.cjs`
- `scripts/aws-account-migration.config.cjs`
- `scripts/migrate-aws-account.test.cjs`

Migration artifacts belong under ignored `.migration/`. They contain user data and must remain encrypted, access-controlled, and outside source control.

Implemented operations:

- [x] Cognito user inventory export
- [x] Destination Cognito user creation or import
- [x] Google identity linking
- [x] `Admins` membership recreation
- [x] Old-to-new Cognito `sub` mapping
- [x] DynamoDB export of the six in-scope models
- [x] User-ID transformation
- [x] Destination DynamoDB import
- [x] S3 recipe-image copy
- [x] Record-count and checksum reconciliation
- [x] Relationship-integrity validation
- [ ] Destination smoke testing

Each utility must:

- Support dry-run mode
- Refuse ambiguous identity mappings
- Avoid logging secrets or password material
- Produce a concise machine-readable result report
- Be safe to rerun or explicitly detect already-imported records

### Command Sequence

Use a fresh directory for each rehearsal or production attempt.

```bash
# Read-only rehearsal export. It cannot be applied.
npm run migrate:aws -- export-source --dir .migration/rehearsal

# Final export after source writes are frozen.
npm run migrate:aws -- export-source --dir .migration/production --confirm-source-frozen

# Generate and record the approved identity review.
npm run migrate:aws -- plan-users --dir .migration/production
npm run migrate:aws -- approve-review --dir .migration/production --approve-all-identities --approve-all-admins --approve-suggested-profiles

# Dry-run and apply Cognito seeding.
npm run migrate:aws -- seed-users --dir .migration/production
npm run migrate:aws -- seed-users --dir .migration/production --apply --confirm-account 617394174030

# Transform ownership and reviewed conflicts locally.
npm run migrate:aws -- transform-data --dir .migration/production

# Dry-run and apply recipe-image migration.
npm run migrate:aws -- seed-images --dir .migration/production
npm run migrate:aws -- seed-images --dir .migration/production --apply --confirm-account 617394174030

# Dry-run and apply DynamoDB migration.
npm run migrate:aws -- seed-data --dir .migration/production
npm run migrate:aws -- seed-data --dir .migration/production --apply --confirm-account 617394174030

# Reconcile Cognito, DynamoDB, S3, and CloudFront.
npm run migrate:aws -- verify --dir .migration/production

# Send native-user reset codes only when communications are ready.
npm run migrate:aws -- send-password-resets --dir .migration/production
npm run migrate:aws -- send-password-resets --dir .migration/production --apply --confirm-account 617394174030
```

All AWS-mutating commands are dry-run-only without the exact valueless `--apply` flag and matching `--confirm-account 617394174030`. Values such as `--apply=false` are rejected rather than interpreted as apply mode.

## Phase 1: Back Up The Source

Owner approval is required before changing AWS backup settings.

- [ ] Enable PITR on the six in-scope DynamoDB tables.
- [ ] Create named on-demand backups of those tables.
- [ ] Verify every backup reaches `AVAILABLE`.
- [ ] Export all six in-scope tables to an encrypted migration location.
- [ ] Record item counts, byte sizes, and content checksums.
- [ ] Inventory every object in the recipe-image bucket.
- [ ] Record key, size, content type, ETag or stronger checksum, and metadata.
- [ ] Create an independent copy of every recipe image.
- [ ] Export Cognito users, attributes, provider identities, status, and group membership.
- [ ] Confirm the export contains 14 users or document the refreshed count.

### Gate 1

Do not proceed unless the DynamoDB backups and independent recipe-image backup are complete and verified.

## Phase 2: Export And Validate Source Data

Export these models:

1. `Ingredient`
2. `Recipe`
3. `UserProfile`
4. `RecipeIngredient`
5. `Favorite`
6. `Comment`

Validation checks:

- [ ] Every `RecipeIngredient.recipeId` resolves to an exported recipe.
- [ ] Every `RecipeIngredient.ingredientId` resolves to an exported ingredient.
- [ ] Every `Favorite.recipeId` resolves to an exported recipe.
- [ ] Every `Comment.recipeId` resolves to an exported recipe.
- [ ] Every non-empty `Comment.parentId` resolves to an exported comment.
- [ ] Every signature recipe ID resolves to an exported recipe or is intentionally cleared.
- [ ] Every relative recipe image key exists in the image inventory.
- [ ] Every user ID in an ownership field exists in the Cognito inventory or has an approved exception.
- [ ] Every profile avatar value maps to a bundled avatar asset or an approved fallback.

Record orphaned or malformed data before changing it. Do not silently drop records.

## Phase 3: Create Destination Users

### Google Users

For each Google-federated user:

1. Export the source username, source `sub`, normalized verified email, status, profile attributes, and Google provider identity.
2. Create the intended destination Cognito user with invitation messaging suppressed.
3. Link the Google provider identity to that destination user.
4. Retrieve the destination `sub`.
5. Add the reviewed source and destination subjects to the identity map.
6. Test Google sign-in before public traffic is enabled.

Never link a Google identity based only on an unverified email address.

### Native Users

For each native Cognito user:

1. Import or create the account with supported verified attributes preserved.
2. Require the user to set a new password.
3. Retrieve the destination `sub`.
4. Match it to the source user by normalized verified email and reviewed source identity.
5. Add the source and destination subjects to the identity map.
6. Test password recovery and first login.

User creation suppresses Cognito invitation messages and assigns an unknown temporary password. Password-reset messages are sent only through the separate `send-password-resets` command so applying identity migration cannot unexpectedly email users.

### Administrators

- [ ] Recreate `Admins` membership for exactly the intended users.
- [ ] Verify destination tokens contain the expected group claim.
- [ ] Verify ordinary users do not receive admin claims.

### Identity Mapping Format

Store the mapping as an encrypted migration artifact, not in the repository.

Minimum columns:

```text
sourceSub,destinationSub,normalizedVerifiedEmail,provider,sourceUsername,destinationUsername,reviewStatus
```

The mapping must contain one reviewed row for every source user referenced by migrated records.

### Confirmed Duplicate-Account Policy

The source has 14 Cognito records but only 11 normalized emails. Three groups each contain one native identity and one Google identity. Both sides of these pairs own application data.

The approved policy is:

- Create 11 destination users.
- Merge each native-plus-Google pair into one destination user.
- Map all 14 source subjects to the 11 destination subjects.
- Require separate review of administrator grants.
- Keep the explicitly reviewed profile when merged identities have competing profiles.
- Rewrite recipe `createdBy` and comment `author` from the selected profile username.
- Collapse duplicate favorites for the same destination user and recipe.

Current conflict inventory:

- Two duplicated source `userId` groups produce extra profile rows.
- The generated review suggests the uniquely newest profile but requires explicit approval when multiple candidates exist.
- Four duplicate favorite rows collapse after account merges.

### Gate 2

Do not transform or import application data until every referenced source subject has exactly one reviewed destination subject.

## Phase 4: Transform Application Data

Run a dry transformation first.

- [ ] Replace all source user IDs in the listed ownership and moderation fields.
- [ ] Preserve model IDs.
- [ ] Preserve recipe and ingredient relationships.
- [ ] Preserve favorites and comments.
- [ ] Preserve recipe image keys.
- [ ] Preserve profile avatar values.
- [ ] Preserve timestamps where the destination API permits it.
- [ ] Produce a transformation report listing records changed by model and field.
- [ ] Fail if an unexpected source subject remains anywhere in the transformed data.
- [ ] Fail if any required relationship becomes unresolved.

Do not manufacture new recipe, ingredient, favorite, comment, or profile IDs.

## Phase 5: Rehearse

Use an isolated destination sandbox or other disposable backend. Domain and DNS configuration are not part of this rehearsal.

- [ ] Begin with empty destination tables and storage.
- [ ] Create representative destination identities and a complete test mapping.
- [ ] Run the transformation and import.
- [ ] Copy recipe images using exact keys.
- [ ] Compare source and destination model counts.
- [ ] Compare image count, total bytes, and checksums.
- [ ] Run relationship-integrity checks.
- [ ] Verify owner-authorized recipe mutations.
- [ ] Verify profile reads and edits.
- [ ] Verify avatar artwork resolves.
- [ ] Verify saved recipes remain saved.
- [ ] Verify comments and parent relationships.
- [ ] Verify recipe images resolve through the destination CDN.
- [ ] Test guest, authenticated, and administrator behavior.
- [ ] Record duration and every manual step.
- [ ] Retain reports, then destroy only the disposable rehearsal resources.

### Gate 3

Do not schedule production migration until a complete rehearsal succeeds from empty destination data through acceptance testing.

## Phase 6: Production Migration

### A. Freeze Source Writes

- [ ] Start the execution log.
- [ ] Block recipe, profile, favorite, comment, and image writes in the source application.
- [ ] Verify the write freeze is effective.
- [ ] Create final named DynamoDB backups.
- [ ] Export the final six-model dataset.
- [ ] Export the final Cognito inventory.
- [ ] Copy the final recipe-image delta.
- [ ] Recompute source counts and checksums.

Stop if the final export does not validate.

### B. Create And Map Destination Users

- [ ] Create or import all native users with password reset required.
- [ ] Create destination users for Google identity linking.
- [ ] Link Google provider identities.
- [ ] Retrieve all destination subjects.
- [ ] Recreate `Admins` memberships.
- [ ] Generate and manually review the complete identity mapping.
- [ ] Confirm every user referenced by application data is mapped.

Stop if any mapping is missing or ambiguous.

### C. Transform And Import Data

Import in this order:

1. `Ingredient`
2. `Recipe`
3. `UserProfile`
4. `RecipeIngredient`
5. `Favorite`
6. `Comment`

For each model:

- [ ] Run the final transformation.
- [ ] Review the transformation summary.
- [ ] Import records.
- [ ] Verify count and checksum expectations.
- [ ] Verify ownership references use destination subjects.
- [ ] Record the result in the execution log.

### D. Copy Recipe Images

- [ ] Copy every in-scope image using the exact source key.
- [ ] Preserve content type and required metadata.
- [ ] Compare source and destination object count.
- [ ] Compare total bytes and per-object checksums.
- [ ] Confirm every recipe image reference resolves.
- [ ] Confirm the destination CDN returns each referenced object.

### E. Validate Profiles

- [ ] Confirm the destination profile count matches the reviewed transformed count.
- [ ] Confirm each profile `userId` is a destination subject.
- [ ] Confirm username, display name, bio, and kitchen identity are preserved.
- [ ] Confirm each avatar reference resolves to a bundled asset.
- [ ] Confirm signature recipes resolve.
- [ ] Confirm profile edits authorize the destination owner.

### F. Validate Recipes And Related Data

- [ ] Confirm all expected recipes exist.
- [ ] Confirm every recipe owner is a destination user.
- [ ] Confirm ingredient and method content is preserved.
- [ ] Confirm `RecipeIngredient` relationships resolve.
- [ ] Confirm recipe images render.
- [ ] Confirm favorites remain associated with the correct users and recipes.
- [ ] Confirm comments remain associated with the correct users and recipes.
- [ ] Confirm comment parent relationships resolve.
- [ ] Confirm recipe create, update, publish, and delete authorization.
- [ ] Confirm favorite and comment mutations work.

### G. Final Data Acceptance

- [ ] Run the full reconciliation report.
- [ ] Search destination records for every source Cognito subject.
- [ ] Confirm no source subject remains in migrated ownership fields.
- [ ] Confirm no destination record references a source AppSync API or S3 bucket.
- [ ] Test native sign-in and password reset.
- [ ] Test Google sign-in.
- [ ] Test administrator authorization.
- [ ] Test with a clean browser profile.
- [ ] Test stale source tokens and caches force safe reauthentication.
- [ ] Obtain explicit data-migration approval.

The owner can complete domain and traffic cutover after this gate passes.

## Rollback

### Before Destination Writes Are Enabled

If migration validation fails:

1. Keep destination writes disabled.
2. Keep source writes frozen while investigating.
3. Preserve destination resources and reports for diagnosis.
4. Correct and rerun the migration from the final source export, or abandon the destination import.
5. Reopen source writes only after confirming the source remains intact.

### After Destination Writes Are Enabled

Do not return traffic to the source without reconciling destination writes.

1. Freeze writes in both environments.
2. Export destination changes created after go-live.
3. Map destination subjects back to the intended source users.
4. Reconcile recipes, profiles, favorites, comments, and images into the source.
5. Validate the source before reopening writes.

The safest approach is to keep destination writes disabled until all identity, data, and image checks pass.

## Post-Migration Data Protection

- [ ] Enable PITR on all destination application tables.
- [ ] Enable DynamoDB deletion protection where appropriate.
- [ ] Create destination on-demand backups after acceptance.
- [ ] Test restoring at least one table backup into a non-production table.
- [ ] Enable S3 versioning for recipe images if approved.
- [ ] Create an ongoing recipe-image backup policy.
- [ ] Add retention to relevant application logs.
- [ ] Retain encrypted source exports for the approved retention period.
- [ ] Document the final destination resource identifiers below.

## Manual Source Cleanup

The owner will perform source deletion manually. No cleanup is authorized by this runbook.

Recommended minimum retention is 14 to 30 days after acceptance.

Before deleting source data:

- [ ] Confirm the rollback retention period has ended.
- [ ] Take final archival DynamoDB exports.
- [ ] Take a final independent recipe-image archive.
- [ ] Confirm no active application reads or writes source resources.
- [ ] Confirm no destination record refers to the source bucket or API.
- [ ] Confirm all users can access the intended destination accounts.
- [ ] Confirm native users have completed or can complete password reset.
- [ ] Confirm the owner has accepted the destination profiles, recipes, favorites, comments, and images.
- [ ] Inspect source S3 auto-delete resources before deleting any stack.
- [ ] Delete source application data only with separate explicit approval.

## Validation Matrix

| Area | Validation |
| --- | --- |
| Cognito | 14 users or refreshed count, providers, verified attributes, reset flow |
| Identity map | One reviewed destination subject per referenced source subject |
| Admins | Correct members and token group claims |
| Profiles | Fields, owner IDs, kitchen identity, avatar references, signature recipes |
| Recipes | IDs, owners, content, moderation metadata, image keys |
| Ingredients | IDs and complete recipe relationships |
| Favorites | User and recipe references, saved state |
| Comments | User, recipe, and parent references |
| Images | Keys, count, bytes, metadata, checksums, CDN delivery |
| Authorization | Guest reads, owner writes, administrator operations |
| Browser state | Clean browser and stale source-session behavior |

## Resume Checklist

When resuming:

1. Read this runbook and `AGENTS.md`.
2. Check repository status and branch.
3. Confirm both AWS profiles still resolve to the expected accounts.
4. Use read-only inventory until the owner explicitly authorizes AWS changes.
5. Refresh user, model, and image counts.
6. Confirm the destination backend prerequisites are ready.
7. Read the execution log.
8. Continue from the first incomplete safety gate.

## Execution Log

Append dated entries during preparation, rehearsal, and production migration.

| Timestamp | Operator | Environment | Action | Result | Artifact or ticket |
| --- | --- | --- | --- | --- | --- |
| 2026-10-03 | OpenCode | Source and destination | Completed read-only inventory and scoped migration planning | No resources changed | This runbook |
| 2026-10-04 | Amplify pipeline | Destination | Retried initial `main` deployment after configuring Google secrets | Rolled back because source account still owns Cognito prefix `arcanekitchen`; destination application resources were deleted cleanly | Amplify app `d230098t91lnqf`, job 2 |
| 2026-10-04 | Amplify pipeline | Destination | Deployed production `main` after releasing the Cognito prefix | Job 3 succeeded; backend and frontend are available at the generated Amplify URL | Amplify app `d230098t91lnqf`, job 3 |
| 2026-10-04 | OpenCode | Destination | Completed read-only post-deployment verification | All stacks complete; Cognito, all tables, and image storage are empty and ready for seeding | Root stack `amplify-d230098t91lnqf-main-branch-84d5fc7515` |
| 2026-10-04 | OpenCode | Repository | Added the dry-run-first migration utility and local tests | No AWS mutations executed; merge policy approved for three native-plus-Google identity pairs | `scripts/migrate-aws-account.cjs` |
| 2026-10-04 | OpenCode | Source | Created the final read-only export after the owner confirmed the source write freeze | 14 users, 337 records, and 17 image objects validated; artifact is marked applyable | `.migration/production-2026-10-04` |
| 2026-10-04 | OpenCode | Local artifacts | Generated and recorded the approved identity review | 11 destination identities, 3 merges, 3 administrator grants, and 2 newest-profile selections approved | `.migration/production-2026-10-04/identity-review.json` |
| 2026-10-04 | OpenCode | Destination dry run | Planned Cognito migration without writes | 36 actions across 11 destination users; ready for guarded apply | `seed-users` dry run |
| 2026-10-04 | `aws-mutating` | Destination | Applied the reviewed Cognito migration | 11 users, 11 Google links, 3 `Admins` memberships, and 14 subject mappings created; no reset emails sent | `seed-users --apply` |
| 2026-10-04 | OpenCode | Local artifacts | Transformed frozen source data after reviewed integrity cleanup | Kept 5 profiles and 23 favorites; dropped 3 superseded profiles, 4 duplicate favorites, and 30 orphaned joins; cleared 1 deleted recipe pin | `transform-data` |
| 2026-10-04 | `aws-mutating` | Destination | Seeded and reconciled recipe images and application tables | 17 images and 300 transformed records written; Cognito, six tables, S3, and CloudFront verification passed | `seed-images --apply`, `seed-data --apply`, `verify` |

## Destination Resource Record

Fill this in after the destination backend exists.

| Resource | Destination identifier |
| --- | --- |
| Amplify app | `d230098t91lnqf` |
| Production branch | `main` |
| Amplify generated URL | `https://main.d230098t91lnqf.amplifyapp.com` |
| Production root stack | `amplify-d230098t91lnqf-main-branch-84d5fc7515` |
| Cognito user pool | `us-east-1_T6z6xYsDI` |
| Cognito identity pool | `us-east-1:4121ed0f-1dd8-4cb1-8a18-9a37b1ba378c` |
| Cognito app client | `e9q28bk88lpvaihdn3kr7hsln` |
| Cognito prefix | `arcanekitchen` (`ACTIVE`) |
| AppSync API ID | `q5jgs5fojfdbfjxpiu46rqggxm` |
| GraphQL endpoint | `https://mxinsfxdc5hqjoitfx4ox2dazi.appsync-api.us-east-1.amazonaws.com/graphql` |
| `Ingredient` table | `Ingredient-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| `Recipe` table | `Recipe-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| `UserProfile` table | `UserProfile-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| `RecipeIngredient` table | `RecipeIngredient-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| `Favorite` table | `Favorite-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| `Comment` table | `Comment-q5jgs5fojfdbfjxpiu46rqggxm-NONE` |
| Recipe image bucket | `amplify-d230098t91lnqf-ma-recipeimagesbucket390b81-26qphwdfgphn` |
| Recipe image CDN | `E2EQY1UJZQ0ETQ` / `d2amwo1w9xhqix.cloudfront.net` |
