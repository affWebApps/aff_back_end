# AFF Backend — Claude Context

## What this project is

**Afrique Fashion Fusion (AFF)** backend. A NestJS API for a fashion marketplace platform where:
- **Designers** create fashion designs and post projects
- **Tailors** bid on those projects
- **Users** (both roles) buy/sell products through an e-commerce layer

Deployed on **Render** at `https://aff-back-end.onrender.com`. Frontend lives at `https://afriquefashionfusion.com`.

---

## Stack

| Concern | Technology |
|---|---|
| Framework | NestJS v10, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT + Passport (Local, Google OAuth, Facebook OAuth) |
| File storage | Supabase Storage |
| Email | Pluggable: SMTP / AWS SESv2 / Resend (set by `MAIL_PROVIDER` env var) |
| E-commerce (primary) | Medusa v2 (custom vendor plugin) |
| Product catalog (secondary) | Vendure (GraphQL) |
| API docs | Swagger at `/v1/docs` |
| Containerisation | Docker + docker-compose (Postgres on port 5433 locally) |

---

## Commands

```bash
# Development
npm run start:dev          # watch mode
npm run start:debug        # debug + watch

# Build & production
npm run build
npm run start:prod

# Database
npx prisma migrate dev     # run migrations in dev
npx prisma migrate deploy  # run migrations in prod (also in Dockerfile CMD)
npx prisma generate        # regenerate Prisma client after schema changes
npx prisma studio          # GUI browser for the DB
npm run db:seed            # ts-node prisma/seed.ts — seeds 10 fake users + related data

# Code quality
npm run lint               # ESLint --fix
npm run format             # Prettier

# Tests
npm test                   # unit tests (jest)
npm run test:e2e           # end-to-end tests
npm run test:cov           # coverage report
```

---

## Project structure

```
src/
├── main.ts                     # Bootstrap: CORS, versioning, Swagger, heartbeat ping
├── app.module.ts               # Root module — imports all feature modules
├── health.controller.ts        # GET /v1/health — keep-alive check
│
├── auth/                       # Full auth system (see Auth section below)
├── users/                      # User profile CRUD
├── mail/                       # Pluggable email service (SMTP/SES/Resend)
│
├── medusa/                     # Primary e-commerce (Medusa v2) — products, cart, orders, payments
├── marketplace/                # Secondary catalog (Vendure GraphQL) — search, browse, product detail
├── vendure/                    # Thin Vendure wrapper module
│
├── projects/                   # Designer projects + tailor bids
├── portfolios/                 # User portfolio with image galleries
├── reviews/                    # Polymorphic reviews (User | Project | Product)
├── blogs/                      # Blog posts (admin write, public read)
├── admin/                      # Admin-restricted operations
├── platform-settings/          # Key-value platform config (admin-managed)
│
├── storage/                    # Supabase file upload service
├── uploads/                    # Upload controller (Multer → Supabase)
│
└── prisma/                     # Global PrismaService singleton

prisma/
├── schema.prisma               # Single schema file — all models here
├── migrations/                 # Auto-generated migration files
└── seed.ts                     # Seed script using @faker-js/faker

src/mail/templates/             # Handlebars (.hbs) email templates
├── verify-email.hbs
└── reset-password.hbs
```

---

## API versioning & routing

All routes are versioned via URI: `/v1/<path>`.

| Prefix | Module | Auth required |
|---|---|---|
| `/v1/auth/*` | AuthModule | Mixed (see auth section) |
| `/v1/users/*` | UsersModule | JWT |
| `/v1/store/*` | MedusaModule | Mixed |
| `/v1/marketplace/*` | MarketplaceModule | Optional |
| `/v1/projects/*` | ProjectsModule | JWT |
| `/v1/bids/*` | ProjectsModule (bids controller) | JWT |
| `/v1/portfolios/*` | PortfoliosModule | JWT |
| `/v1/reviews/*` | ReviewsModule | JWT |
| `/v1/blogs/*` | BlogsModule | Admin for write |
| `/v1/admin/*` | AdminModule | Admin role |
| `/v1/platform-settings/*` | PlatformSettingsModule | Admin |
| `/v1/uploads/*` | UploadsModule | JWT |
| `/v1/health` | AppController | None |
| `/v1/docs` | Swagger UI | None |

---

## Authentication

### Email/password flow
1. `POST /v1/auth/register` — creates user, sends 24h verification email
2. User clicks link → `POST /v1/auth/verify-email` with token → returns JWT
3. `POST /v1/auth/login` — LocalAuthGuard validates password + `is_verified` check → returns JWT

### OAuth flow (Google / Facebook)
1. `GET /v1/auth/google` → redirects to provider
2. Provider callback → backend creates/updates user, generates a short-lived **OAuth code** (5-min JWT)
3. Frontend lands on `/auth/callback?code=...&provider=google`
4. Frontend calls `POST /v1/auth/oauth-exchange` with the code → returns a long-lived JWT

