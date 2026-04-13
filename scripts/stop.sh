#!/bin/bash

echo ""
echo "  Stopping OpenMarket..."
docker compose stop
echo "  Stopped. Data is preserved. Run ./scripts/start.sh to restart."
echo ""
