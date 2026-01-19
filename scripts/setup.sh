#!/bin/bash
set -e

echo "=== OpenMarket Setup ==="

# Check prerequisites
command -v pnpm >/dev/null 2>&1 || { echo "pnpm required. Install: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker required."; exit 1; }

# Copy env if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env file - please configure it before running"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Start databases
echo "Starting databases..."
docker compose -f docker/docker-compose.dev.yml up -d

# Wait for postgres
echo "Waiting for PostgreSQL..."
sleep 3

echo ""
echo "=== Setup complete! ==="
echo "Run 'pnpm dev' to start development"
