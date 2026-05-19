# AFF Backend — Claude Context

## What this project is

**Afrique Fashion Fusion (AFF)** backend. A NestJS API for a fashion marketplace where:
- **Designers** create fashion designs and post projects
- **Tailors** bid on those projects
- **Users** (both roles) buy/sell products through an e-commerce layer

Deployed on **Render** at `https://aff-back-end.onrender.com`. Frontend lives at `https://afriquefashionfusion.com`.

---

## Stack

| Concern | Technology |
|---|---|
| Framework | NestJS v10, TypeScript 5.1.3 |
| Database | PostgreSQL 14 via Prisma v7 (PrismaPg adapter) |
| Auth | JWT + Passport (Local, Google OAuth, Facebook OAuth) |
| File storage | Supabase Storage |
| Email | Pluggable: SMTP / AWS SESv2 / Resend (set by `MAIL_PROVIDER` env var) |
| E-commerce (primary) | Medusa v2 (custom vendor plugin) |
| Product catalog (secondary) | Vendure (GraphQL) |
| API docs | Swagger at `/v1/docs` |
| Containerisation | Docker + docker-compose (Postgres on port 5433, timezone Africa/Lagos) |
| Testing | Jest (unit + e2e) |

---

## Commands

```bash
# Development
npm run start:dev          # watch mode
npm run start:debug        # debug + watch

# Build & production
npm run build
npm run start:prod         # node dist/src/main

# Database
npx prisma migrate dev     # run migrations in dev
npx prisma migrate deploy  # run migrations in prod (also in Dockerfile CMD)
npx prisma generate        # regenerate Prisma client after schema changes
npx prisma studio          # GUI browser for the DB
npm run db:seed            # ts-node prisma/seed.ts — seeds fake users + related data

# Code quality
npm run lint               # ESLint --fix
npm run format             # Prettier --write

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
├── app.controller.ts           # GET /v1 → "AFF Backend is Running!!!"
├── app.service.ts              # getHello() utility
├── health.controller.ts        # GET /v1/health — SELECT 1 DB ping
├── lib/
│   └── prisma.ts               # Prisma client options (env-based URL selection)
│
├── auth/                       # Full auth system
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── local-auth.guard.ts
│   │   ├── google-auth.guard.ts
│   │   ├── facebook-auth.guard.ts
│   │   └── admin.guard.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   ├── google.strategy.ts
│   │   └── facebook.strategy.ts
│   └── dto/
│       ├── register.dto.ts, login.dto.ts, verify-email.dto.ts
│       ├── resend-verification.dto.ts, forgot-password.dto.ts
│       ├── reset-password.dto.ts, change-password.dto.ts
│       └── oauth-code.dto.ts
│
├── users/                      # User profile CRUD
├── projects/                   # Designer projects + tailor bids
├── portfolios/                 # Portfolio with image galleries
├── reviews/                    # Polymorphic reviews (User | Project | Product)
├── blogs/                      # Blog posts (admin write, public read)
├── admin/                      # Admin aggregation module (blogs admin, etc.)
├── platform-settings/          # Key-value platform config (admin-managed)
│
├── medusa/                     # Primary e-commerce (Medusa v2) — products, cart, orders, payments
├── marketplace/                # Secondary catalog (Vendure GraphQL) — search, browse
├── vendure/                    # Vendure schema (queries.ts, mutations.ts), VendureModule
│
├── storage/                    # Supabase file upload service
├── uploads/                    # Upload controller (Multer → Supabase)
├── mail/                       # Pluggable email service (SMTP/SES/Resend)
│   └── templates/              # Handlebars (.hbs) email templates
│       ├── verify-email.hbs
│       └── reset-password.hbs
│
└── prisma/                     # Global PrismaService singleton

prisma/
├── schema.prisma               # Single schema file — all 27 models here
├── migrations/                 # Auto-generated migration files
└── seed.ts                     # Seed script using @faker-js/faker
```

---

## API versioning & routing

All routes use URI versioning: `/v1/<path>`.

| Prefix | Module | Auth |
|---|---|---|
| `GET /v1` | AppController | None |
| `GET /v1/health` | HealthController | None |
| `/v1/auth/*` | AuthModule | Mixed (see auth section) |
| `/v1/users/*` | UsersModule | JWT |
| `/v1/store/*` | MedusaModule | Mixed |
| `/v1/marketplace/*` | MarketplaceModule | None / Optional |
| `/v1/projects/*` | ProjectsModule | JWT |
| `/v1/bids/*` | ProjectsModule (BidsController) | JWT |
| `/v1/portfolio/*` | PortfoliosModule | JWT |
| `/v1/reviews/*` | ReviewsModule | JWT |
| `/v1/blogs/*` | BlogsModule (public) | None |
| `/v1/admin/*` | AdminModule | Admin role |
| `/v1/platform-settings/*` | PlatformSettingsModule | Admin |
| `/v1/site-content/*` | SiteContentModule | None (read) / Admin (write) |
| `/v1/team-members/*` | TeamMembersModule | None (read) / Admin (write) |
| `/v1/uploads-test-567/*` | UploadsModule | JWT |
| `/v1/docs` | Swagger UI | None |

