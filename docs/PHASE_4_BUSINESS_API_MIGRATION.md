# Phase 4 business API migration

| Domain | Existing collection | Old access | New access | Endpoints | Authorization | Frontend migrated | Tests | Status / remaining work |
|---|---|---|---|---|---|---|---|---|
| Customers | `users` | Admin browser query | API bounded query | `GET /api/v1/business/users` | Admin | Contract customer selector, manager list, dashboard | Admin allow/deny, empty list | MIGRATED for existing admin read; profile self-write remains Firebase Auth flow |
| Enquiries | none | Contact form submits `quotes` | No parallel domain created | none | n/a | Existing UX preserved | n/a | NOT_IMPLEMENTED: current concept is quote request |
| Quotes | `quotes` | Browser create/update | API repository and transaction | `POST /api/v1/quotes`, `GET /api/v1/business/quotes`, `PATCH /api/v1/quotes/:id` | Authenticated create; admin list/reply | Contact, manager, dashboard | Injection, auth, invalid body | MIGRATED for existing operations |
| Projects | none (source content only) | Source arrays | unchanged | none | n/a | unchanged | n/a | BLOCKED: no delivery-project data model |
| Contracts | `contracts` | Admin/customer browser writes | API transactions | `GET /api/v1/business/contracts`, `POST /api/v1/contracts`, `PATCH /api/v1/contracts/:id/sign` | Admin assign/list; owner sign | Manager assignment; customer signing | Auth and ownership foundation | MIGRATED existing mutations; customer real-time reads retained |
| Invoices | `invoices` | Admin browser list; Stripe server writes | API admin list; legacy Stripe writes | `GET /api/v1/business/invoices` | Admin | Manager/dashboard | Admin/empty | PARTIAL pending Stripe phase |
| Payments | `payments` | Admin browser list; Stripe server writes | API admin list; legacy Stripe writes | `GET /api/v1/business/payments` | Admin | Manager/dashboard | Admin/empty | PARTIAL; provider reconciliation remains legacy |
| Messages | `messages` | Browser list/update | API admin list/update | `GET /api/v1/business/messages`, `PATCH /api/v1/messages/:id/read` | Admin | Manager/dashboard | Admin/invalid ID | MIGRATED existing admin operations; customer real-time reads retained |
| Notifications | `notifications` | Browser scoped reads | API owner list/read plus admin list | `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, admin collection route | Owner/admin | Typed client ready; current customer real-time view retained | Ownership denial | PARTIAL frontend read migration deferred to preserve realtime UI |
| Blog/content | none (source files) | Source arrays/editors | unchanged | none | n/a | unchanged | n/a | NOT_IMPLEMENTED; no Firestore content model or real admin persistence |
| Audit | `auditLogs` | Browser admin writes/reads | API transactional writes and admin reads | `GET /api/v1/business/auditLogs` | Admin | Manager/dashboard | Admin boundary | MIGRATED for migrated operations |
| Dashboard | derived from real collections | Seven browser subscriptions | Bounded API collection reads | `GET /api/v1/admin/dashboard` plus typed lists | Admin | Dashboard | Empty zero metrics | MIGRATED; UI retains detailed list-derived metrics |

No collection was renamed and no Firestore data migration was performed.
