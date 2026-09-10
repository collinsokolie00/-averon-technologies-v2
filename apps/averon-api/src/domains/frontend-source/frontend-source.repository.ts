import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";
import type { SourceProposal } from "./frontend-source.actions.ts";

export interface FrontendSourceProposalRepository {
  get(actionId: string): Promise<SourceProposal | null>;
  save(proposal: SourceProposal): Promise<void>;
}

export class MemoryFrontendSourceProposalRepository implements FrontendSourceProposalRepository {
  private readonly records = new Map<string, SourceProposal>();
  async get(actionId: string) { return structuredClone(this.records.get(actionId) ?? null); }
  async save(proposal: SourceProposal) { this.records.set(proposal.actionId, structuredClone(proposal)); }
}

export class FirebaseFrontendSourceProposalRepository implements FrontendSourceProposalRepository {
  private readonly db;
  constructor(db = getFirebaseAdminServices().firestore) { this.db = db; }
  private collection() { return this.db.collection("sourceActionExecutions"); }
  async get(actionId: string) { const snapshot = await this.collection().doc(actionId).get(); return snapshot.exists ? snapshot.data() as SourceProposal : null; }
  async save(proposal: SourceProposal) { await this.collection().doc(proposal.actionId).set({ ...structuredClone(proposal), updatedAt: new Date().toISOString() }); }
}
