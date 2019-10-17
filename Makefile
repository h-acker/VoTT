#!make
# Default values, can be overridden either on the command line of make
# or in .env

VERSION:=$(shell python update_release.py -v)
BRANCH?=master

check-env:
ifeq ($(wildcard .env),)
	@echo ".env file is missing. Create it first"
	@exit 1
else
include .env
export
endif

init:
	cp .env.sample .env

init-githook:
	cp update_release.py .git/hooks/pre-commit
	cd .git/hooks/ && ln -s ../../versions.py

vars: check-env
	@echo 'Sensible defaults values (for local dev)'
	@echo '  DEV_VOTT_PORT=${DEV_VOTT_PORT}'
	@echo '  DOCKER_TAG=${DOCKER_TAG}'
	@echo '  PUBLIC_URL=${PUBLIC_URL}'
	@echo ''
	@echo 'For deployment purpose'
	@echo '  SUBDOMAIN=${SUBDOMAIN}'
	@echo '  DOMAIN=${DOMAIN}'
	@echo '  STACK_NAME=${STACK_NAME}'
	@echo '  TRAEFIK_PUBLIC_NETWORK=${TRAEFIK_PUBLIC_NETWORK}'
	@echo '  TRAEFIK_PUBLIC_TAG=${TRAEFIK_PUBLIC_TAG}'


# version management

version: check-env
	@echo $(shell node -pe "require('./package.json').version")-$(VERSION)

version-up:
	@python update_release.py

check-release: check-env
	# make sure we are in $(BRANCH)
	@python update_release.py check --branch=$(BRANCH)

	git pull

	# update versions and ask for confirmation
	@python update_release.py

	VERSION=$(shell python update_release.py -v)

	@echo Version used will be $(VERSION)

	@python update_release.py confirm

create-release: check-release
	# create branch and tag
	git checkout -b release-$(VERSION)
	cp versions.py backend/app/app/core/
	git add .
	git commit -m "Prepared release $(VERSION)"
	git push --set-upstream origin release-$(VERSION)

	git tag $(VERSION)
	git tag -f stag
	git push --tags --force

	# git merge $(BRANCH)
	git checkout $(BRANCH)
	git merge release-$(VERSION)
	git push


# deployment

push-prod: login
	@# confirm push to production
	@python update_release.py confirm --prod

	# update tags
	git tag -f prod
	git push --tags --force

	# build and push docker image
	DOCKER_TAG=prod PUBLIC_URL=vott.${DOMAIN} docker-compose -f docker-compose.deploy.yml build
	DOCKER_TAG=prod docker-compose -f docker-compose.deploy.yml push

deploy-prod:
	DOCKER_TAG=prod  \
		SUBDOMAIN=vott \
		STACK_NAME=vott \
		DOMAIN=${DOMAIN} \
		TRAEFIK_PUBLIC_TAG=${TRAEFIK_PUBLIC_TAG} \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.deploy.networks.yml \
		config > docker-stack.yml

	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott

push-qa: login
	# update tags
	git tag -f qa
	git push --tags --force

	# build docker image
	DOCKER_TAG=qa PUBLIC_URL=vott-qa.${DOMAIN} docker-compose -f docker-compose.deploy.yml build
	DOCKER_TAG=qa docker-compose -f docker-compose.deploy.yml push

deploy-qa:
	DOCKER_TAG=qa \
		SUBDOMAIN=vott-qa \
		STACK_NAME=vott-qa \
		DOMAIN=${DOMAIN} \
		TRAEFIK_PUBLIC_TAG=${TRAEFIK_PUBLIC_TAG} \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.deploy.networks.yml \
		config > docker-stack.yml

	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-qa

push-dev: login
	# update tags
	git tag -f latest
	git push --tags --force

	# build docker image
	DOCKER_TAG=latest PUBLIC_URL=vott-dev.${DOMAIN} docker-compose -f docker-compose.deploy.yml build
	DOCKER_TAG=latest docker-compose -f docker-compose.deploy.yml push

deploy-dev:
	DOCKER_TAG=latest \
		SUBDOMAIN=vott-dev \
		STACK_NAME=vott-dev \
		DOMAIN=${DOMAIN} \
		TRAEFIK_PUBLIC_TAG=${TRAEFIK_PUBLIC_TAG} \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.deploy.networks.yml \
		config > docker-stack.yml

	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-dev

# docker shortcuts for maintenance purpose

login:
	docker login

ps:
	docker ps --format 'table {{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}'


# docker shortcuts for development purpose

pull: check-env
	rm -rf build node_modules
	docker-compose -f docker-compose.dev.yml build --pull

build: check-env
	docker-compose -f docker-compose.dev.yml build

up: check-env
	docker-compose -f docker-compose.dev.yml up -d

down:
	docker-compose -f docker-compose.dev.yml down

stop:
	docker-compose -f docker-compose.dev.yml stop

logs:
	docker-compose -f docker-compose.dev.yml logs --tail 20 -f

