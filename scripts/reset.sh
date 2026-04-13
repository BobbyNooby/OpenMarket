#!/bin/bash
set -e

echo ""
echo "  OpenMarket — Reset"
echo ""
echo "  This will delete all data (database, uploads) and rebuild."
read -p "  Are you sure? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "  Cancelled."
    exit 0
fi

echo ""
echo "  Tearing down..."
docker compose down -v
echo "  Rebuilding..."
docker compose up --build -d

echo ""
echo "  OpenMarket has been reset!"
echo ""
echo "  Frontend:  http://localhost:3001"
echo "  API:       http://localhost:3000"
echo ""
echo "  The first user to register gets admin automatically."
echo ""
