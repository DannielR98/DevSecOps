# Serverless backend (AWS Lambda + DynamoDB)

Alternative to the Express/PostgreSQL `backend/`, which remains available. The API uses `/api/...` routes and is implemented as one Lambda function per endpoint behind an API Gateway HTTP API, with DynamoDB for storage. Everything is defined in `template.yaml` (AWS SAM); see the behavior differences below before switching backends.

Protected API routes use an API Gateway Lambda authorizer to verify bearer tokens before invoking the endpoint. Login and registration remain public. The endpoint handlers also verify tokens and enforce their own permissions; the authorizer uses the same Supabase JWKS, legacy Supabase HS256, and application HS256 verification as the handlers. Authorizer caching is disabled so expiry is checked for each request. SAM Local can invoke Lambda authorizers, but local emulation does not replace testing the deployed API Gateway configuration.

## Layout

- `src/handlers/` – one Lambda handler per endpoint
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
| Outbox | `id` | – |
| NotificationLock | `id` | – |
| QuizResults | `id` | `quiz_id-index` |

Uniqueness that Postgres enforced with unique constraints (email, username, auth_id, invite code) is enforced with lock items in `UniqueKeys`, written in the same transaction as the owning item. Emails are stored lowercase.

## Quiz notifications

Creating a quiz commits the quiz and a minimal `QuizCreated` outbox item in
one DynamoDB transaction. If the transaction fails, the quiz is not created.
The item contains event, quiz and group IDs and creation time, not questions,
answers or tokens. A Lambda scans the durable outbox every minute, sends events
to the stack's EventBridge bus and removes only acknowledged records. A failed
or ambiguous send remains for retry; a crash between send and deletion can
produce duplicates.

An EventBridge rule invokes a Lambda that publishes a message containing the
group's current name to the group's standard SNS topic. SNS sends mail from AWS Notifications
(`no-reply@sns.amazonaws.com`). Every five minutes a reconciliation Lambda
creates per-group topics, subscribes current members (including the creator),
removes obsolete confirmed subscriptions and deletes orphaned topics. The
first reconciliation also backfills existing groups and members. New or changed
email addresses must confirm the SNS subscription email before receiving
notifications. A publish before confirmation does not result in a later email.
SNS delivery can still fail or be filtered after a successful publish; this
system does not guarantee delivery or exactly-once notifications.

Membership and profile changes and reconciliation share a persistent lock.
Leaving a group, changing an email or deleting a profile first removes the
affected confirmed subscriptions; if cleanup fails, the change fails. SNS
does not permit manually deleting pending email subscriptions: a former member
can confirm an old invitation after leaving and may receive future
notifications, including the group name. An SNS publish already in progress cannot be recalled.
Inform members of these limitations. SNS imposes email subscription rate limits
and may suspend subscriptions; see [SNS email notifications](https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html).

### AWS deployment and operations

The SAM stack creates the event bus, rules, SQS failure queue, CloudWatch queue
alarm, an SNS topic and customer-managed KMS key for operational alarms,
DynamoDB outbox and lock tables, and Lambda execution permissions.
Group topics are created dynamically by reconciliation; there is no separate
sender address or SNS secret to configure. The existing GitHub deployment role
and any CloudFormation execution role need permissions to create and update
the new EventBridge, SQS, SNS, KMS, CloudWatch, DynamoDB, Lambda and IAM resources,
including passing the Lambda execution roles. Check organizational SCPs,
permission boundaries and quotas. Runtime roles need the SNS, EventBridge,
DynamoDB and SQS actions in the template. The failure alarm publishes to the
stack-managed `OperationsAlarmTopicArn`. After deployment, create an email
subscription to this topic in SNS and confirm the email; until then no operator
receives an alarm email. This operations topic is separate from group topics.
Monitor Lambda errors and the outbox table as well.
The deployment or CloudFormation execution role also needs permission to create
and manage the KMS key, its policy, rotation and tags. The operations key is
retained on stack deletion or replacement; manage its lifecycle and costs
separately. CloudWatch requires the customer-managed key policy permissions in
the template; the AWS-managed `alias/aws/sns` key is not sufficient.

After deployment, allow reconciliation to run and ask existing members to
confirm the SNS emails. Test a new group and quiz using confirmed test
recipients, including the creator. Confirm the sender, subscription lifecycle,
CloudWatch logs and queue alarms in the deployed region. This is not covered by
local or mocked tests. AWS charges apply to the scans, Lambdas, EventBridge,
SNS, SQS and other resources.

