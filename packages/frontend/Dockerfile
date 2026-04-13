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

# Production stage — keep full node_modules for workspace + eden deps
FROM node:22-alpine AS production
WORKDIR /app

# Copy the entire monorepo node_modules (eden, server types, lib are in here)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=build /app/packages/frontend/build ./build
COPY --from=build /app/packages/frontend/package.json ./package.json
# Eden imports the server package for types at runtime
COPY --from=build /app/packages/server/package.json ./packages/server/package.json
COPY --from=build /app/packages/server/src ./packages/server/src
COPY --from=build /app/packages/lib ./packages/lib

EXPOSE 3000
ENV PORT=3000
CMD ["node", "build"]
