FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies (including drizzle-kit for schema push)
COPY package.json ./
RUN bun install

# Copy source
COPY src/ ./src/
COPY assets/ ./assets/
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY start.ts ./

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000
CMD ["bun", "run", "start.ts"]
