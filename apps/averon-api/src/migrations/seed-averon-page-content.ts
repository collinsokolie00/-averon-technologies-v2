import { AVERON_PUBLIC_PAGE_CONTENT } from "@averon/shared-types";
import { FirebasePageContentRepository } from "../domains/page-content/page-content.repository.ts";
const created = await new FirebasePageContentRepository().seed(Object.values(AVERON_PUBLIC_PAGE_CONTENT));
console.log(JSON.stringify({ migration: "averon-page-content-v1", created, total: Object.keys(AVERON_PUBLIC_PAGE_CONTENT).length }));