> **Note**: The uploads route is `/v1/uploads-test-567` (not `/v1/uploads`) — this is intentional obfuscation in the current code.

---

## Authentication

### Email/password flow
1. `POST /v1/auth/register` — creates user, hashes password (bcrypt 10 rounds), sends 24h verification email
2. User clicks link → `POST /v1/auth/verify-email` with token → marks `is_verified=true`, returns JWT + user
3. `POST /v1/auth/login` (LocalAuthGuard) — validates password via bcrypt + checks `is_verified` → returns JWT + user

### OAuth flow (Google / Facebook)
1. `GET /v1/auth/google` or `GET /v1/auth/facebook` → redirects to provider
2. Provider callback → backend creates/updates user, sets `is_verified=true`, generates 5-minute OAuth code (itself a JWT signed with `JWT_SECRET`)
3. Provider redirect sends user to frontend `/auth/callback?code=...&provider=google`
4. Frontend calls `POST /v1/auth/oauth-exchange` with `{ code }` → returns long-lived JWT

### Password reset
- `POST /v1/auth/forgot-password` → creates 30-min reset token in DB, emails it
- `POST /v1/auth/reset-password` → validates token not expired/used, updates password hash, marks token used

### Logout invalidation
- `POST /v1/auth/logout` → sets `user.last_logout_at = now()`
- JWT strategy rejects any token issued **before** `last_logout_at`

### All auth controller endpoints

| Method | Path | Guard | Description |
|---|---|---|---|
| POST | `/v1/auth/login` | LocalAuthGuard | Email/password login |
| POST | `/v1/auth/register` | None | Register new user |
| POST | `/v1/auth/verify-email` | None | Verify email with token |
| POST | `/v1/auth/resend-verification` | None | Resend verification email |
| POST | `/v1/auth/forgot-password` | None | Request password reset email |
| POST | `/v1/auth/reset-password` | None | Reset password with token |
| POST | `/v1/auth/oauth-exchange` | None | Exchange OAuth code for JWT |
| GET | `/v1/auth/google` | GoogleAuthGuard | Initiate Google OAuth |
| GET | `/v1/auth/google/callback` | GoogleAuthGuard | Google OAuth callback |
| GET | `/v1/auth/facebook` | FacebookAuthGuard | Initiate Facebook OAuth |
| GET | `/v1/auth/facebook/callback` | FacebookAuthGuard | Facebook OAuth callback |
| POST | `/v1/auth/logout` | JwtAuthGuard | Invalidate token |
| POST | `/v1/auth/change-password` | JwtAuthGuard | Change password (EMAIL provider only) |

### Guards
- `JwtAuthGuard` — Bearer token check via `jwt` Passport strategy
- `LocalAuthGuard` — email+password via `local` Passport strategy
- `GoogleAuthGuard` / `FacebookAuthGuard` — OAuth redirect guards
- `AdminGuard` — CanActivate, checks `req.user.role === 'admin'` or `'ADMIN'`; throws `ForbiddenException`

### JWT strategy details
- Extracts token from `Authorization: Bearer <token>` header
- Validates signature with `JWT_SECRET`
- Checks `iat` (issued at) against `user.last_logout_at` — rejects if token was issued before logout
- Returns user object without `password_hash`

### Auth DTOs
- **RegisterDto**: `email` (IsEmail), `password` (MinLength 6), `firstName?`, `lastName?`
- **LoginDto**: `email` (IsEmail), `password` (MinLength 6)
- **VerifyEmailDto**: `token` (IsString)
- **ResendVerificationDto**: `email` (IsEmail)
- **ForgotPasswordDto**: `email` (IsEmail)
- **ResetPasswordDto**: `token` (IsString), `newPassword` (MinLength 6)
- **ChangePasswordDto**: `currentPassword`, `newPassword` (MinLength 6)
- **OAuthCodeDto**: `code` (IsString)

---

## Users module

### UsersService methods
| Method | Description |
|---|---|
| `create(input)` | Create user; always sets `role='designer'` |
| `findByEmail(email)` | Unique query, lowercases email |
| `findById(id)` | Full profile with portfolios, projects, bids, reviews_received; **excludes password_hash** |
| `findPasswordById(id)` | Only `id`, `password_hash`, `auth_provider` (for change-password) |
| `findAllMinimal()` | All users, minimal fields + portfolios, ordered DESC by created_at |
| `updateUser(id, data)` | Partial update: firstName, lastName, displayName, phoneNumber, bio, avatarUrl, country, city |
| `buildProfile(user)` | Strips `password_hash` from returned object |

