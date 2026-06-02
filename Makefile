.PHONY: help install dev build test lint clean docker-up docker-down seed

help:
	@echo "ReasonedAI — Available Commands"
	@echo "================================"
	@echo "install     Install all dependencies (backend + frontend)"
	@echo "dev         Start development servers"
	@echo "build       Build production bundles"
	@echo "test        Run test suites"
	@echo "lint        Run linting"
	@echo "seed        Seed demo data"
	@echo "docker-up   Start Docker stack"
	@echo "docker-down Stop Docker stack"
	@echo "clean       Remove build artifacts"

install:
	cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
	cd frontend && npm install

dev:
	@echo "Starting backend and frontend..."
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000 &
	cd frontend && npm run dev

build:
	cd frontend && npm run build

test:
	cd backend && .venv/bin/pytest tests/ -v --cov=app --cov-report=term-missing
	cd frontend && npm run test

lint:
	cd backend && .venv/bin/flake8 app/ --max-line-length=120
	cd frontend && npm run lint

seed:
	cd backend && .venv/bin/python scripts/seed_demo_data.py

migrate:
	cd backend && .venv/bin/alembic upgrade head

docker-up:
	docker-compose up --build -d
	@echo "ReasonedAI started at http://localhost:5173"

docker-down:
	docker-compose down

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	cd frontend && rm -rf dist node_modules/.cache
