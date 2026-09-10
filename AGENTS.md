# Averon repository rules

- Preserve working behaviour and inspect existing services before creating replacements.
- Do not duplicate Emmy, authentication, database, or agent systems. Use **Emmy**, never Amy.
- Keep frontend applications free of private credentials and server-only code.
- Keep migrations incremental and record architectural changes in `docs/`.
- Run typecheck, lint, tests, and production builds after changes.
- Do not deploy without explicit authorization or weaken Firebase security.
- Do not create mock production data.
- Require approval before destructive actions or actions affecting external systems.
