#!/bin/bash
set -e

echo ""
echo "  OpenMarket — Initial Setup"
echo ""

# Check if Docker is running
if ! docker info &>/dev/null; then
    echo "Docker is not running. Start Docker Desktop and try again."
    exit 1
fi

# Check if containers already exist
if docker compose ps -q 2>/dev/null | grep -q .; then
    echo "Existing OpenMarket containers found."
    read -p "This will rebuild everything from scratch. Continue? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "Cancelled."
        exit 0
    fi
    echo "Stopping and removing existing containers..."
    docker compose down -v
    echo ""
fi

# Create .env if missing
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    # Generate a random auth secret
    SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    if command -v sed &>/dev/null; then
        sed -i "s/generate_a_secure_random_string_here/$SECRET/" .env
    fi
    echo "Created .env with auto-generated secret."
    echo "Edit .env to add Discord OAuth credentials (optional)."
    echo ""
fi

# Build and start
echo "Building containers (this may take a few minutes on first run)..."
docker compose up --build -d

echo ""
echo "Waiting for services to start..."
sleep 5

# Check health
if docker compose ps | grep -q "running"; then
    echo ""
    echo "  OpenMarket is running!"
    echo ""
    echo "  Frontend:  http://localhost:3001"
    echo "  API:       http://localhost:3000"
    echo ""
    echo "  The first user to register gets admin automatically."
    echo ""
    echo "  To view logs:   docker compose logs -f"
    echo "  To stop:        docker compose stop"
    echo "  To restart:     ./scripts/start.sh"
    echo ""
else
    echo "Something went wrong. Check logs with: docker compose logs"
    exit 1
fi