### UsersController endpoints (all JWT-guarded)

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/v1/users/me` | JWT | Get own profile |
| PATCH | `/v1/users/me` | JWT | Update own profile |
| GET | `/v1/users/` | JWT + Admin | List all users (minimal) |
| GET | `/v1/users/:id` | JWT | Get any user by id |

### UpdateUserDto fields (all optional)
`firstName`, `lastName`, `displayName`, `phoneNumber`, `bio`, `avatarUrl`, `country`, `city`

---

## Projects module

### Business rules
- One designer per project; multiple tailors submit bids
- Only project's designer can view all bids for their project
- One bid per tailor per project (enforced in service)
- Requirements need dual approval: designer sets `designer_approved`, the accepted tailor sets `tailor_approved`
- Project must be `OPEN` to create/update/delete requirements

### ProjectsService — project methods
| Method | Description |
|---|---|
| `create(designerId, dto)` | Create project with optional files |
| `findById(id)` | Include files, requirements, reviews |
| `update(id, designerId, dto)` | Verify ownership, partial update |
| `delete(id, designerId)` | Delete files first, then project |
| `close(id, designerId, status)` | Set status to `COMPLETED` or `CLOSED` only |
| `deleteFile(projectId, fileId, userId)` | Remove single project file |

### ProjectsService — bid methods
| Method | Description |
|---|---|
| `createBid(projectId, tailorId, dto)` | Enforce one bid per tailor per project |
| `listBids(projectId, userId)` | Only project designer can list |
| `decideBid(bidId, userId, decision)` | APPROVED or REJECTED; blocks double decisions |
| `deleteBid(bidId, userId)` | Creator only |
| `getBidById(bidId, userId)` | Accessible by tailor or project designer |

### ProjectsService — requirement methods
| Method | Description |
|---|---|
| `listRequirements(projectId)` | All requirements for project |
| `createRequirement(projectId, userId, dto)` | Designer only, project must be OPEN |
| `updateRequirement(projectId, reqId, userId, dto)` | Partial update, OPEN only |
| `deleteRequirement(projectId, reqId, userId)` | Designer only |
| `approveRequirement(projectId, reqId, userId)` | Designer → `designer_approved=true`; accepted tailor → `tailor_approved=true` |

### ProjectsController endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/v1/projects/` | Create project |
| GET | `/v1/projects/:id` | Get project with files + reviews |
| PATCH | `/v1/projects/:id` | Update project |
| DELETE | `/v1/projects/:id` | Delete project |
| POST | `/v1/projects/:id/close` | Close / complete project |
| DELETE | `/v1/projects/:id/files/:fileId` | Delete project file |
| GET | `/v1/projects/:id/requirements` | List requirements |
| POST | `/v1/projects/:id/requirements` | Create requirement |
| PATCH | `/v1/projects/:id/requirements/:reqId` | Update requirement |
| DELETE | `/v1/projects/:id/requirements/:reqId` | Delete requirement |
| POST | `/v1/projects/:id/requirements/:reqId/approve` | Approve requirement |
| POST | `/v1/projects/:id/bids` | Submit bid |
| GET | `/v1/projects/:id/bids` | List bids (designer only) |

### BidsController endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/v1/bids/:bidId` | Get bid (designer or tailor) |
| PATCH | `/v1/bids/:bidId/decision` | Accept/reject bid |
| DELETE | `/v1/bids/:bidId` | Delete bid |

### Project DTOs
- **CreateProjectDto**: `title` (required), `description?`, `budget?` (number), `estimatedTime?`, `status?` (OPEN|IN_PROGRESS|COMPLETED|CLOSED), `designId?`, `files?` (ProjectFileDto[])
- **ProjectFileDto**: `fileUrl` (required), `fileType?`
- **CreateBidDto**: `amount` (number), `duration?` (string), `message?`
- **CreateProjectRequirementDto**: `content?` (JSON), `designerApproved?`, `tailorApproved?`

---

## Portfolios module

### PortfoliosService methods
| Method | Description |
|---|---|
| `listByUser(userId)` | All portfolios with images, DESC by created_at |
| `getByIdForUser(userId, portfolioId)` | Portfolio belonging to this user |
| `createForUser(userId, dto)` | Create with optional images; first image marked primary if none set |
| `updateForUser(userId, portfolioId, dto)` | Delete existing images, create new set |
| `deletePortfolioForUser(userId, portfolioId)` | Delete images first, then portfolio |
| `normalizeImages(images)` | Ensures at least first image has `is_primary=true` |

### PortfoliosController endpoints (all JWT-guarded, prefix `/v1/portfolio`)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/portfolio/` | List own portfolios |
| POST | `/v1/portfolio/` | Create portfolio |
| PATCH | `/v1/portfolio/:portfolioId` | Update portfolio |
| DELETE | `/v1/portfolio/:portfolioId` | Delete portfolio |

### Portfolio DTOs
- **CreatePortfolioDto**: `title?`, `description?`, `images?` (PortfolioImageDto[])
- **PortfolioImageDto**: `imageUrl` (required), `isPrimary?`

---

## Reviews module

