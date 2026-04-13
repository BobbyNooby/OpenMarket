#!/bin/bash
set -e

echo ""
echo "  OpenMarket — Start"
echo ""

if ! docker info &>/dev/null; then
    echo "Docker is not running. Start Docker Desktop and try again."
    exit 1
fi

# Check if images exist (has been built before)
if ! docker compose images -q 2>/dev/null | grep -q .; then
    echo "No build found. Run ./scripts/init.sh first."
    exit 1
fi

docker compose up -d

echo ""
echo "  OpenMarket is running!"
echo ""
echo "  Frontend:  http://localhost:3001"
echo "  API:       http://localhost:3000"
echo ""
echo "  To view logs:  docker compose logs -f"
echo "  To stop:       docker compose stop"
echo ""
