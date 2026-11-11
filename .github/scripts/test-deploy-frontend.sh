#!/bin/bash
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/deploy-frontend.sh"
temp="$(mktemp -d)"
trap 'rm -f "$temp/aws" "$temp/docker" "$temp/curl" "$temp/sleep" "$temp/log"; rmdir "$temp"' EXIT
export PATH="$temp:$PATH" TEST_LOG="$temp/log"
export IMAGE="example.registry/quiz-frontend:commit123" REGION="test-region"

cat > "$temp/aws" <<'EOF'
#!/bin/bash
if [ "${FAIL_LOGIN:-0}" = 1 ]; then exit 1; fi
printf 'test-password'
EOF
cat > "$temp/docker" <<'EOF'
#!/bin/bash
echo "$*" >> "$TEST_LOG"
case "$1" in
  login) cat >/dev/null ;;
  pull) if [ "${FAIL_PULL:-0}" = 1 ]; then exit 1; fi ;;
  ps)
    if [[ "$*" == *"name="* ]]; then
      printf '%s\n' "${NAMED_CONTAINER:-}"
    else
      printf '%s\n' "${PUBLISHED_CONTAINER:-}"
    fi ;;
  inspect)
    if [ "$2" = "--format" ] && [ "$3" = '{{.Config.Image}}' ]; then
      if [ "$4" = "other" ]; then echo "other-service:latest"; else echo "example.registry/quiz-frontend:latest"; fi
    else
      echo "${ACTUAL_IMAGE_ID:-test-image-id}"
    fi ;;
  image) echo "test-image-id" ;;
  rm|logs) ;;
  run) if [ "${FAIL_RUN:-0}" = 1 ]; then exit 1; fi ;;
  *) exit 1 ;;
esac
EOF
cat > "$temp/curl" <<'EOF'
#!/bin/bash
exit "${CURL_FAILURE:-0}"
EOF
cat > "$temp/sleep" <<'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$temp/aws" "$temp/docker" "$temp/curl" "$temp/sleep"

export PUBLISHED_CONTAINER=old-frontend
bash "$script"
grep -q '^rm -f old-frontend$' "$TEST_LOG"
grep -q "^run -d --name quiz-frontend --restart unless-stopped -p 80:80 $IMAGE$" "$TEST_LOG"

: > "$TEST_LOG"
export IMAGE="example.registry/quiz-frontend@sha256:0123456789abcdef"
bash "$script"
grep -q '^rm -f old-frontend$' "$TEST_LOG"
grep -q "^pull $IMAGE$" "$TEST_LOG"
grep -q "^run -d --name quiz-frontend --restart unless-stopped -p 80:80 $IMAGE$" "$TEST_LOG"

: > "$TEST_LOG"
export FAIL_PULL=1
if bash "$script"; then echo "Pull failure was ignored" >&2; exit 1; fi
if grep -q '^rm\|^run' "$TEST_LOG"; then echo "Changed container after pull failure" >&2; exit 1; fi
unset FAIL_PULL

: > "$TEST_LOG"
export PUBLISHED_CONTAINER=other
if bash "$script"; then echo "Unrelated container was accepted" >&2; exit 1; fi
if grep -q '^rm\|^run' "$TEST_LOG"; then echo "Changed an unrelated container" >&2; exit 1; fi

: > "$TEST_LOG"
export FAIL_LOGIN=1
if bash "$script"; then echo "Login failure was ignored" >&2; exit 1; fi
if grep -q '^pull\|^rm\|^run' "$TEST_LOG"; then echo "Continued after login failure" >&2; exit 1; fi
unset FAIL_LOGIN

: > "$TEST_LOG"
unset PUBLISHED_CONTAINER
export FAIL_RUN=1
if bash "$script"; then echo "Container startup failure was ignored" >&2; exit 1; fi
unset FAIL_RUN

: > "$TEST_LOG"
export ACTUAL_IMAGE_ID=unexpected
if bash "$script"; then echo "Wrong image was accepted" >&2; exit 1; fi
unset ACTUAL_IMAGE_ID

: > "$TEST_LOG"
export CURL_FAILURE=1
if bash "$script"; then echo "Unresponsive frontend was accepted" >&2; exit 1; fi
grep -q '^logs quiz-frontend$' "$TEST_LOG"
echo "Deployment script tests passed."
