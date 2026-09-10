# Guardian v1 website health foundation

Guardian is the sixteenth production Emmy specialist. Its authority is limited to `read`, `analyze`, `draft`, and `recommend`; it cannot construct or execute Authorized Actions.

## Canonical domains

- Agent identity, skills, readiness, permissions, and certification use the existing `DefaultAgentRegistry`, `SkillRegistry`, catalog, and permission projection.
- Registered properties use `guardianWebsites`; reports use `guardianReports`; deduplicated findings use `guardianFindings`. Every record is workspace-scoped.
- Runs use the existing durable AI Diagnostics store. Findings recommend human-controlled Tasks but do not start execution.
- Existing Automations remain `CREATE_TASK` only. A weekly Guardian Task can be created, but a human must explicitly start controlled execution.

## Website configuration

Initial identities are Averon Technologies, Movento, and Lumora. URLs are read only from `AVERON_WEBSITE_URL`, `MOVENTO_WEBSITE_URL`, and `LUMORA_WEBSITE_URL` (with optional matching `*_HEALTH_ENDPOINT`). Missing URLs produce `CONFIGURATION_REQUIRED`; no URL is guessed.

After authoritative URLs are configured, run `npm run migrate:guardian-websites --workspace @averon/api` once. The migration is idempotent and preserves existing canonical website records rather than overwriting operator configuration.

Guardian v1.5 adds optional read-only Playwright inspection using an existing Chrome executable. It checks at most 10 same-origin public routes at crawl depth 1, with a 10-second page timeout and a 45-second bounded session target. It never clicks or submits controls. Assets, internal links, deterministic UI smoke, serious runtime/console errors, form structure, and desktop/mobile overflow are reported through the existing Guardian report, finding, and Diagnostics stores. If the browser is unavailable, these checks are `NOT_CHECKED`.

## Tooling truth

Direct registered-origin HTTP availability, critical-route, and configured health-endpoint checks are supported. A check passes only after a validated target reaches a terminal HTTP 2xx response. Redirects are followed manually, remain same-origin, are revalidated on every hop, and are bounded to five hops. A 3xx, timeout, network failure, unsafe target, malformed configuration, 4xx, or 5xx never becomes PASS. Asset, link, UI, and form checks are partially supported only when concrete evidence is supplied by inspection infrastructure. Browser console/runtime and responsive viewport inspection are not supported by the server checker and must be reported as `NOT_CHECKED`.

Every network target is constrained to the canonical registered HTTP(S) origin, may not contain credentials, and is checked through DNS resolution for loopback, private, link-local, metadata-service, multicast, and reserved address ranges. User text cannot supply a crawl URL. Redirect destinations repeat the same validation and cross-origin redirects fail closed.

## Severity and status

Severity is deterministic: asset/link/UI/responsive issues default to MINOR; route/form/API-health failures to MODERATE; authentication/database/widespread signatures to MAJOR; outage, destructive/data-loss, or severe-security signatures to CRITICAL. Report status is the highest evidence-backed severity: HEALTHY, DEGRADED, UNHEALTHY, or CRITICAL. A report with no executable checks is CONFIGURATION_REQUIRED.

No score is emitted, avoiding artificial precision. Duplicate OPEN findings use a deterministic website/category/target/signature fingerprint; subsequent observations update `lastSeenAt`, occurrence count, and linked Run IDs.

Meaningful findings create one deterministic, workspace-scoped maintenance Task through `WorkspaceTaskService`. The finding stores that Task ID. Repeated observations reuse it; Guardian never starts the Task, approves an action, or performs a repair. Diagnostics remain the canonical Run projection and store only safe website/report/finding IDs and per-check status/error metadata.
