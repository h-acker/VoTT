#! /usr/bin/env sh

# Exit in case of error
set -e

git tag -f ${TAG}
git push --tags --force

TAG=${TAG} \
BUILDTIME_CORTEXIA_VERSION=${BUILDTIME_CORTEXIA_VERSION} \
docker-compose \
-f docker-compose.build.yml \
config > docker-stack.yml

docker-compose -f docker-stack.yml build --pull
