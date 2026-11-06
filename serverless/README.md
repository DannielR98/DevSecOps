# Serverless backend (AWS Lambda + DynamoDB)

Replacement for the Express/PostgreSQL `backend/`. Same REST API (`/api/...`), implemented as one Lambda function per endpoint behind an API Gateway HTTP API, with DynamoDB for storage. Everything is defined in `template.yaml` (AWS SAM).

## Layout

- `src/handlers/` – one Lambda handler per endpoint (22 in total)
- `src/lib/repo.js` – DynamoDB data access layer
- `src/lib/auth.js` – bearer token verification (Supabase JWKS / HS256 secrets, and tokens from `/api/login`) and first-use user provisioning
- `template.yaml` – API Gateway, Lambda functions, IAM role, DynamoDB tables
- `build.mjs` – bundles handlers with esbuild into `dist/`

## DynamoDB model

| Table | Key | Indexes |
|-------|-----|---------|
| Users | `user_id` | – |
| UniqueKeys | `pk` (`email#..`, `username#..`, `auth#..`, `invite#..`) | – |
| Groups | `id` | `owner_id-index` |
| GroupMembers | `id` (uuid v5 of group+user, so one membership per pair) | `group_id-index`, `user_id-index` |
| Quizzes | `id` | `group_id-index` (range `createdAt`) |
| QuizResults | `id` | `quiz_id-index` |

Uniqueness that Postgres enforced with unique constraints (email, username, auth_id, invite code) is enforced with lock items in `UniqueKeys`, written in the same transaction as the owning item. Emails are stored lowercase.

## Deploy

Requires AWS credentials and the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

```bash
npm ci
npm run lint
npm test
npm run build
sam deploy --guided \
  --parameter-overrides JwtSecret=<32+ chars> AllowedOrigin=https://your-frontend SupabaseUrl=https://<project>.supabase.co
```

The `ApiUrl` stack output is the value for the frontend's `VITE_API_URL` (build-time variable; defaults to `http://localhost:5000/api/`).

Run `npm run lint` to check the serverless JavaScript, or `npm run lint:fix` to apply supported automatic fixes. CI runs the lint check before building and deploying.

`npm test` runs the handler lifecycle, authentication, HTTP parsing, and DynamoDB repository tests using in-memory or mocked dependencies. These tests do not deploy resources or verify AWS IAM, API Gateway, CORS, or real DynamoDB behavior.

## Behaviour changes compared to the Express backend

- `GET /api/users` and `GET /api/user/:user_id` now require authentication and never return password hashes.
- The "any token containing `test`" bypass in the old auth middleware is not carried over.
- Passwords use `bcryptjs` (pure JS, compatible with existing bcrypt hashes).
- Existing Postgres data is not migrated.
- Deleting a group/quiz cascades in batches, not in a single transaction.
- Secrets are passed as `NoEcho` stack parameters and end up in Lambda environment variables; move them to SSM/Secrets Manager for stricter setups.