### ReviewsService methods
| Method | Description |
|---|---|
| `getReviews(targetType, targetId)` | Polymorphic: targetType = `'user'` \| `'project'` \| `'product'` |
| `createReview(reviewerId, dto)` | Maps targetType → `target_user_id` / `target_project_id` / `target_product_id` |
| `deleteReview(reviewId, reviewerId)` | Only reviewer can delete |

### ReviewsController endpoints (all JWT-guarded)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/reviews/:targetType/:targetId` | Get reviews for entity |
| POST | `/v1/reviews/` | Create review |
| DELETE | `/v1/reviews/:id` | Delete review |

### CreateReviewDto
`targetType` (IsString: user|project|product), `targetId` (IsString), `rating` (IsInt, 1-5), `comment?`

---

## Blogs module

### BlogsService methods
| Method | Description |
|---|---|
| `create(dto, adminId?)` | Create blog; status defaults to `'draft'`; normalizes images |
| `findAll()` | All blogs DESC by created_at |
| `findAllPublished()` | Status = `'published'` only |
| `findOne(id)` | Blog with images |
| `findOnePublished(id)` | Published blog only |
| `update(id, dto)` | Partial update; validates status against `BLOG_STATUS` |
| `delete(id)` | Delete images first, then blog |

**BLOG_STATUS** allowed values: `['draft', 'scheduled', 'published']`

### Public BlogsController (no auth, prefix `/v1/blogs`)

| Method | Path | Description |
|---|---|---|
| GET | `/v1/blogs/` | List published blogs |
| GET | `/v1/blogs/:id` | Get single published blog |

Admin CRUD for blogs lives in `src/admin/` under `/v1/admin/blogs/*` (AdminGuard required).

### Blog DTOs
- **CreateBlogDto**: `title` (required), `content?`, `scheduledFor?` (IsDateString), `status?`, `images?` (BlogImageDto[])
- **BlogImageDto**: `imageUrl` (required), `isPrimary?`

---

## Medusa integration (critical)

Medusa is the primary e-commerce engine. Every AFF user is mirrored in Medusa as both a **vendor** (seller) and a **customer** (buyer).

### Auth bridge — `x-aff-token`
AFF does not use Medusa's native auth for end users. The AFF JWT is forwarded as an `x-aff-token` header. Medusa has a custom `/auth/user/my-auth` endpoint that accepts it.

### Sync flow (runs on login and register)
```
login/register
  → jwtService.sign(payload)                              # AFF JWT
  → medusaService.syncVendorAndCustomerWithAffToken(userId, token)
      1. GET /store/auth-context                           # check if already synced
      2. POST /auth/user/my-auth                           # authenticate with Medusa
      3. POST /vendors { name, handle, logo, admin: { email, first_name, last_name } }
      4. Persist vendor_id + customer_id → users table
```
Sync is **idempotent** — skipped entirely if both `vendor_id` and `customer_id` are already set.
Sync errors are **swallowed** (only logged) — users log in even if Medusa is down.

### MedusaService key methods

| Method | Description |
|---|---|
| `listProducts(params)` | List store products |
| `getProductById(productId)` | Single product |
| `listProductsbyVendor(params)` | Vendor-scoped products |
| `syncVendorAndCustomerWithAffToken(userId, affToken)` | Full sync on login/register |
| `createVendorForUser(user, logo_url, handle)` | Create Medusa vendor |
| `createCustomerForUser(user)` | Create Medusa customer |
| `ensureCartForUser(affToken)` | Get or create cart |
| `addToCart(affToken, variantId, quantity, cartId?, productId?)` | Stock-check then add |
| `removeFromCart(affToken, itemId, cartId?)` | Remove line item |
| `updateCartItem(affToken, itemId, quantity, cartId?)` | Update line item quantity |
| `updateCartDetails(affToken, updates, cartId?)` | Shipping/billing address + email |
| `listCartOptions(cartId)` | Get shipping options |
| `addShippingMethodToCart(affToken, optionId, cartId?)` | Add shipping method |
| `listPaymentProviders(regionId?)` | Available payment providers |
| `initiatePaymentSession(affToken, providerId, email, cartId?)` | Start payment |
| `completeCart(affToken, cartId?)` | Place order |
| `verifyPaystackPayment(reference, affToken?)` | Verify Paystack payment |
| `completeCartFromPaystackReference(reference, affToken)` | Full Paystack completion flow |
| `getOrdersList(affToken, page, limit)` | List orders |
| `getOrderTransactionsList(affToken, page, limit)` | Order transactions |
| `retrieveOrder(orderId)` | Single order |
| `createVendorProducts(affToken, payload)` | Create vendor product |
| `updateVendorProduct(affToken, productId, payload)` | Update vendor product |
| `deleteVendorProduct(affToken, productId)` | Delete vendor product |

### MedusaController endpoints (prefix `/v1/store`)

**Public (no auth):**
- `GET /v1/store/products`
- `GET /v1/store/products/:id`
- `GET /v1/store/products-by-vendor`
- `GET /v1/store/payment-providers`

