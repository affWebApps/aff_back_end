## Auth & Account Security

POST /v1/auth/register – email/password signup (optional invite code). ✅

POST /v1/auth/login ✅

POST /v1/auth/logout ✅

POST /v1/auth/refresh – refresh token. (ON HOLD ✋ )

POST /v1/auth/verify-email – consume token. ✅

POST /auth/resend-verification – {email} → sends new verification email ✅

GET /auth/facebook – starts Facebook OAuth ✅ (facebook profile picture still not showing ‼️ )

GET /auth/facebook/callback – OAuth callback → {access_token} ✅

GET /auth/google – starts Google OAuth ✅

GET /auth/google/callback – OAuth callback → {access_token} ✅

POST /v1/auth/forgot-password – send reset email. ✅

POST /v1/auth/reset-password – {token,newPassword}. ✅

POST /v1/auth/change-password – (authed) current→new ✅

POST /v1/auth/oauth-exchange - route to login socially authed user ✅

(Optional 2FA) POST /v1/auth/otp/request, POST /v1/auth/otp/verify. (ON HOLD ✋ )

## Users, Roles, Profile

GET /users – JWT required; list users (only for admin) ✅

GET /v1/users/me ✅

PATCH/PUT /v1/users/me – name, bio, locale, marketing opt-in. ✅

PATCH /v1/users/me/roles – toggle designer|tailor|both. (ON HOLD ✋ )

POST /v1/users/me/avatar – signed upload or multipart.

GET /v1/users/:id – public profile. ✅

GET /v1/portfolio – get user portfolio ✅

POST /v1/portfolio – create user portfolio ✅

PATCH /v1/portfolio – update user portfolio ✅

DEL /v1/portfolio – delete user portfolio ✅

GET /v1/reviews – aggregate + list. ✅

## Notification Center & Preferences

GET /v1/notifications?status=unread|all&cursor= – in-app feed.

POST /v1/notifications/:id/read

POST /v1/notifications/read-all

GET /v1/notification-preferences

PUT /v1/notification-preferences – per category/channel.

(Internal) POST /v1/internal/events – publish domain event (service→orchestrator).

## Messaging (Designer ↔ Tailor)

POST /v1/threads – { participants:[userIds], projectId? }

GET /v1/threads?mine=true

GET /v1/threads/:threadId/messages?cursor=

POST /v1/threads/:threadId/messages – text + attachments.

WebSocket: /ws – join user room, thread rooms; typing, read receipts.

## Designs (Parametric studio outputs)

POST /v1/designs – create/save JSON pattern + meta; link to files.

GET /v1/designs?mine=true&cursor=

GET /v1/designs/:id

PATCH/PUT /v1/designs/:id – title, tags, public/private.

DELETE /v1/designs/:id

POST /v1/designs/:id/export – {format:"png|svg|json", preset?} → returns URL(s).

POST /v1/designs/:id/share – generate share link.

POST /v1/designs/:id/duplicate

## Assets & Textures

GET /v1/assets/patterns?category= – list library entries.

POST /v1/assets/textures – upload fabric swatch.

GET /v1/assets/textures?mine=|public=

(Optional) GET /v1/assets/presets – garment presets.

## Projects (service requests from Designers)

POST /v1/projects – title, description, designId(s), budget, deadline, requirements.

GET /v1/projects?status=open|in_progress|…&q=&cursor=

GET /v1/projects/:id

PATCH /v1/projects/:id – edits by owner.

POST /v1/projects/:id/close – stop accepting bids.

Requirements approval (before escrow):

POST /v1/projects/:id/requirements – upload/define requirements (designer).

POST /v1/projects/:id/requirements/approve – tailor/designer mutual approval.

## Bids (Tailors → Projects)

POST /v1/projects/:id/bids – {amount, duration, message}

GET /v1/projects/:id/bids

GET /v1/bids?mine=true&status=

POST /v1/bids/:bidId/accept – designer only (auto creates order).

POST /v1/bids/:bidId/reject

## Orders (created once a bid is accepted)

GET /v1/orders?buyer=me|seller=me&status=

GET /v1/orders/:orderId

PATCH /v1/orders/:orderId – update meta (non-financial).

Deliverables lifecycle

POST /v1/orders/:orderId/deliveries – tailor submits proof/files.

POST /v1/orders/:orderId/approve-delivery – buyer approves.

POST /v1/orders/:orderId/dispute – buyer opens dispute (reason).

POST /v1/orders/:orderId/cancel – rules-gated.

## Payments & Escrow (wallet-less)

POST /v1/payments/:orderId/initiate – create gateway checkout (split delayed).

POST /v1/payments/webhook – public; verifies and sets escrow=held.

GET /v1/payments/:orderId – status (held/released/refunded).

POST /v1/payments/:orderId/release – after approval → gateway transfer to tailor, auto-split commission.

POST /v1/payments/:orderId/refund – partial/full, admin or policy controlled.

## Marketplace Products (buy finished items)

POST /v1/products – seller creates item (title, price, stock, photos).

GET /v1/products?q=&category=&cursor=

GET /v1/products/:id

PATCH /v1/products/:id

DELETE /v1/products/:id

POST /v1/checkout/initiate – product(s) → gateway checkout with split.

POST /v1/checkout/webhook – payment confirmation (non-escrow if shipped items).

## Reviews & Ratings

POST /v1/orders/:orderId/reviews – one per counterpart.

GET /v1/users/:id/reviews – public.

## Newsletter & System Updates

POST /v1/newsletter/subscribe

POST /v1/newsletter/unsubscribe

POST /v1/system/announcements – admin create (in-app banner + optional email).

## Admin & Moderation

GET /v1/admin/users?role=&q=

GET /v1/admin/projects?status=

GET /v1/admin/orders?status=

POST /v1/admin/orders/:orderId/resolve-dispute – {resolution:"refund|release", amount?}

POST /v1/admin/feature-flags – toggle flags.

GET /v1/admin/audit-logs

## Files / Uploads

POST /v1/uploads/sign – S3/R2 signed URL (design exports, deliverables).

POST /v1/uploads/complete – finalize & persist metadata.

## Search (optional unified)

GET /v1/search?q= – users, projects, products, designs (facets).