.PHONY: help cluster-up cluster-down platform-install gitops-bootstrap load-test \
        build test lint docker-build docker-push

SERVICES := courses-api answers-ingest stats-aggregator teacher-api
REGISTRY ?= ghcr.io
OWNER ?= raphaelpietrzak
TAG ?= dev

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-22s\033[0m %s\n",$$1,$$2}'

## Cluster
cluster-up: ## Create k3d cluster
	k3d cluster create --config k3d-config.yaml

cluster-down: ## Delete k3d cluster
	k3d cluster delete edustream

## Plateforme
platform-install: ## Install ingress, ArgoCD, Redpanda, monitoring, Vault, Kubecost
	./scripts/install-platform.sh

gitops-bootstrap: ## Apply ArgoCD root app
	kubectl apply -f gitops/bootstrap/root-app.yaml

## Dev
install: ## npm install in all services
	@for s in $(SERVICES); do echo "→ $$s"; (cd services/$$s && npm install); done

test: ## Run tests in all services
	@for s in $(SERVICES); do echo "→ $$s"; (cd services/$$s && npm test) || exit 1; done

lint: ## Lint all services
	@for s in $(SERVICES); do echo "→ $$s"; (cd services/$$s && npm run lint) || exit 1; done

docker-build: ## Build all docker images
	@for s in $(SERVICES); do \
		echo "→ building $$s"; \
		docker build -t $(REGISTRY)/$(OWNER)/edustream-$$s:$(TAG) services/$$s; \
	done

docker-push: ## Push all docker images
	@for s in $(SERVICES); do \
		docker push $(REGISTRY)/$(OWNER)/edustream-$$s:$(TAG); \
	done

## Charge
load-test: ## Run k6 load test
	k6 run k6/load-test.js
