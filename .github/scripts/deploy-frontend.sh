#!/bin/bash
# Stop on command errors, unset variables and failures within a pipeline.
set -euo pipefail

# Extract the registry and repository from either a tagged or digest image.
registry="${IMAGE%%/*}"
if [[ "$IMAGE" == *@* ]]; then
  repository="${IMAGE%@*}"
else
  repository="${IMAGE%:*}"
fi

# Authenticate to ECR and pull the requested image before changing containers.
aws ecr get-login-password --region "$REGION" |
  docker login --username AWS --password-stdin "$registry"
docker pull "$IMAGE"

# Only replace frontend containers from this repository; never remove other workloads.
containers="$(docker ps -aq --filter name='^/quiz-frontend$')"
published="$(docker ps -q --filter publish=80)"
for container in $containers $published; do
  image="$(docker inspect --format '{{.Config.Image}}' "$container")"
  case "$image" in
    "$repository":*|"$repository"@*) ;;
    *)
      echo "Refusing to remove container $container using image $image; it has the frontend name or publishes port 80." >&2
      exit 1
      ;;
  esac
done

# Remove the verified containers once each, even if both filters matched it.
for container in $(printf '%s\n' $containers $published | sort -u); do
  docker rm -f "$container"
done

# Start the replacement and verify that it uses the image that was pulled.
docker run -d --name quiz-frontend --restart unless-stopped -p 80:80 "$IMAGE"
expected="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
actual="$(docker inspect --format '{{.Image}}' quiz-frontend)"
if [ "$actual" != "$expected" ]; then
  echo "Running container image does not match $IMAGE." >&2
  exit 1
fi

# Wait for the frontend to respond; report container logs if it never does.
for attempt in $(seq 1 30); do
  if curl --fail --silent --output /dev/null http://127.0.0.1/; then
    echo "Frontend is responding on port 80 using $IMAGE."
    exit 0
  fi
  sleep 1
done
echo "Frontend did not respond on port 80." >&2
docker logs quiz-frontend >&2
exit 1