### Password reset
- `POST /v1/auth/forgot-password` → sends 30-min reset token via email
- `POST /v1/auth/reset-password` → validates token, updates hash, marks token used

### Guards
- `JwtAuthGuard` — standard Bearer token check (used almost everywhere)
- `AdminGuard` — checks `user.role === 'admin'` | `'ADMIN'`
- `LocalAuthGuard` — email+password via Passport local strategy
- `GoogleAuthGuard` / `FacebookAuthGuard` — OAuth redirects

### Default user role
Every new user is created with `role: 'designer'` (hardcoded in `UsersService.create`). Role changes must be done via direct DB update or admin action.

---

## Medusa integration (critical)

Medusa is the actual e-commerce engine. Every AFF user is mirrored in Medusa as both a **vendor** (seller) and a **customer** (buyer).

### Auth bridge — `x-aff-token`
AFF does not use Medusa's native auth for end users. Instead, the AFF JWT is forwarded as an `x-aff-token` header. Medusa has a custom `/auth/user/my-auth` endpoint that accepts this token.

### Sync flow (runs on every login and register)
```
login/register
  → jwtService.sign(payload)                    # AFF JWT
  → medusaService.syncVendorAndCustomerWithAffToken(userId, token)
      1. GET /store/auth-context                 # check if already synced
      2. POST /auth/user/my-auth                 # authenticate with Medusa
      3. POST /vendors  { name, handle, logo, admin: { email, first_name, last_name } }
      4. Persist vendor_id + customer_id → users table
```
Sync is **idempotent** — skipped if both `vendor_id` and `customer_id` are already set on the user record.

### Cart lifecycle
All cart operations pass the AFF JWT as `x-aff-token`. Cart ID is resolved automatically if not provided.
```
ensureCartForUser → GET /store/cart (x-aff-token)
addToCart         → stock check first, then createLineItem
updateCartDetails → shipping/billing address + email
addShippingMethod → requires option_id + cart_id
initiatePaymentSession → provider_id (e.g. "pp_paystack_paystack")
completeCart      → places the order
```

### Paystack payment flow
1. Frontend initiates payment via Paystack directly
2. On success, frontend sends reference to `POST /v1/store/cart/complete-from-reference`
3. Backend calls Medusa `/store/paystack-cart?reference=...` to get cart_id
4. Backend calls `completeCart` to finalise the order

---

## Vendure integration (secondary catalog)

Used for browsing/searching a separate product catalog. Communicates via GraphQL.

- **Shop API** — public browsing (`VENDURE_SHOP_API` + `VENDURE_CHANNEL_TOKEN`)
- **Admin API** — product creation (`VENDURE_ADMIN_API` + credentials via `VendureAuthService`)
- Admin token is fetched lazily and set on the GraphQL client before each admin call

---

## Mail system

Controlled entirely by the `MAIL_PROVIDER` env var:

| Value | Service | Required env vars |
|---|---|---|
| `smtp` (default) | Nodemailer | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| `ses` | AWS SESv2 | `AWS_REGION` (or `SES_REGION`), optionally `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| `resend` | Resend | `RESEND_API_KEY` |

Always set `EMAIL_FROM` regardless of provider.

Templates are `.hbs` (Handlebars) files in `src/mail/templates/`. Add new templates there and call `mailService.sendTemplate({ template: 'my-template', context: {...} })`.

---

## File uploads

`POST /v1/uploads/...` → Multer buffers the file in memory → `StorageService.uploadBuffer` → Supabase Storage → returns public URL.

Bucket is set by `SUPABASE_BUCKET` env var (default: `aff-media`). The bucket must be **public** for direct URL access.

---

## Database — key model relationships

```
User
 ├── Design (fashion designs, owned by user)
 │    └── Project (posted by designer, linked to one Design)
 │         ├── Bid (submitted by tailors)
 │         ├── ProjectRequirement (dual-approved content)
 │         ├── ProjectFile (uploaded attachments)
 │         ├── Message (project-scoped chat)
 │         └── Order → Escrow → Transaction
 │
 ├── Portfolio → PortfolioImage
 ├── Product → ProductImage
 ├── Review (polymorphic: targets User | Project | Product)
 ├── Notification
 ├── AuthSession
 ├── VerificationToken / PasswordResetToken
 ├── UserRole ↔ Role
 └── Permission ↔ PermissionDefinition

