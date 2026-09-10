# Averon Admin Audit

Audit date: 2026-07-12

## Summary

The admin has been moved away from local test credentials and fabricated operating data. Protected admin routes now use Firebase Authentication and require an `owner` or `admin` custom claim before protected content renders.

The current real backend surface is Firestore, guarded by `firestore.rules`. Supported collections are:

- `users`
- `quotes`
- `contracts`
- `invoices`
- `payments`
- `messages`
- `notifications`
- `auditLogs`

There is no `api/`, `db/`, Cloud Functions, server admin SDK endpoint, Stripe webhook handler, media backend, analytics backend, product CMS, project CMS, blog CMS, SEO CMS, settings CMS, or admin AI backend in this repository. Those areas are documented as blocked instead of being filled with demonstration records.

## Security Findings

- Admin login now uses Firebase email/password authentication.
- Admin route protection checks Firebase ID token custom claims and only allows `role: owner` or `role: admin`.
- Unauthenticated visitors are redirected to `/admin/login`.
- Authenticated non-admin users see an access-denied state and protected admin content is not rendered.
- Firestore rules already enforce admin-only reads/writes for admin collections through `request.auth.token.role`.
- Launch blocker: an external secure process is still required to set Firebase custom claims. This cannot be done safely from the frontend.
- Launch blocker: Stripe payment reconciliation still needs a server-side webhook/API if payments must be authoritative.

## Route Status

| Page | Route | Current data source | Final status | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/admin` | Firestore: users, quotes, contracts, invoices, payments, messages, auditLogs | PARTIAL | Real counts only. Unsupported revenue/forecast metrics removed. |
| Homepage | `/admin/homepage` | Source-managed homepage content | BLOCKED BY MISSING BACKEND | No edit/save controls shown until a content collection exists. |
| Products | `/admin/products` | Source-managed product content | PARTIAL | Product inventory is honest source content. Admin editing requires product collection. |
| Projects | `/admin/projects` | Source-managed project content | PARTIAL | Portfolio view only. Delivery tracking requires project collection. |
| Services | `/admin/services` | None | BLOCKED BY MISSING BACKEND | Public services are source-managed. |
| Technology | `/admin/technology` | None | BLOCKED BY MISSING BACKEND | Public technology content is source-managed. |
| Blog | `/admin/blog` | None | BLOCKED BY MISSING BACKEND | Blog articles are source-managed. |
| Messages | `/admin/messages` | Firestore `messages` | ACTIVE | Lists real messages and supports mark-read. |
| Quote Requests | `/admin/quotes` | Firestore `quotes` | ACTIVE | Lists real quote requests and supports replies. |
| Customers | `/admin/customers` | Firestore `users` | ACTIVE | Lists real Firebase user profiles. |
| CRM Pipeline | `/admin/crm` | None | BLOCKED BY MISSING BACKEND | Requires opportunity/stage collection. |
| Contracts | `/admin/contracts` | Firestore `contracts`, `users`, `invoices`, `notifications`, `auditLogs` | ACTIVE | Can assign contracts and deposit invoices to real customers. |
| Proposals | `/admin/proposals` | None | BLOCKED BY MISSING BACKEND | Requires proposal collection. |
| Invoices | `/admin/invoices` | Firestore `invoices` | ACTIVE | Lists real invoice records. |
| Payments | `/admin/payments` | Firestore `payments` | PARTIAL | Records are visible. Stripe webhook reconciliation is missing. |
| Media Library | `/admin/media` | None | BLOCKED BY MISSING BACKEND | Requires Firebase Storage or another asset service. |
| Testimonials | `/admin/testimonials` | None | BLOCKED BY MISSING BACKEND | Requires testimonial collection. |
| Analytics | `/admin/analytics` | None | BLOCKED BY MISSING BACKEND | Requires real analytics/event source. |
| Knowledge Base | `/admin/knowledge-base` | None | BLOCKED BY MISSING BACKEND | Should be designed with admin AI integration. |
| Emmy AI Gateway | `/admin/ai-settings` | None | BLOCKED BY MISSING BACKEND | Deferred to the next AI admin phase. |
| SEO | `/admin/seo` | None | BLOCKED BY MISSING BACKEND | Requires metadata collection. |
| Navigation | `/admin/navigation` | Source-managed navigation | BLOCKED BY MISSING BACKEND | Requires navigation collection. |
| Footer | `/admin/footer` | Source-managed footer | BLOCKED BY MISSING BACKEND | Requires footer/content collection. |
| Brand Settings | `/admin/brand-settings` | Source assets/config | BLOCKED BY MISSING BACKEND | Requires settings/content collection. |
| Settings | `/admin/settings` | None | BLOCKED BY MISSING BACKEND | Requires secure admin-only settings collection. |
| Profile | `/admin/profile` | Firebase Auth identity | PARTIAL | Auth identity exists; profile editing requires secure update flow. |
| Security | `/admin/security` | Firestore `auditLogs` | PARTIAL | Reads activity logs. Role management must remain server-side. |
| Appearance | `/admin/appearance` | Source CSS | BLOCKED BY MISSING BACKEND | Requires persisted theme settings. |

## Launch Work Remaining

- Create a secure admin provisioning path for Firebase custom claims.
- Decide which source-managed public content should become Firestore-backed CMS content.
- Add server-side payment webhook/API support before treating Stripe payment status as authoritative.
- Add Firebase Storage or another media backend before enabling admin uploads.
- Add dedicated collections and rules for products, projects, services, blog, SEO, navigation, footer, settings, testimonials, analytics, and admin AI where needed.
- Deploy reviewed Firestore rules separately; this task did not deploy rules.