**JWT-guarded:**
- `GET /v1/store/cart` — get cart
- `GET /v1/store/full-cart` — detailed cart
- `GET /v1/store/cart/options` — shipping options
- `POST /v1/store/cart/add-to-cart`
- `POST /v1/store/cart/remove-item`
- `POST /v1/store/cart/update-item`
- `POST /v1/store/cart/update` — update cart details
- `POST /v1/store/cart/shipping-method`
- `POST /v1/store/cart/payment-session`
- `POST /v1/store/cart/complete`
- `POST /v1/store/cart/complete-from-reference` — Paystack flow
- `POST /v1/store/paystack-verify`
- `POST /v1/store/sync` — manual Medusa sync
- `GET /v1/store/orders`
- `GET /v1/store/orders/:id`
- `GET /v1/store/order-transactions`
- `POST /v1/store/vendors/products`
- `POST /v1/store/vendors/products/:product_id/update`
- `DELETE /v1/store/vendors/products/:product_id`

### Paystack payment flow
1. Frontend initiates payment directly via Paystack
2. On success, frontend sends reference to `POST /v1/store/cart/complete-from-reference`
3. Backend calls Medusa `/store/paystack-cart?reference=...` to resolve `cart_id`
4. Backend calls `completeCart` to finalise the order

---

## Vendure integration (secondary catalog)

Used for browsing/searching a separate product catalog. Communicates via GraphQL.

- **Shop API** — public browsing (`VENDURE_SHOP_API` + `VENDURE_CHANNEL_TOKEN` header)
- **Admin API** — product creation (`VENDURE_ADMIN_API` + credentials via `VendureAuthService.getAdminToken()`)
- Admin token fetched lazily before each admin call

### MarketplaceService key methods
| Method | Description |
|---|---|
| `listCollectionProducts(skip, take, slug)` | Products from a collection |
| `getProductDetailById(id)` | Single product detail |
| `searchProducts(term, skip, take)` | Basic search |
| `search(params)` | Advanced search with sort (name-asc/desc, price-asc/desc) + facet filtering |
| `tokenizedSearch(term, page, take)` | Split term by whitespace, merge unique results |
| `createProductWithVariant(productInput, variantInput)` | Create via Admin API |
| `ensureVendureCustomer(userId, payload)` | Lazy create customer, persist customer_id |

Vendure is **secondary** — Medusa is the active ecommerce system. Both modules remain registered and functional.

---

## Mail system

Controlled by `MAIL_PROVIDER` env var:

| Value | Service | Required env vars |
|---|---|---|
| `smtp` (default) | Nodemailer | `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASS` |
| `ses` | AWS SESv2 SDK | `AWS_REGION`, optionally `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` |
| `resend` | Resend | `RESEND_API_KEY` |

Always set `EMAIL_FROM`. Templates use Handlebars (`.hbs`).

### MailService methods
| Method | Description |
|---|---|
| `sendTemplate(options)` | Load `.hbs` from `src/mail/templates/`, compile, send HTML |
| `sendMail(params)` | Internal: routes to SES / Resend / SMTP |
| `sendTestEmail(to)` | Smoke-test the transport |

### Adding a new email template
1. Create `src/mail/templates/my-template.hbs`
2. Call `mailService.sendTemplate({ to, subject, template: 'my-template', context: { ...vars } })`
3. Variables use `{{varName}}` Handlebars syntax

---

## File uploads

`POST /v1/uploads-test-567/` (JWT-guarded) → Multer buffers file in memory → `StorageService.uploadBuffer()` → Supabase Storage → returns `{ url }`.

### StorageService.uploadBuffer params
- `buffer` — file Buffer
- `contentType?` — MIME type
- `folder?` — defaults to `'uploads'`
- `filename?` — defaults to UUID

Bucket set by `SUPABASE_BUCKET` env var (default `aff-media`). Bucket must be **public**.

---

## Site content

Stores CMS-style website copy in the DB so admins can update text without redeploying.

### SiteContentService methods
| Method | Description |
|---|---|
| `findAll(activeOnly?)` | All sections or only `is_active=true`, ordered by key |
| `findByKey(key)` | Single section by unique key; throws `NotFoundException` |
| `create(dto)` | Create a new section |
| `update(key, dto)` | Partial update by key |
| `delete(key)` | Delete by key |