Blog → BlogImage
PlatformSetting (key-value store)
AdminAction (audit log)
SupportTicket
Newsletter
Chat → Message
```

### Enums
- `AuthProvider`: `EMAIL | GOOGLE | FACEBOOK | PINTEREST | INSTAGRAM`
- `ProjectStatus`: `OPEN | IN_PROGRESS | COMPLETED | CLOSED`
- `BidStatus`: `APPROVED | PENDING | REJECTED`

---

## Required environment variables

```bash
# App
PORT=8080
ENVIRONMENT=local              # set to non-"local" in prod to enable heartbeat ping
FRONTEND_URL=http://localhost:3000
FRONTEND_VERIFY_URL=http://localhost:3000/verify
FRONTEND_RESET_URL=http://localhost:3000/reset-password
PING_URL=                      # defaults to https://aff-back-end.onrender.com/v1
PING_INTERVAL_MS=780000        # 13 minutes default

# Database
DATABASE_URL=postgresql://aff_user:password@localhost:5433/aff_db

# Auth / JWT
JWT_SECRET=your-secret

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/v1/auth/google/callback
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=http://localhost:8080/v1/auth/facebook/callback

# Mail (pick one provider)
MAIL_PROVIDER=smtp             # smtp | ses | resend
EMAIL_FROM=no-reply@aff.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
AWS_REGION=                    # for ses
AWS_ACCESS_KEY_ID=             # for ses (optional if using IAM role)
AWS_SECRET_ACCESS_KEY=         # for ses (optional if using IAM role)
RESEND_API_KEY=                # for resend

# Supabase (file storage)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=aff-media

# Medusa
MEDUSA_STORE_API=              # e.g. https://your-medusa.onrender.com
MEDUSA_PUBLISHABLE_API_KEY=
MEDUSA_REGION_ID=

# Vendure
VENDURE_SHOP_API=
VENDURE_CHANNEL_TOKEN=
VENDURE_ADMIN_API=
VENDURE_ADMIN_EMAIL=
VENDURE_ADMIN_PASSWORD=
```

---

## Local development setup

```bash
# 1. Start Postgres (Docker)
docker-compose up -d

# 2. Copy and fill env
cp .env.example .env   # or create .env manually from the variables above

# 3. Install deps
npm install

# 4. Run migrations + generate client
npx prisma migrate dev
npx prisma generate

# 5. (Optional) Seed with fake data
npm run db:seed

# 6. Start dev server
npm run start:dev
# → http://localhost:8080
# → Swagger: http://localhost:8080/v1/docs
```

---

## Known quirks & gotchas

### All new users are `role: 'designer'`
`UsersService.create` always sets `role: 'designer'` regardless of what the caller passes. There is no signup-time role selection. Change via DB or add an update endpoint.

### Medusa sync errors are swallowed at login
The `try/catch` around Medusa sync in `AuthService.login` and `AuthService.register` only logs errors — it does not fail the login. Users can log in even if Medusa is down or misconfigured.

### OAuth tokens are JWTs (not opaque codes)
The "OAuth code" passed to the frontend via redirect query param is itself a short-lived JWT signed with the same `JWT_SECRET`. Treat it as sensitive — it grants access if exchanged before the 5-minute expiry.

### Heartbeat ping
In non-local environments, `main.ts` pings `PING_URL` every 13 minutes to keep the Render dyno warm. This is a free-tier workaround and should be removed if the app moves to a paid plan with always-on dynos.

### `password_hash` is never selected in `findById`
`UsersService.findById` uses an explicit `select` that excludes `password_hash`. This means the returned object's type is technically `Partial<User>` cast to `User`. Be careful when adding fields to the select — missing fields silently return `undefined`.

### Vendure is a secondary system
Vendure was integrated earlier in the project. Medusa is the active e-commerce system. The `VendureModule` and `MarketplaceModule` are both still registered and functional but Medusa is the primary integration going forward.

### Stray import in `users.service.ts`
Line 4 imports `{ tr } from '@faker-js/faker/.'` — this is unused and a leftover from copy-paste. It will cause a lint warning. Safe to remove.

### Docker Dockerfile exposes port 3000 but app runs on 8080
The `Dockerfile` has `EXPOSE 3000` but the app reads `PORT` from env (defaulting to 8080). This is a documentation mismatch — the `EXPOSE` directive does not affect runtime, but it is misleading.

---

## Adding a new feature module

```bash
# Generate a new NestJS module
npx nest g module my-feature
npx nest g controller my-feature
npx nest g service my-feature
```

Then:
1. Add `MyFeatureModule` to the `imports` array in `src/app.module.ts`
2. Add `{ path: 'my-feature', version: '1' }` to the controller `@Controller` decorator
3. Protect routes with `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`
4. Add new Prisma models to `prisma/schema.prisma` and run `npx prisma migrate dev`

## Adding a new email template

1. Create `src/mail/templates/my-template.hbs`
2. Call: `mailService.sendTemplate({ to, subject, template: 'my-template', context: { ...vars } })`
3. Variables in the template use `{{varName}}` Handlebars syntax