The stack outputs `NotificationFailureQueueUrl`, `NotificationLockTableName`,
`NotificationEventBusName` and `OperationsAlarmTopicArn` identify the operational resources. EventBridge
retries failed target delivery and Lambda retries asynchronous handler failures;
exhausted failures are sent to the SQS queue, which retains messages for 14
days. Inspect the error, repair the cause and replay the original event to the
appropriate Lambda: an EventBridge DLQ message body is the event, while a
Lambda asynchronous destination record contains it in `requestPayload`.
Scheduled relay and reconciliation failures normally recover on the next
successful scheduled run; do not delete their failure messages until the
outbox or reconciliation state has been checked. Replay may produce duplicate
email. The queue alarm has no automatic replay.

The global lock deliberately has no expiry. A timeout, crash or uncertain
lock write can leave membership/profile changes returning 503 and stop
reconciliation until an operator intervenes. To recover, pause both
reconciliation and affected API traffic, identify the lock in
`NotificationLockTableName` with key `{"id":{"S":"notifications"}}`, inspect
logs and ensure the lock holder and all in-flight invocations have stopped.
Allow for the maximum Lambda timeout (up to 15 minutes). Only then delete that
specific item using a condition matching its recorded `owner`; never clear a
lock held by an active invocation. Restore traffic and scheduling and verify
reconciliation and the failure queue. The global lock serializes changes and
full-table scans; monitor execution time, contention, SNS quotas and costs as
the dataset grows.

## Local frontend and API with DynamoDB Local (Windows)

Prerequisites: Node.js 22, Docker Desktop running with Linux containers, PowerShell, and SAM CLI. The first run downloads the DynamoDB Local and SAM Lambda images. Ports 3000 and 3001 must be free.

1. Install dependencies in `serverless` and `frontend/quiz` with `npm ci`.
2. Copy `serverless/local/config.example.json` to `serverless/local/config.json`. Set the Supabase project URL and **public anon/publishable key**. The file is ignored by Git; do not put a service-role key in it. The Supabase project is still remote, so use a test project/account if appropriate.
3. From `serverless`, run:

   ```powershell
   npm run local
   ```

Open `http://localhost:3000`. The local API is at `http://localhost:3001/api/`. The script builds the handlers, creates an isolated Docker network and an in-memory DynamoDB Local instance, creates the tables and indexes from the SAM template, then starts Vite and SAM. Stop the foreground script with Ctrl+C. **All local DynamoDB data is discarded on stop**, and the temporary container and network are removed.

The script uses dummy AWS credentials and a generated local application JWT secret; it does not create or access AWS DynamoDB tables. It selects a local Lambda architecture matching the host and a 60-second timeout to accommodate emulation; deployed defaults remain arm64 and 10 seconds. Supabase asymmetric JWTs are verified against the configured project's JWKS. If the project uses legacy HS256 tokens, set `supabaseJwtSecret` in the ignored `serverless/local/config.json`, or set `SUPABASE_JWT_SECRET` in the PowerShell environment before starting. A non-empty configuration value takes precedence; do not commit the secret. This secret is also stored temporarily in the generated SAM environment file and removed during normal cleanup. The frontend and Supabase URL/key are supplied by the script rather than the root Docker Compose configuration.

Local mode explicitly disables SNS reconciliation and cleanup. Quiz creation
still writes to the local outbox, but no EventBridge or SNS service is emulated
and no email is sent.

An abrupt termination (for example, closing the terminal or Docker Desktop) can prevent cleanup. If that happens, remove the specific `quiz-dynamodb-<suffix>` container and `quiz-local-<suffix>` network shown by `docker ps -a` and `docker network ls`; a temporary `quiz-local-<suffix>` directory may also remain in the system temp directory.

Re-run `npm run build` in `serverless` after handler changes. Restart the script after changes to `template.yaml` or local configuration. Local SAM does not reproduce every deployed API Gateway, IAM or CORS behavior; verify those separately in a test deployment.

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

Both backends expose `GET /api/quizzes/{id}/results?view=mine` for the authenticated user's attempts and `?view=leaderboard` for each participant's best percentage and `attempt_count` (all completed attempts, including those after the best result). Only current group members and the owner may access either view. The leaderboard includes former participants' saved results; individual attempts are private.

- Both backends use `POST /api/groups/join` to join a group by invite code. The former `/api/group-members/join` endpoint has been removed.
- `GET /api/users` and `GET /api/user/:user_id` now require authentication and never return password hashes.
- The "any token containing `test`" bypass in the old auth middleware is not carried over.
- Passwords use `bcryptjs` (pure JS, compatible with existing bcrypt hashes).
- Existing Postgres data is not migrated.
- Deleting a group/quiz cascades in batches, not in a single transaction.
- Secrets are passed as `NoEcho` stack parameters and end up in Lambda environment variables; move them to SSM/Secrets Manager for stricter setups.

`POST /api/sync-user` requires a bearer token. It returns the authenticated profile, creating it on first use through the existing token-authentication flow; identity is taken from the verified token rather than the request body.