### SiteContentController endpoints (prefix `/v1/site-content`)

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/v1/site-content` | None | List all sections (`?active=true` for active only) |
| GET | `/v1/site-content/:key` | None | Get section by key (e.g. `about_us`) |
| POST | `/v1/site-content` | JWT + Admin | Create section |
| PATCH | `/v1/site-content/:key` | JWT + Admin | Update section |
| DELETE | `/v1/site-content/:key` | JWT + Admin | Delete section |

### CreateSiteContentDto fields
`key` (unique string, e.g. `about_us`), `title`, `body` (long text), `imageUrl?`, `isActive?` (default true)

### Recommended keys
`about_us`, `our_story`, `our_mission`, `our_vision` (or any string the frontend agrees on)

---

## Team members

Stores team member profiles (name, role, bio, photo) for display on the website.

### TeamMembersService methods
| Method | Description |
|---|---|
| `findAll(activeOnly?)` | All members ordered by `display_order` ASC then `created_at` ASC |
| `findOne(id)` | Single member by id; throws `NotFoundException` |
| `create(dto)` | Add team member |
| `update(id, dto)` | Partial update |
| `delete(id)` | Remove member |

### TeamMembersController endpoints (prefix `/v1/team-members`)

| Method | Path | Guard | Description |
|---|---|---|---|
| GET | `/v1/team-members` | None | List all members (`?active=true` for active only) |
| GET | `/v1/team-members/:id` | None | Get single member |
| POST | `/v1/team-members` | JWT + Admin | Add member |
| PATCH | `/v1/team-members/:id` | JWT + Admin | Update member |
| DELETE | `/v1/team-members/:id` | JWT + Admin | Remove member |

### CreateTeamMemberDto fields
`name`, `role`, `bio?`, `photoUrl?`, `displayOrder?` (Int, default 0 — lower numbers appear first), `isActive?` (default true)

---

## Platform settings

Key-value store for runtime platform configuration (no code changes required).

### PlatformSettingsService methods
| Method | Description |
|---|---|
| `list(activeOnly?)` | All settings or only `is_active=true` |
| `getByKey(key)` | Single setting by unique key |
| `create(dto, updatedBy?)` | Create new setting |
| `update(id, dto, updatedBy?)` | Update setting |
| `delete(id)` | Delete setting |

`value_type` can be: `string`, `number`, `boolean`, `json`

---

## Database — Prisma schema (all 27 models)

### Core enums
- `AuthProvider`: `FACEBOOK | GOOGLE | EMAIL | PINTEREST | INSTAGRAM`
- `ProjectStatus`: `OPEN | IN_PROGRESS | COMPLETED | CLOSED`
- `BidStatus`: `APPROVED | PENDING | REJECTED`

### Model reference

**User** — central entity
```
id (UUID), first_name, last_name, email (unique), password_hash, auth_provider (AuthProvider),
phone_number?, role (default 'designer'), bio?, avatar_url?, rating (Decimal 3,2, default 0),
paystack_subaccount?, country?, city?, display_name?, is_active (default true),
verification_document?, is_verified (default false), last_logout_at?,
customer_id?, vendor_id?,           ← Medusa sync fields
created_at, updated_at
```
Relations: designs, projects (as designer), bids (as tailor), portfolios, roles (UserRole[]), permissions (Permission[]), notifications, auth_sessions, messages_sent, messages_received, orders_buyer, orders_seller, escrows_buyer, escrows_seller, reviews_written, reviews_received, admin_actions, support_tickets, project_files, transactions, products, verification_tokens, password_reset_tokens

**Design** — fashion design by a user
```
id, user_id (FK→User), title, garment_type?, pattern_data (JSON)?,
fabric_texture?, export_png_url?, export_svg_url?, export_json_url?,
is_public (default false), created_at, updated_at
```
Relations: user, projects (Project[])

**Project** — posted by designer, linked to a Design
```
id, designer_id (FK→User), design_id (FK→Design), title, description?,
budget (Decimal 10,2)?, status (ProjectStatus, default OPEN),
estimated_time?, deadline?, created_at, updated_at
```
Relations: designer, design, requirements (ProjectRequirement[]), bids (Bid[]), orders (Order[]), files (ProjectFile[]), messages (Message[]), reviews (Review[])

**ProjectRequirement** — dual-approved requirements
```
id, project_id (FK→Project), content (JSON)?, designer_approved (default false),
tailor_approved (default false), created_at, updated_at
```

**Bid** — tailor bid on a project
```
id, project_id (FK→Project), tailor_id (FK→User), amount (Decimal 10,2),
duration?, message?, status (BidStatus, default PENDING), created_at, updated_at
```

**Order**
```
id, buyer_id (FK→User), seller_id (FK→User), project_id (FK→Project, optional),
amount (Decimal 10,2), commission (Decimal 10,2), status, created_at, updated_at
```
Relations: buyer, seller, project, escrows, deliveries (OrderDelivery[]), transactions

**Escrow**
```
id, buyer_id (FK→User), seller_id (FK→User), order_id (FK→Order),
gateway, amount (Decimal 10,2), commission (Decimal 10,2),
escrow_status, payment_ref?, released_at?, created_at, updated_at
```
Relations: order, buyer, seller, transactions

**Transaction**
```
id, user_id (FK→User), order_id (FK→Order), escrow_id (FK→Escrow),
amount (Decimal 10,2), currency, status, payment_gateway, reference (unique),
metadata (JSON)?, transaction_type, created_at, updated_at
```

**OrderDelivery**
```
id, delivery_id, order_id (FK→Order), note?, files (JSON)?,
created_by (FK→User), created_at, updated_at
```

**Portfolio**
```
id, user_id (FK→User), title?, description?, created_at, updated_at
```
Relations: user, Image (PortfolioImage[], named relation "images")

**PortfolioImage**
```
id, portfolio_id (FK→Portfolio), image_url, is_primary (default false), created_at, updated_at
```

**Product** — AFF-native product (separate from Medusa/Vendure products)
```
id, user_id (FK→User), product_name, product_description?, product_type?,
price (Decimal 10,2), created_at, updated_at
```
Relations: user, images (ProductImage[]), reviews (as review target)

**ProductImage**
```
id, product_id (FK→Product), image_url, is_primary (default false), created_at, updated_at
```

**Review** — polymorphic
```
id, reviewer_id (FK→User), target_user_id? (FK→User), target_project_id? (FK→Project),
target_product_id? (FK→Product), target_type, rating (Int 1-5), comment?
```

**Message**
```
id, project_id? (FK→Project), sender_id (FK→User), receiver_id (FK→User),
chat_id? (FK→Chat), content, read (default false), created_at, updated_at
```

**Chat**
```
id, messages (Message[])
```

**Notification**
```
id, user_id (FK→User), title, message, type, data (JSON)?, read (default false), created_at
```

**AuthSession** — tracks login sessions
```
id, user_id (FK→User), refresh_token, expires_at, device_info?, ip_address?, created_at
```

**VerificationToken** — email verification
```
id, user_id (FK→User, SetNull on delete), token (unique), expires_at, used_at?, created_at
```

**PasswordResetToken**
```
id, user_id (FK→User, SetNull on delete), token (unique), expires_at, used_at?, created_at
```

**ProjectFile**
```
id, project_id (FK→Project), file_url, file_type?, uploaded_by (FK→User), created_at, updated_at
```

**Blog**
```
id, title, content?, scheduled_for?, status (default 'draft'), created_at, updated_at
```
Relations: images (BlogImage[])

**BlogImage**
```
id, blog_id (FK→Blog), is_primary (default false), image_url
```

**SupportTicket**
```
id, user_id (FK→User), order_id? (FK→Order), subject, description, status, created_at, updated_at
```

**PlatformSetting**
```
id, key (unique), value, value_type?, description?, category?, updated_by?,
updated_at, created_at, is_active (default true)
```

**AdminAction** — audit log
```
id, admin_id (FK→User), action_type, target_table, target_id,
old_value (JSON)?, new_value (JSON)?, created_at
```

**Newsletter**
```
id, title, content?, image_url?, status, sent_at?, created_at, updated_at
```

**Permission** + **PermissionDefinition** — fine-grained permissions
```
Permission: id, user_id (FK→User), permission_key (FK→PermissionDefinition.key), value (Boolean), created_at, updated_at
PermissionDefinition: id, key (unique), description?, applies_to, permissions (Permission[])
```

**SiteContent** — website CMS sections
```
id (UUID), key (unique), title, body (Text), image_url?, is_active (default true), created_at, updated_at
```
Example keys: `about_us`, `our_story`, `our_mission`, `our_vision`

**TeamMember** — team profiles for website display
```
id (UUID), name, role, bio? (Text), photo_url?, display_order (Int, default 0), is_active (default true), created_at, updated_at
```
Ordered by `display_order ASC, created_at ASC`

**Role** + **UserRole** — RBAC (currently not enforced via middleware, future use)
```
Role: id, name, description?, users (UserRole[])
UserRole: id, user_id (FK→User), role_id (FK→Role), assigned_at
```

---

## Prisma service & DB connection

**`src/lib/prisma.ts`** selects the database URL based on the `ENVIRONMENT` env var:
- `local` → `LOCAL_DATABASE_URL`
- `dev` → `DEV_DATABASE_URL`
- anything else → `PRODUCTION_DATABASE_URL`

> **Important**: The actual env var is NOT `DATABASE_URL`. Use the environment-specific vars above.

**`src/prisma/prisma.service.ts`** extends `PrismaClient`, runs `SELECT 1` ping on `onModuleInit`, disconnects on `onModuleDestroy`.

---

## Global middleware & pipes (main.ts)

```typescript
// CORS — explicit origin whitelist
origins: [
  'http://localhost:3000', 'http://localhost:3001',
  *.vercel.app, *.amplifyapp.com, afriquefashionfusion.com
]
credentials: true
methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
allowedHeaders: *

