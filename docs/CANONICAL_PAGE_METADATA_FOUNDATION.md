# Canonical page metadata foundation

## Source of truth

The `pageMetadata` Firestore collection is the canonical writable store for public page metadata. Records are keyed by workspace and stable page ID. The Averon API is the only server-side repository boundary and exposes a read-only public projection for the website. The public React application consumes that endpoint through one route-aware `PageMetadataManager`; page components do not manipulate the document head.

`AVERON_PUBLIC_METADATA` is migration input and a failure fallback, not an independently writable content source. The idempotent `migrate:averon-page-metadata` command creates missing canonical records without overwriting existing records. When the API returns a record it replaces the fallback in the document head.

## Identity and routes

Static IDs are `home`, `services`, `products`, `technology`, and `blog`. They map to `/`, `/services`, `/products`, `/technology`, and `/blog`. Dynamic blog pages use `blog:<slug>` and currently derive safe metadata from the existing canonical article fixture. Other dynamic product and technology routes remain deferred until their content domains expose stable canonical metadata contracts.

## Failure behavior

The frontend applies a route-specific fallback immediately, then loads the canonical record. A failed or late request does not block page rendering. Route effects ignore late responses after navigation. Head tags are maintained as singletons, so client navigation cannot duplicate description, robots, canonical, or Open Graph entries.

SEO metadata write actions are intentionally not part of this foundation. Future writes must use the same Firestore repository, workspace scope, typed metadata contract, authorization, and read-back verification.
