#!/bin/bash
set -e

echo "=== OpenMarket VPS Deploy ==="
echo ""

# Check prerequisites
check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo "Missing: $1"
        return 1
    fi
    echo "Found: $1 ($(command -v $1))"
}

echo "Checking prerequisites..."
check_cmd git || { echo "Install git first"; exit 1; }
check_cmd node || { echo "Install Node.js 22+ first: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"; exit 1; }
check_cmd bun || { echo "Installing Bun..."; curl -fsSL https://bun.sh/install | bash; source ~/.bashrc; }
check_cmd pnpm || { echo "Installing pnpm..."; npm install -g pnpm; }

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo ""
    echo "PostgreSQL not found. Install it:"
    echo "  sudo apt install -y postgresql postgresql-contrib"
    echo "  sudo -u postgres createuser --superuser openmarket"
    echo "  sudo -u postgres createdb -O openmarket openmarket"
    echo ""
    echo "Then set DATABASE_URL in .env and re-run this script."
    exit 1
fi
echo "Found: psql"
echo ""

# Install dependencies
echo "Installing dependencies..."
pnpm install
echo ""

# Create .env if missing
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    # Generate a random auth secret
    SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    sed -i "s/generate_a_secure_random_string_here/$SECRET/" .env
    echo "Created .env — edit it to set DATABASE_URL and Discord OAuth credentials"
    echo ""
fi

# Push schema + seed
echo "Pushing database schema..."
pnpm db:push
echo ""

echo "Seeding RBAC..."
pnpm --filter @openmarket/server db:seed:rbac
echo ""

# Build frontend
echo "Building frontend..."
pnpm --filter @openmarket/frontend build
echo ""

# Create systemd services (optional)
echo "=== Deploy complete ==="
echo ""
echo "To start in development mode:"
echo "  pnpm dev"
echo ""
echo "To start in production mode:"
echo "  # Terminal 1 (server):"
echo "  cd packages/server && bun run start.ts"
echo ""
echo "  # Terminal 2 (frontend):"
echo "  cd packages/frontend && node build"
echo ""
echo "Or use PM2 for process management:"
echo "  npm install -g pm2"
echo "  pm2 start packages/server/start.ts --interpreter bun --name openmarket-api"
echo "  pm2 start packages/frontend/build/index.js --name openmarket-web"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
