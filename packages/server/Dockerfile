FROM oven/bun:1 AS base

# Install Node + pnpm (needed for drizzle-kit)
RUN apt-get update && apt-get install -y nodejs npm && npm install -g pnpm@10 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace packages
COPY packages/lib/ ./packages/lib/
COPY packages/server/ ./packages/server/

# Install all deps (including devDeps for drizzle-kit)
RUN pnpm install

WORKDIR /app/packages/server

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000
CMD ["bun", "run", "start.ts"]
