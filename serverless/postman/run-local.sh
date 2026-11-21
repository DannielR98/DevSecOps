#!/usr/bin/env bash
set -Eeuo pipefail

# Resolve project paths and use unique names so cleanup only affects this run.
serverless_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d)"
run_id="${GITHUB_RUN_ID:-local}"
network="quiz-postman-${run_id}-${RANDOM}"
container="quiz-dynamodb-postman-${run_id}-${RANDOM}"
sam_pid=""
exit_code=0

# Stop SAM and remove only this run's temporary files and Docker resources.
cleanup() {
  exit_code=$?
  trap - EXIT INT TERM
  if [[ -n "$sam_pid" ]] && kill -0 "$sam_pid" 2>/dev/null; then
    kill -INT "$sam_pid" 2>/dev/null || true
    # Allow SAM to shut down gracefully before forcing it to exit.
    for _ in {1..10}; do
      kill -0 "$sam_pid" 2>/dev/null || break
      sleep 1
    done
    kill -TERM "$sam_pid" 2>/dev/null || true
    wait "$sam_pid" 2>/dev/null || true
  fi
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  if [[ "$exit_code" -ne 0 && -f "$temp_dir/sam.log" ]]; then
    echo "SAM Local log (test failure):" >&2
    cat "$temp_dir/sam.log" >&2
  fi
  rm -rf -- "$temp_dir"
  exit "$exit_code"
}
trap cleanup EXIT

# Give local AWS SDK clients dummy credentials; no AWS service is contacted.
export AWS_ACCESS_KEY_ID=local
export AWS_SECRET_ACCESS_KEY=local
export AWS_DEFAULT_REGION=eu-north-1
export AWS_REGION=eu-north-1

# Start isolated, in-memory DynamoDB Local on a Docker network for SAM Lambdas.
docker network create "$network" >/dev/null
docker run -d --rm \
  --name "$container" \
  --network "$network" \
  --network-alias dynamodb \
  -p 127.0.0.1::8000 \
  amazon/dynamodb-local:latest \
  -jar DynamoDBLocal.jar -inMemory -sharedDb >/dev/null

# Publish DynamoDB on loopback so the host can create schema-derived tables.
binding="$(docker port "$container" 8000/tcp | head -n 1)"
if [[ "$binding" != 127.0.0.1:* ]]; then
  echo "Could not determine the loopback DynamoDB Local port." >&2
  exit 1
fi
dynamodb_port="${binding##*:}"
node "$serverless_dir/local/init-dynamodb.mjs" "http://127.0.0.1:${dynamodb_port}"

# Give SAM local table names, local JWT settings, and disabled AWS notifications.
cat >"$temp_dir/sam-env.json" <<'JSON'
{
  "Parameters": {
    "USERS_TABLE": "local-users",
    "GROUPS_TABLE": "local-groups",
    "MEMBERS_TABLE": "local-group-members",
    "QUIZZES_TABLE": "local-quizzes",
    "OUTBOX_TABLE": "local-outbox",
    "NOTIFICATION_LOCK_TABLE": "local-notification-locks",
    "NOTIFICATIONS_DISABLED": "true",
    "RESULTS_TABLE": "local-quiz-results",
    "UNIQUES_TABLE": "local-unique-keys",
    "DYNAMODB_ENDPOINT": "http://dynamodb:8000",
    "JWT_SECRET": "local-postman-secret-32-characters-minimum",
    "SUPABASE_URL": "",
    "SUPABASE_JWT_SECRET": "",
    "AWS_ACCESS_KEY_ID": "local",
    "AWS_SECRET_ACCESS_KEY": "local",
    "AWS_DEFAULT_REGION": "eu-north-1",
    "AWS_REGION": "eu-north-1"
  }
}
JSON

# Start the API on the same Docker network so Lambda containers can reach DynamoDB.
cd "$serverless_dir"
sam local start-api \
  --host 0.0.0.0 \
  --port 3001 \
  --region eu-north-1 \
  --docker-network "$network" \
  --env-vars "$temp_dir/sam-env.json" \
  --parameter-overrides \
    JwtSecret=local-postman-secret-32-characters-minimum \
    AllowedOrigin=http://localhost:3000 \
    FunctionArchitecture=x86_64 \
    FunctionTimeout=60 \
  >"$temp_dir/sam.log" 2>&1 &
sam_pid=$!

# Wait for the protected API to answer 401 before starting Newman.
ready=false
for _ in $(seq 1 120); do
  if ! kill -0 "$sam_pid" 2>/dev/null; then
    echo "SAM Local exited before the API became ready." >&2
    exit 1
  fi
  status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --max-time 2 http://127.0.0.1:3001/api/groups || true)"
  if [[ "$status" == "401" ]]; then
    ready=true
    break
  fi
  sleep 2
done
if [[ "$ready" != "true" ]]; then
  echo "SAM Local API did not become ready (expected unauthenticated 401 response)." >&2
  exit 1
fi

# Assemble split Postman sections and run the pinned Newman version.
cd "$serverless_dir"
node postman/build-collection.mjs "$temp_dir/serverless.collection.json"
npx --yes --package=newman@6.2.1 -- newman run \
  "$temp_dir/serverless.collection.json" \
  --env-var "baseUrl=http://127.0.0.1:3001/api" \
  --bail
