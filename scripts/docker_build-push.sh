#! /usr/bin/env sh

# Exit in case of error
set -e

TAG=${TAG} \
BUILDTIME_CORTEXIA_VERSION=${BUILDTIME_CORTEXIA_VERSION} \
source ./scripts/docker_build.sh

docker-compose -f docker-stack.yml push
