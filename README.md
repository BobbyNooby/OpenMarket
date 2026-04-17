# OpenMarket

A web-based marketplace for trading in-game items and virtual currencies between players. Built to replace the informal Discord and forum-based trading that most gaming communities rely on, with structured listings, real-time messaging, user reputation, and built-in moderation tools.

Live at [market.bobbynooby.dev](https://market.bobbynooby.dev)

## Features

- **Flexible listings** - Buy/sell orders with multi-item offer structures. Request a single item or currency, offer multiple of either in exchange
- **Real-time messaging** - WebSocket-powered direct messages with typing indicators and unread tracking
- **Trust system** - Upvote/downvote reviews on user profiles with computed trust scores based on review ratio, account age, and trade history
- **Search and discovery** - Text search, trending listings, popular items, and a personal watchlist
- **Admin dashboard** - Item catalogue management, bulk JSON import/export, user moderation (bans, warnings), report handling, audit logging, insights, and site branding configuration
- **RBAC** - Four default roles and thirty-four granular permissions
- **Internationalisation** - Four languages (English, Spanish, French, Japanese) via compile-time translation with zero runtime overhead
- **Image pipeline** - Automatic resize to 512px and WebP conversion via Sharp
- **Open Graph previews** - Rich preview cards for shared listing links, rendered with Satori
- **GDPR compliant** - Self-service data export and account deletion with cascading removal
- **Real-time listing feed** - New listings broadcast to connected clients via WebSocket

## Stack

- **Frontend** - SvelteKit 2 + Svelte 5 (runes), Tailwind CSS v4, shadcn-svelte
- **Backend** - Elysia on Bun, better-auth with Discord OAuth
- **Database** - PostgreSQL 17 with Drizzle ORM
- **Monorepo** - pnpm workspaces + Turborepo
- **Deployment** - Docker Compose
- **Testing** - Playwright E2E + GitHub Actions CI

## Architecture

Three-container deployment: PostgreSQL, Elysia API server (Bun), and SvelteKit frontend (Node). End-to-end type safety flows from Drizzle schemas through Elysia route handlers to Svelte components via Eden Treaty.

## Project Structure

```
packages/
├── frontend/     # SvelteKit application (port 5173 dev / 3001 prod)
├── server/       # Elysia API (port 3000)
└── lib/          # Shared TypeScript types

scripts/          # Docker + deployment helper scripts
```

## Getting Started

```bash
# 1. Copy the example environment and fill in your values
cp .env.example .env

# 2. One-command setup: install deps, push schema, seed RBAC
pnpm setup

# 3. Run both frontend and server in watch mode
pnpm dev
```

To also populate a demo catalogue and seed users/listings:
```bash
pnpm setup:demo
```

## Scripts Reference

### Development
| Script | What it does |
|--------|--------------|
| `pnpm dev` | Run frontend and server together via Turborepo |
| `pnpm dev:frontend` | Frontend only (Vite on :5173) |
| `pnpm dev:server` | Server only (Bun on :3000, with watch mode) |
| `pnpm check` | Type-check all packages (svelte-check + tsc) |
| `pnpm build` | Production build of all packages |

### Database
| Script | What it does |
|--------|--------------|
| `pnpm db:push` | Push Drizzle schema to the database (additive only) |
| `pnpm db:studio` | Open Drizzle Studio GUI for browsing data |
| `pnpm --filter @openmarket/server db:generate` | Generate SQL migration files |
| `pnpm --filter @openmarket/server db:seed:rbac` | Seed the 4 roles and 34 permissions |
| `pnpm --filter @openmarket/server db:seed` | Seed full demo data (users, items, listings, reviews) |

### Testing
| Script | What it does |
|--------|--------------|
| `pnpm test` | Run Playwright E2E tests |
| `pnpm test:ui` | Run Playwright with the interactive UI |

### Docker
| Script | What it does |
|--------|--------------|
| `pnpm docker:init` | First-time Docker setup |
| `pnpm docker:start` | Start the Docker Compose stack |
| `pnpm docker:stop` | Stop all containers |
| `pnpm docker:reset` | Reset the stack (wipes volumes) |
| `pnpm docker:logs` | Tail logs from all services |
| `pnpm deploy` | Production deployment script |

### Simulator
A simulator script is included for generating realistic activity (useful for demos and load testing). It creates listings, views, reviews, and watchlist changes at a configurable rate.

```bash
# From the server package directory
pnpm --filter @openmarket/server simulate -- --tick=2000 --max=300
```

Flags:
- `--tick=<ms>` - Interval between actions (default 2000)
- `--max=<n>` - Total actions before stopping

## Deployment

The project is designed for single-command Docker deployment:

```bash
docker compose up -d
```

The server container runs a `start.ts` script on launch that handles:
1. Database schema migration (`drizzle-kit push`, additive only)
2. RBAC seeding (idempotent, uses `onConflictDoNothing`)
3. Starter catalogue population (only if items table is empty)

Subsequent deploys skip seeding since the Postgres volume persists across rebuilds. See `.env.example` for required environment variables.

For Coolify or similar platforms, set the compose file location to `/docker-compose.yml` and provide the env vars listed in `.env.example`.

## Conventions

- **Svelte 5 runes** - `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- **shadcn-svelte** components preferred over custom implementations
- **Drizzle query builder** over raw SQL (the `sql` template tag is fine for aggregates)
- **Optimistic UI** - Uses local `$state` for status updates rather than `invalidateAll()`
- **Eden Treaty** for server-side API calls in `+page.server.ts`
- **Direct fetch** for client-side calls (avoids Eden type gymnastics)
- **AlertDialog** for destructive confirmations, regular Dialog for everything else
- **Paraglide** for all user-facing strings (no hardcoded English in templates)

## Adding shadcn-svelte Components

Run from `packages/frontend`:
```bash
npx shadcn-svelte@latest add <component> -y
```

**Not** `npx shadcn` - that installs React components.

## API Documentation

When running locally, Swagger UI is available at `http://localhost:3000/docs` listing every endpoint with request/response schemas.
