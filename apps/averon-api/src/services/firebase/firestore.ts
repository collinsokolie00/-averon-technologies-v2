import type {
  DocumentData,
  DocumentReference,
  Firestore,
  Query,
  QueryDocumentSnapshot,
  Transaction,
} from "firebase-admin/firestore";
import { ApiError } from "../../errors/api-error.ts";
import { getFirebaseAdminServices } from "./admin.ts";

export interface FirestoreDocument<T> { id: string; data: T }

function mapFirestoreError(caught: unknown): ApiError {
  const code = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : "";
  if (code.includes("not-found")) return new ApiError(404, "DOCUMENT_NOT_FOUND", "The requested record was not found.");
  if (code.includes("permission-denied")) return new ApiError(403, "DATABASE_PERMISSION_DENIED", "The database operation was denied.");
  return new ApiError(500, "DATABASE_ERROR", "The database operation failed.");
}

export class FirestoreService {
  private readonly database: Firestore;
  constructor(database: Firestore = getFirebaseAdminServices().firestore) { this.database = database; }

  async getDocument<T>(reference: DocumentReference<T>): Promise<FirestoreDocument<T> | null> {
    try {
      const snapshot = await reference.get();
      return snapshot.exists ? { id: snapshot.id, data: snapshot.data()! } : null;
    } catch (caught) { throw mapFirestoreError(caught); }
  }

  async runQuery<T extends DocumentData>(query: Query<T>): Promise<FirestoreDocument<T>[]> {
    try {
      const snapshot = await query.get();
      return snapshot.docs.map((item: QueryDocumentSnapshot<T>) => ({ id: item.id, data: item.data() }));
    } catch (caught) { throw mapFirestoreError(caught); }
  }

  async runTransaction<T>(operation: (transaction: Transaction) => Promise<T>): Promise<T> {
    try { return await this.database.runTransaction(operation); }
    catch (caught) { if (caught instanceof ApiError) throw caught; throw mapFirestoreError(caught); }
  }

  serverTimestamp() { return getFirebaseAdminServices().serverTimestamp(); }
}
