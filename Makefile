#!make
# Default values, can be overridden either on the command line of make
# or in .env

.PHONY: config build

VERSION:=$(shell python update_release.py -v)
BRANCH?=master

# version management

version:
	@echo $(shell node -pe "require('./package.json').version")-$(VERSION)

ps:
	docker ps --format 'table {{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}'

init: check-env

config-dev: check-env
ifeq ($(wildcard .env-dev),)
	@echo "\033[31m>> Create .env-dev first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-dev .env

config-qa: check-env
ifeq ($(wildcard .env-qa),)
	@echo "\033[31m>> Create .env-qa first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-qa .env

config-prod: check-env
ifeq ($(wildcard .env-prod),)
	@echo "\033[31m>> Create .env-prod first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-prod .env

build:
	BUILDTIME_CORTEXIA_VERSION=$(VERSION) docker-compose -f docker-compose.dev.yml build

pull:
	rm -rf build node_modules
	BUILDTIME_CORTEXIA_VERSION=$(VERSION) docker-compose -f docker-compose.dev.yml build --pull

up:
	docker-compose -f docker-compose.dev.yml up -d

down: kill-local
	docker-compose -f docker-compose.dev.yml down

stop: kill-local
	docker-compose -f docker-compose.dev.yml stop

logs:
	docker-compose -f docker-compose.dev.yml logs --tail 20 -f

version-up:
	@python update_release.py

create-release: check-release
	# create branch and tag
	git checkout -b release-$(VERSION)
	git add .
	git commit -m "Prepared release $(VERSION)" || true
	git push --set-upstream origin release-$(VERSION)

	git tag $(VERSION)
	git tag -f qa
	git push --tags --force

	# git merge $(BRANCH)
	git checkout $(BRANCH)
	git merge release-$(VERSION)
	git push

push-dev: login
	TAG=latest BUILDTIME_CORTEXIA_VERSION=$(VERSION) bash scripts/docker_build-push.sh

push-qa: login
	TAG=qa BUILDTIME_CORTEXIA_VERSION=$(VERSION) bash scripts/docker_build-push.sh
	TAG=$(VERSION) BUILDTIME_CORTEXIA_VERSION=$(VERSION) bash scripts/docker_build-push.sh

push-prod: login
	# confirm push to production
	@python update_release.py confirm --prod

	# update docker image
	TAG=prod BUILDTIME_CORTEXIA_VERSION=$(VERSION) bash scripts/docker_build-push.sh
	TAG=$(VERSION) BUILDTIME_CORTEXIA_VERSION=$(VERSION) bash scripts/docker_build-push.sh

deploy-dev: config-dev
	TAG=latest \
	STACK_NAME=vott-dev \
	SUBDOMAIN=vott-dev \
	DOMAIN=cortexia.io \
	TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK)\
		bash scripts/docker_deploy.sh

deploy-qa: config-qa
	TAG=qa \
	STACK_NAME=vott-qa \
	SUBDOMAIN=vott-qa \
	DOMAIN=cortexia.io \
	TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK)\
		bash scripts/docker_deploy.sh

deploy-prod: config-prod
	TAG=prod \
	STACK_NAME=vott-prod \
	SUBDOMAIN=vott \
	DOMAIN=cortexia.io \
	TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK)\
		bash scripts/docker_deploy.sh


###
# Helpers for initialization

init-githook:
	cp update_release.py .git/hooks/pre-commit
	cd .git/hooks/ && ln -s ../../versions.py

check-release:
	# make sure we are in $(BRANCH)
	@python update_release.py check --branch=$(BRANCH)

	git pull

	# update versions and ask for confirmation
	@python update_release.py

	VERSION=$(shell python update_release.py -v)

	@echo Version used will be $(VERSION)

	@python update_release.py confirm

check-env:
ifeq ($(wildcard .env),)
	cp .sample.env .env
	@echo "Generated \033[32m.env\033[0m"
	@echo "  \033[31m>> Check its default values\033[0m"
	@exit 1
else
include .env
export
endif

# more shortcuts

login:
	docker login

kill-local:
	docker kill vott-local || true

config-local: check-env
ifeq ($(wildcard .env-local),)
	@echo "\033[31m>> Create .env-local first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-local .env
	source .env && \
		BUILDTIME_CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=${DOMAIN} \
		SUBDOMAIN=${SUBDOMAIN} \
		ENVIRONMENT=${ENVIRONMENT} \
		NODE_ENV=${NODE_ENV} \
		PUBLIC_URL=${PUBLIC_URL} \
		TAG=latest \
		STACK_NAME=vott-local \
		REACT_APP_API_URL=${REACT_APP_API_URL} \
		docker-compose \
			-f docker-compose.dev.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

build-local: config-local
	docker-compose -f docker-stack.yml build

deploy-local: build-local kill-local
	DOMAIN=$(DOMAIN) \
	SUBDOMAIN=$(SUBDOMAIN) \
	docker-compose -f docker-stack.yml up -d