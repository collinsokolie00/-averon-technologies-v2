# Customer project files

`projectFiles` remains the canonical Firestore metadata collection for customer deliverables. Binary objects are immutable and project-scoped in a private server-selected object store at `projects/{projectId}/deliverables/{fileId}`; the storage path is server-only.

For the current free development environment, set `PROJECT_FILE_STORAGE_PROVIDER=supabase` and configure server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`. The bucket must be private. The service-role key must never use a `VITE_` prefix or be sent to the browser. The API alone uploads objects and creates five-minute signed download URLs; customer authorization remains in the existing Averon API and Firestore project domain. Firebase Storage remains an adapter option but is not required for Supabase-backed development.

Admin uploads are authenticated, size/MIME allowlisted, associated to a server-resolved project/customer, and protected by a durable idempotency key. A visible upload writes the existing customer notification and audit collections. Customers can list only visible files through an unlocked owned project workspace. Downloads require a fresh server authorization check and return a five-minute signed URL; the server records first/latest download and count.

This phase intentionally does not provide customer uploads, public bucket URLs, file overwrite, publishing, or project-completion automation. A new revision is a new immutable file record.

For local acceptance only, `npm run dev:provision-project` idempotently provisions the existing Firebase development customer through canonical contract, invoice, payment-reconciliation, and project persistence. It is disabled in production and stores the normal project unlock password only in ignored `.env.development.local`.
