#!/bin/bash
# Fail the test on command errors, unset variables and pipeline failures.
set -euo pipefail

# Put command mocks ahead of real executables and clean up their files on exit.
script="$(cd "$(dirname "$0")" && pwd)/deploy-frontend.sh"
temp="$(mktemp -d)"
trap 'rm -f "$temp/aws" "$temp/docker" "$temp/curl" "$temp/sleep" "$temp/log"; rmdir "$temp"' EXIT
export PATH="$temp:$PATH" TEST_LOG="$temp/log"
export IMAGE="example.registry/quiz-frontend:commit123" REGION="test-region"

# Mock ECR authentication and optionally simulate a login-password failure.
cat > "$temp/aws" <<'EOF'
#!/bin/bash
if [ "${FAIL_LOGIN:-0}" = 1 ]; then exit 1; fi
printf 'test-password'
EOF
# Record Docker calls and simulate the container and image states used below.
cat > "$temp/docker" <<'EOF'
#!/bin/bash
echo "$*" >> "$TEST_LOG"
case "$1" in
  # Consume the password piped from the AWS mock without logging it.
  login) cat >/dev/null ;;
  # Let tests simulate a failed pull before any container is replaced.
  pull) if [ "${FAIL_PULL:-0}" = 1 ]; then exit 1; fi ;;
  ps)
    # Return separate test containers for the name and published-port filters.
    if [[ "$*" == *"name="* ]]; then
      printf '%s\n' "${NAMED_CONTAINER:-}"
    else
      printf '%s\n' "${PUBLISHED_CONTAINER:-}"
    fi ;;
  inspect)
    # Return the configured image reference for the safety check, or the
    # running image ID for the post-start verification.
    if [ "$2" = "--format" ] && [ "$3" = '{{.Config.Image}}' ]; then
      if [ "$4" = "other" ]; then echo "other-service:latest"; else echo "example.registry/quiz-frontend:latest"; fi
    else
      echo "${ACTUAL_IMAGE_ID:-test-image-id}"
    fi ;;
  # The expected image ID can be compared with the mocked running image ID.
  image) echo "test-image-id" ;;
  # These calls are recorded but must not affect real containers.
  rm|logs) ;;
  # Let tests simulate failure to start the replacement container.
  run) if [ "${FAIL_RUN:-0}" = 1 ]; then exit 1; fi ;;
  # Fail on unexpected Docker commands so the mock does not hide new behavior.
  *) exit 1 ;;
esac
EOF
# Control readiness checks and avoid real delays during retries.
cat > "$temp/curl" <<'EOF'
#!/bin/bash
exit "${CURL_FAILURE:-0}"
EOF
cat > "$temp/sleep" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$temp/aws" "$temp/docker" "$temp/curl" "$temp/sleep"

# A tagged image replaces the existing frontend and starts a new container.
export PUBLISHED_CONTAINER=old-frontend
bash "$script"
grep -q '^rm -f old-frontend$' "$TEST_LOG"
grep -q "^run -d --name quiz-frontend --restart unless-stopped -p 80:80 $IMAGE$" "$TEST_LOG"

# Digest references use the same replacement flow and are pulled unchanged.
: > "$TEST_LOG"
export IMAGE="example.registry/quiz-frontend@sha256:0123456789abcdef"
bash "$script"
grep -q '^rm -f old-frontend$' "$TEST_LOG"
grep -q "^pull $IMAGE$" "$TEST_LOG"
grep -q "^run -d --name quiz-frontend --restart unless-stopped -p 80:80 $IMAGE$" "$TEST_LOG"

# A failed pull must leave existing containers untouched.
: > "$TEST_LOG"
export FAIL_PULL=1
if bash "$script"; then echo "Pull failure was ignored" >&2; exit 1; fi
if grep -q '^rm\|^run' "$TEST_LOG"; then echo "Changed container after pull failure" >&2; exit 1; fi
unset FAIL_PULL

# Refuse to replace an unrelated container using the frontend name or port.
: > "$TEST_LOG"
export PUBLISHED_CONTAINER=other
if bash "$script"; then echo "Unrelated container was accepted" >&2; exit 1; fi
if grep -q '^rm\|^run' "$TEST_LOG"; then echo "Changed an unrelated container" >&2; exit 1; fi

# A failed ECR login must stop before pulling or changing containers.
: > "$TEST_LOG"
export FAIL_LOGIN=1
if bash "$script"; then echo "Login failure was ignored" >&2; exit 1; fi
if grep -q '^pull\|^rm\|^run' "$TEST_LOG"; then echo "Continued after login failure" >&2; exit 1; fi
unset FAIL_LOGIN

# Report a failure to start the replacement container.
: > "$TEST_LOG"
unset PUBLISHED_CONTAINER
export FAIL_RUN=1
if bash "$script"; then echo "Container startup failure was ignored" >&2; exit 1; fi
unset FAIL_RUN

# Reject a container whose image ID does not match the requested image.
: > "$TEST_LOG"
export ACTUAL_IMAGE_ID=unexpected
if bash "$script"; then echo "Wrong image was accepted" >&2; exit 1; fi
unset ACTUAL_IMAGE_ID

# An unresponsive frontend fails deployment and prints container logs.
: > "$TEST_LOG"
export CURL_FAILURE=1
if bash "$script"; then echo "Unresponsive frontend was accepted" >&2; exit 1; fi
grep -q '^logs quiz-frontend$' "$TEST_LOG"
echo "Deployment script tests passed."
