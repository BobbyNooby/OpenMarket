#!/bin/bash
set -e

echo "Starting development environment..."

# Start Docker services (postgres + redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Wait for postgres
echo "Waiting for PostgreSQL..."
until docker compose -f docker/docker-compose.dev.yml exec -T postgres pg_isready -U dev 2>/dev/null; do
  sleep 1
done

echo "Databases ready!"

# Start dev servers
echo "Starting dev servers..."
pnpm dev
