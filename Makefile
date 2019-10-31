#!make
# Default values, can be overridden either on the command line of make
# or in .env

.PHONY: config

VERSION:=$(shell python update_release.py -v)
BRANCH?=master

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

init-githook:
	cp update_release.py .git/hooks/pre-commit
	cd .git/hooks/ && ln -s ../../versions.py


# version management

version:
	@echo $(shell node -pe "require('./package.json').version")-$(VERSION)

version-up:
	@python update_release.py

check-release:
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


# docker shortcuts for maintenance purpose

login:
	docker login

ps:
	docker ps --format 'table {{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}'

config:
	CORTEXIA_VERSION=$(VERSION) \
		REACT_APP_INSTRUMENTATION_KEY=$(REACT_APP_INSTRUMENTATION_KEY) \
		docker-compose \
			-f docker-compose.deploy.yml \
			-f docker-compose.networks.yml \
		config > docker-stack.yml

push:
	# build and push docker image
	docker-compose -f docker-stack.yml build
	docker-compose -f docker-stack.yml push

# deployment to prod

check-prod: check-env
ifeq ($(wildcard .env.production),)
	@echo ".env.production file is missing. Create it first"
	@exit 1
else
include .env.production
export
endif

config-prod: check-prod config

push-prod: login config-prod
	# confirm push to production
	@python update_release.py confirm --prod
	# update tags
	git tag -f prod
	git push --tags --force
	# push to dockerhub
	make push

deploy-prod: config-prod
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott


# deployment to qa

check-qa: check-env
ifeq ($(wildcard .env.qa),)
	@echo ".env.qa file is missing. Create it first"
	@exit 1
else
include .env.qa
export
endif

config-qa: check-qa config

push-qa: login config-qa
	# update tags
	git tag -f qa
	git push --tags --force
	# push to dockerhub
	make push

deploy-qa: config-qa
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-qa


# deployment to dev

check-dev: check-env
ifeq ($(wildcard .env.development),)
	@echo ".env.development file is missing. Create it first"
	@exit 1
else
include .env.development
export
endif

config-dev: check-dev config

push-dev: login config-dev
	# update tags
	git tag -f latest
	git push --tags --force
	# push to dockerhub
	make push

deploy-dev: config-dev
	docker-auto-labels docker-stack.yml
	docker stack deploy -c docker-stack.yml --with-registry-auth vott-dev


# 'localhost' deployment

VOTT_DOMAIN?=vott.localhost

check-local: check-env
ifeq ($(wildcard .env.local),)
	@echo ".env.local file is missing. Create it first"
	@exit 1
else
include .env.local
export
endif

config-local: check-local config

kill-local:
	docker kill vott-local || true

deploy-local: config-local kill-local
	docker run -d --name vott-local --rm \
		--network=$(TRAEFIK_PUBLIC_NETWORK) \
		--label "traefik.enable=true" \
		--label "traefik.docker.network=$(TRAEFIK_PUBLIC_NETWORK)" \
		--label "traefik.http.routers.vott.entrypoints=websecure" \
		--label "traefik.http.routers.vott.tls.certresolver=cloudflare" \
		--label "traefik.http.routers.vott.rule=Host(\`$(SUBDOMAIN).$(DOMAIN)\`)" \
	cortexia/vott:latest


# docker shortcuts for development purpose

pull:
	rm -rf build node_modules
	docker-compose -f docker-compose.dev.yml build --build-arg CORTEXIA_VERSION=$(VERSION) --pull

build:
	docker-compose -f docker-compose.dev.yml build --build-arg CORTEXIA_VERSION=$(VERSION)

up:
	docker-compose -f docker-compose.dev.yml up -d

down: kill-local
	docker-compose -f docker-compose.dev.yml down

stop: kill-local
	docker-compose -f docker-compose.dev.yml stop

logs:
	docker-compose -f docker-compose.dev.yml logs --tail 20 -f

