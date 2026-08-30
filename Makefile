.DEFAULT_GOAL := help

.PHONY: help setup env install infra dev docker-up down restart logs ps \
	build lint test test-e2e check prisma-generate migrate migrate-deploy studio clean

help: ## Show available commands
	@echo Honey Manager Backend
	@echo.
	@echo   make setup           Prepare local development
	@echo   make dev             Start NestJS in watch mode
	@echo   make docker-up       Build and run the full stack
	@echo   make down            Stop the Docker stack
	@echo   make check           Run lint, build, and tests
	@echo   make migrate         Create/apply a development migration
	@echo   make migrate-deploy  Apply committed migrations
	@echo   make studio          Open Prisma Studio
	@echo   make logs            Follow Docker logs

setup: env install infra prisma-generate migrate-deploy ## Prepare local development

env: ## Create .env from the example when missing
	powershell -NoProfile -Command "if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env'; Write-Host 'Created .env' } else { Write-Host '.env already exists' }"

install: ## Install exact npm dependencies
	npm ci

infra: ## Start PostgreSQL and Redis
	docker compose up -d --wait postgres redis

dev: ## Start NestJS in watch mode
	npm run start:dev

docker-up: env ## Build and run the full Docker stack
	docker compose up --build -d

down: ## Stop the Docker stack
	docker compose down

restart: down docker-up ## Rebuild and restart the full Docker stack

logs: ## Follow Docker service logs
	docker compose logs -f

ps: ## Show Docker service status
	docker compose ps

build: ## Compile the application
	npm run build

lint: ## Run ESLint
	npm run lint

test: ## Run unit tests
	npm test -- --runInBand

test-e2e: ## Run end-to-end tests
	npm run test:e2e -- --runInBand

check: lint build test test-e2e ## Run all code checks

prisma-generate: ## Generate Prisma Client
	npm run prisma:generate

migrate: ## Create and apply a development migration
	npm run prisma:migrate

migrate-deploy: ## Apply committed migrations
	npm run prisma:deploy

studio: ## Open Prisma Studio
	npm run prisma:studio

clean: ## Remove generated build and coverage output
	powershell -NoProfile -Command "Remove-Item -Recurse -Force 'dist', 'coverage' -ErrorAction SilentlyContinue"
