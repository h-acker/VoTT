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

config-local: check-env
	CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=local \
		SUBDOMAIN=vott \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=latest \
		REACT_APP_API_URL=http://backend.local \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

config-dev: check-env
	CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott-dev \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=latest \
		REACT_APP_API_URL=https://mocks.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

config-qa: check-env
	CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott-qa \
		ENVIRONMENT=dev \
		NODE_ENV=development \
		DOCKER_TAG=qa \
		REACT_APP_API_URL=https://backend-qa.cortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

config-prod: check-env
	CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		TRAEFIK_PUBLIC_NETWORK=$(TRAEFIK_PUBLIC_NETWORK) \
		DOMAIN=$(DOMAIN) \
		SUBDOMAIN=vott \
		ENVIRONMENT=prod \
		NODE_ENV=production \
		DOCKER_TAG=prod \
		REACT_APP_API_URL=https://backendcortexia.io \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

init: check-env

build:
	docker-compose -f docker-compose.dev.yml build --build-arg BUILDTIME_CORTEXIA_VERSION=$(VERSION)

pull:
	rm -rf build node_modules
	docker-compose -f docker-compose.dev.yml build --build-arg BUILDTIME_CORTEXIA_VERSION=$(VERSION) --pull

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
	git commit -m "Prepared release $(VERSION)"
	git push --set-upstream origin release-$(VERSION)

	git tag $(VERSION)
	git tag -f qa
	git push --tags --force

	# git merge $(BRANCH)
	git checkout $(BRANCH)
	git merge release-$(VERSION)
	git push


push-common:
	# build and push docker image
	docker-compose -f docker-stack.yml build
	docker-compose -f docker-stack.yml push

push-dev: login config-dev
	# update tags
	git tag -f latest
	git push --tags --force
	# push to dockerhub
	make push-common

push-qa: login config-qa
	# update tags
	git tag -f qa
	git push --tags --force
	# push to dockerhub
	make push-common

push-prod: login config-prod
	# confirm push to production
	@python update_release.py confirm --prod
	# update tags
	git tag -f prod
	git push --tags --force
	# push to dockerhub
	make push-common


deploy-local: config-local kill-local
	docker run -d --name vott-local --rm \
		--network=$(TRAEFIK_PUBLIC_NETWORK) \
		--label "traefik.enable=true" \
		--label "traefik.docker.network=$(TRAEFIK_PUBLIC_NETWORK)" \
		--label "traefik.http.routers.vott.entrypoints=websecure" \
		--label "traefik.http.routers.vott.tls.certresolver=cloudflare" \
		--label "traefik.http.routers.vott.rule=Host(\`$(SUBDOMAIN).$(DOMAIN)\`)" \
	cortexia/vott:latest

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
