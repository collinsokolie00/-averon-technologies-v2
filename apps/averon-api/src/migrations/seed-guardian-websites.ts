import { FirebaseGuardianRepository } from "../domains/guardian/guardian.repository.ts";
import { initialGuardianWebsites } from "../domains/guardian/guardian.service.ts";

const repository = new FirebaseGuardianRepository();
let created = 0;
let preserved = 0;
for (const website of initialGuardianWebsites(process.env)) {
  if (!website.baseUrl) continue;
  const existing = await repository.getWebsite(website.workspaceId, website.id);
  if (existing) { preserved += 1; continue; }
  await repository.saveWebsite(website);
  created += 1;
}
console.log(JSON.stringify({ migration: "guardian-websites-v1", created, preserved }));