// URI versioning — all routes prefixed /v1/
// ValidationPipe — whitelist: true, forbidNonWhitelisted: true, transform: true
// Swagger — available at /v1/docs
// Heartbeat — pings PING_URL every PING_INTERVAL_MS (13 min) in non-local environments
```

---

## Environment variables

```bash
# App
PORT=8080
ENVIRONMENT=local              # local | dev | production — controls DB URL selection + heartbeat
FRONTEND_URL=http://localhost:3001
FRONTEND_VERIFY_URL=http://localhost:3000/verify
FRONTEND_RESET_URL=http://localhost:3000/reset-password
PING_URL=                      # defaults to https://aff-back-end.onrender.com/v1
PING_INTERVAL_MS=780000        # 13 minutes

# Database (pick based on ENVIRONMENT)
LOCAL_DATABASE_URL=postgresql://aff_user:password@localhost:5433/aff_db
DEV_DATABASE_URL=
PRODUCTION_DATABASE_URL=

# Auth / JWT
JWT_SECRET=your-secret

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/v1/auth/google/callback
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
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

# 2. Create .env (see env vars section above)
cp .env.example .env

# 3. Install deps
npm install

# 4. Run migrations + generate client
npx prisma migrate dev
npx prisma generate

# 5. Seed with fake data (optional)
npm run db:seed

