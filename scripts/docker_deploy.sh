#! /usr/bin/env sh

# Exit in case of error
set -e

TAG=${TAG} \
STACK_NAME=${STACK_NAME} \
SUBDOMAIN=${SUBDOMAIN} \
DOMAIN=${DOMAIN} \
TRAEFIK_PUBLIC_NETWORK=${TRAEFIK_PUBLIC_NETWORK} \
docker-compose \
-f docker-compose.deploy.yml \
-f docker-compose.networks.yml \
config > docker-stack.yml

docker-auto-labels docker-stack.yml

docker stack deploy -c docker-stack.yml --with-registry-auth ${STACK_NAME}
