FROM node:22-alpine AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace packages needed for the build
COPY packages/lib/ ./packages/lib/
COPY packages/server/ ./packages/server/
COPY packages/frontend/ ./packages/frontend/

# Install all deps from root
RUN pnpm install

WORKDIR /app/packages/frontend

# Build args become env vars at build time
ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=${PUBLIC_API_URL}

RUN pnpm build

# Production — skip multi-stage, keep everything so module resolution works
EXPOSE 3000
ENV PORT=3000
CMD ["node", "build"]