# 6. Start dev server
npm run start:dev
# → http://localhost:8080
# → Swagger: http://localhost:8080/v1/docs
```

---

## Patterns & conventions

### User extraction in controllers
```typescript
@Request() req: { user: { id: string; email?: string } }
const userId = req.user.id;
```

### Ownership checks
Services verify `userId === record.designer_id` (or similar) before mutations. Throws `ForbiddenException` or `UnauthorizedException` if ownership fails.

### Atomic DB operations
`prisma.$transaction([...])` used for multi-step operations (e.g., mark token used + update user in `verifyEmail`).

### Image normalization
`normalizeImages()` pattern used in Portfolios and Blogs — ensures the first image has `is_primary=true` if none are explicitly marked.

### Image replacement on update
Instead of diffing, services call `deleteMany` on existing images then `createMany` with the new set.

### Error types used
`NotFoundException`, `UnauthorizedException`, `BadRequestException`, `ForbiddenException`, `InternalServerErrorException`, `HttpException`

### DTO validation decorators
`@ApiProperty()`, `@IsString()`, `@IsEmail()`, `@IsNumber()`, `@IsOptional()`, `@IsArray()`, `@ValidateNested()`, `@Type()`, `@IsIn([...])`, `@IsInt()`, `@Min()`, `@Max()`, `@IsDateString()`

### Swagger decoration
All controllers use `@ApiTags(...)`, `@ApiBearerAuth()` (on guarded routes), `@ApiOperation()`, `@ApiResponse()`.

---

## Known quirks & gotchas

### All new users are `role: 'designer'`
`UsersService.create` hardcodes `role: 'designer'`. No signup-time role selection. Change via direct DB update or admin endpoint.

### DATABASE_URL is NOT the env var
`src/lib/prisma.ts` reads `LOCAL_DATABASE_URL`, `DEV_DATABASE_URL`, or `PRODUCTION_DATABASE_URL` based on `ENVIRONMENT`. Using `DATABASE_URL` alone will cause a connection error.

### Upload route is obfuscated
The actual upload endpoint is `/v1/uploads-test-567/` — not `/v1/uploads/`.

### Medusa sync errors are swallowed
`try/catch` around Medusa sync in `AuthService.login` and `AuthService.register` only logs errors. Users log in even if Medusa is completely down.

### OAuth codes are JWTs
The OAuth "code" sent to the frontend is a 5-minute JWT signed with `JWT_SECRET`. It grants access if exchanged before expiry — treat as sensitive.

### `password_hash` never returned by `findById`
`UsersService.findById` uses an explicit `select` that excludes `password_hash`. Fields not in the `select` silently return `undefined` — be careful when adding new user fields.

### Heartbeat ping
Non-local environments ping `PING_URL` every 13 minutes to keep the Render free dyno warm. Remove if upgrading to a paid always-on plan.

### Stray faker import in `users.service.ts`
Line 4 imports `{ tr } from '@faker-js/faker/.'` — unused copy-paste leftover. Safe to delete; will cause lint warning.

### Dockerfile EXPOSE mismatch
`Dockerfile` has `EXPOSE 3000` but app runs on `PORT` env var (default 8080). `EXPOSE` is documentation-only and doesn't affect runtime.

### `findById` select is a partial cast
The returned type is cast to `User` but is technically `Partial<User>`. Adding new fields to the user model requires also adding them to the `findById` select or they'll be `undefined`.

### Vendure is secondary
Both `VendureModule` and `MarketplaceModule` are registered and functional. Medusa is the active ecommerce path going forward.

---

## Adding a new feature module

```bash
npx nest g module my-feature
npx nest g controller my-feature
npx nest g service my-feature
```

1. Add `MyFeatureModule` to `imports` in `src/app.module.ts`
2. Use `@Controller({ path: 'my-feature', version: '1' })` on the controller
3. Protect routes with `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`
4. Add Prisma models to `prisma/schema.prisma` and run `npx prisma migrate dev`
5. Export the service from the module if other modules need it

## Security checklist when adding endpoints

- Input validation via class-validator DTOs + `ValidationPipe` (already global)
- Ownership checks in service layer before any mutation
- Never return `password_hash` in responses — use `buildProfile()` or explicit `select`
- Admin-only routes need `AdminGuard` in addition to `JwtAuthGuard`
- File uploads go through `StorageService` — never store raw buffers in DB
