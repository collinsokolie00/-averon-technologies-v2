import { AVERON_PUBLIC_METADATA } from "@averon/shared-types";
import { FirebasePageMetadataRepository } from "../domains/page-metadata/page-metadata.repository.ts";

const created = await new FirebasePageMetadataRepository().seed(Object.values(AVERON_PUBLIC_METADATA));
console.log(JSON.stringify({ migration: "averon-page-metadata-v1", created, total: Object.keys(AVERON_PUBLIC_METADATA).length }));
