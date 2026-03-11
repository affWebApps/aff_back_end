# AFF Backend

Backend for AFF marketplace/storefront. Built with NestJS, TypeScript, Prisma, and PostgreSQL. Integrates with Medusa/Vendure for catalog, carts, checkout, and payments (Paystack), plus local platform settings and user/profile features.

## Stack
- Node.js (NestJS)
- Prisma ORM + PostgreSQL
- Medusa/Vendure integrations (products, cart, checkout, payments)
- JWT auth
- Docker-ready

## Quick start
```bash
# install deps
npm install

# generate Prisma client
npx prisma generate

# run migrations (dev)
npx prisma migrate dev

# start dev server
npm run start:dev
```

## Environment
Create `.env` (or use your platform’s secret manager). Typical keys:
```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=...
MEDUSA_STORE_API=...
MEDUSA_PUBLISHABLE_API_KEY=...
MEDUSA_REGION_ID=...
VENDURE_ADMIN_API=...
SUPERADMIN_USERNAME=...
SUPERADMIN_PASSWORD=...
```

## Build & run (prod)
```bash
npx prisma generate
npm run build
npx prisma migrate deploy
npm run start:prod
```

## Docker
```bash
docker build -t aff-backend .
docker run -p 3000:3000 --env-file .env aff-backend
```
The image installs OpenSSL (required by Prisma), runs `prisma generate`, builds, prunes dev deps, then on start runs `prisma migrate deploy` and `npm run start:prod`.

## Deployment (Render/Railway friendly)
- Build: `npm install && npm run build && npx prisma generate`
- Start: `npx prisma migrate deploy && npm run start:prod`
- Ensure Postgres is available and env vars are set.

## Key modules (high level)
- `auth` – JWT auth, password change/reset, OAuth helpers.
- `medusa` – products, cart, checkout, shipping/payment selection, Paystack verify, vendor/customer sync.
- `marketplace`/`vendure` – collection/product queries, mutations.
- `platform-settings` – CRUD for site-wide settings (mission, vision, team, etc.).
- `users`, `portfolios`, `projects`, `bids`, `orders`, `blogs`, etc.

## Scripts
```bash
# dev
npm run start:dev
# lint/tests (add as needed)
npm run test
npm run test:e2e
npm run test:cov
```

## Contribution notes
- Branch naming: `ft/feature-name`, `fix/bug-name`, `refactor/...`

## License
MIT
