FROM oven/bun:1 AS base
WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages
COPY packages/lib/ ./packages/lib/
COPY packages/server/ ./packages/server/

# Install deps from root (resolves workspace: references)
RUN bun install

WORKDIR /app/packages/server

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000
CMD ["bun", "run", "start.ts"]
