# Arcane Kitchen

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

Arcane Kitchen is a community recipe app.

People can discover recipes from other cooks, save favorites, and publish their own recipe posts with photos.

## What the app does now

- Discover recipes in a shared feed
- Search and filter recipes by tags
- Expand recipe cards to view ingredients and instructions
- Favorite/unfavorite recipes
- Create and publish new recipes (logged-in users)
- Upload recipe images
- Delete your own recipes

## Tech stack

- React + TypeScript + Vite
- AWS Amplify Gen 2
  - Auth (Cognito)
  - Data (AppSync + DynamoDB)
  - Storage (S3)

## Data models

- `Recipe`
- `Ingredient`
- `RecipeIngredient`
- `Favorite`

Backend schema lives in `amplify/data/resource.ts`.

Simple model overview: [`docs/data-models.md`](docs/data-models.md)

## Local development

Prerequisites:

- Node.js 20+
- AWS credentials with Amplify deployment access

Install dependencies:

```bash
npm install
```

Deploy a sandbox backend and generate outputs:

```bash
npm run deploy:sandbox
```

Start the frontend:

```bash
npm run dev
```

Optional: delete your sandbox when done:

```bash
npm run destroy:sandbox
```

## Deployment

- Production deploys run through Amplify Hosting using `amplify.yml`.
- `amplify_outputs.json` is generated during deploy and used by the frontend at runtime.

## Contributing

See `CONTRIBUTING.md`.

## License

GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](LICENSE).
