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
	source .env && \
		CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott-dev \
		STACK_NAME=vott-dev \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=latest \
		REACT_APP_API_URL=https://backend-dev.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

config-qa: check-env
ifeq ($(wildcard .env-qa),)
	@echo "\033[31m>> Create .env-qa first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-qa .env
	source .env && \
		CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott-qa \
		STACK_NAME=vott-qa \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=qa \
		REACT_APP_API_URL=https://backend-qa.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

config-prod: check-env
ifeq ($(wildcard .env-prod),)
	@echo "\033[31m>> Create .env-prod first\033[0m"
	@exit 1
endif
	cp .env .env-backup && rm .env && ln -s .env-prod .env
	source .env && \
		CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott \
		STACK_NAME=vott \
		ENVIRONMENT=prod \
		NODE_ENV=production \
		DOCKER_TAG=prod \
		REACT_APP_API_URL=https://backend.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

build:
	CORTEXIA_VERSION=$(VERSION) docker-compose -f docker-compose.dev.yml build

pull:
	rm -rf build node_modules
	CORTEXIA_VERSION=$(VERSION) docker-compose -f docker-compose.dev.yml build --pull

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

push-common:
	git push --tags --force
	docker-compose -f docker-stack.yml build
	docker-compose -f docker-stack.yml push

push-dev: login config-dev
	git tag -f latest
	make push-common

push-qa: login config-qa
	git tag -f qa
	make push-common

push-prod: login config-prod
	# confirm push to production
	@python update_release.py confirm --prod
	git tag -f prod
	make push-common

deploy-dev: config-dev
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-dev

deploy-qa: config-qa
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-qa

deploy-prod: config-prod
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott


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
		CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=local \
		SUBDOMAIN=vott \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=latest \
		STACK_NAME=vott-local \
		REACT_APP_API_URL=https://mocks.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

build-local: config-local
	docker-compose -f docker-stack.yml build

deploy-local: build-local kill-local
	DOMAIN=$(DOMAIN) \
	SUBDOMAIN=$(SUBDOMAIN) \
	docker run -d --name vott-local --rm \
		--network=$(TRAEFIK_PUBLIC_NETWORK) \
		--label "traefik.enable=true" \
		--label "traefik.docker.network=$(TRAEFIK_PUBLIC_NETWORK)" \
		--label "traefik.http.routers.vott-local.entrypoints=websecure" \
		--label "traefik.http.routers.vott-local.tls.certresolver=cloudflare" \
		--label "traefik.http.routers.vott-local.rule=Host(\`$(SUBDOMAIN).$(DOMAIN)\`)" \
	cortexia/vott:latest
