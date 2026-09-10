import type { Storage } from "firebase-admin/storage";
import { getFirebaseAdminServices } from "../../services/firebase/admin.ts";

export interface ProjectFileStorage {
  save(input: { projectId: string; fileId: string; bytes: Buffer; mimeType: string }): Promise<{ storagePath: string }>;
  signedDownload(storagePath: string, downloadName: string): Promise<{ url: string; expiresAt: string }>;
}

export class FirebaseProjectFileStorage implements ProjectFileStorage {
  private readonly storage:Storage;
  constructor(storage: Storage = getFirebaseAdminServices().storage) {this.storage=storage;}
  async save(input: { projectId: string; fileId: string; bytes: Buffer; mimeType: string }) {
    const storagePath = `projects/${input.projectId}/deliverables/${input.fileId}`;
    const object=this.storage.bucket().file(storagePath);const [exists]=await object.exists();
    if(!exists)await object.save(input.bytes, { resumable: false, metadata: { contentType: input.mimeType, metadata: { projectId: input.projectId, fileId: input.fileId } }, validation: "crc32c", preconditionOpts:{ifGenerationMatch:0} });
    return { storagePath };
  }
  async signedDownload(storagePath: string, downloadName: string) {
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const [url] = await this.storage.bucket().file(storagePath).getSignedUrl({ action: "read", expires: expiresAt, responseDisposition: `attachment; filename="${downloadName.replace(/["\\\r\n]/g, "_")}"` });
    return { url, expiresAt: expiresAt.toISOString() };
  }
}

type StorageFetch = typeof fetch;

export class SupabaseProjectFileStorage implements ProjectFileStorage {
  private readonly baseUrl: string;
  private readonly bucket: string;
  private readonly serviceRoleKey: string;
  private readonly fetcher: StorageFetch;

  constructor(input: { url: string; bucket: string; serviceRoleKey: string; fetcher?: StorageFetch }) {
    const url = new URL(input.url);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
      throw new Error("SUPABASE_URL must use HTTPS outside localhost.");
    }
    this.baseUrl = url.origin;
    this.bucket = input.bucket.trim();
    this.serviceRoleKey = input.serviceRoleKey.trim();
    this.fetcher = input.fetcher ?? fetch;
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(this.bucket) || !this.serviceRoleKey) throw new Error("Valid private Supabase Storage configuration is required.");
  }

  private objectUrl(storagePath: string, operation: "object" | "sign") {
    const path = storagePath.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}/storage/v1/object${operation === "sign" ? "/sign" : ""}/${encodeURIComponent(this.bucket)}/${path}`;
  }

  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.serviceRoleKey, authorization: `Bearer ${this.serviceRoleKey}`, ...extra };
  }

  async save(input: { projectId: string; fileId: string; bytes: Buffer; mimeType: string }) {
    const storagePath = `projects/${input.projectId}/deliverables/${input.fileId}`;
    const response = await this.fetcher(this.objectUrl(storagePath, "object"), {
      method: "POST",
      headers: this.headers({ "content-type": input.mimeType, "x-upsert": "false" }),
      body: input.bytes.buffer.slice(input.bytes.byteOffset, input.bytes.byteOffset + input.bytes.byteLength) as ArrayBuffer,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { code?: string; error?: string; message?: string };
      const duplicate = response.status === 409 || [error.code, error.error].some((value) => value === "Duplicate" || value === "KeyAlreadyExists");
      if (!duplicate) throw new Error(`Supabase Storage upload failed (${response.status}).`);
    }
    return { storagePath };
  }

  async signedDownload(storagePath: string, downloadName: string) {
    const response = await this.fetcher(this.objectUrl(storagePath, "sign"), {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify({ expiresIn: 300, download: downloadName.replace(/["\\\r\n]/g, "_") }),
    });
    const result = await response.json().catch(() => ({})) as { signedURL?: string; signedUrl?: string };
    const signed = result.signedURL ?? result.signedUrl;
    if (!response.ok || !signed) throw new Error(`Supabase Storage signing failed (${response.status}).`);
    const signedPath = signed.startsWith("/object/") ? `/storage/v1${signed}` : signed;
    return { url: new URL(signedPath, this.baseUrl).toString(), expiresAt: new Date(Date.now() + 5 * 60_000).toISOString() };
  }
}

export function configuredProjectFileStorage(env: NodeJS.ProcessEnv = process.env): ProjectFileStorage {
  const provider = env.PROJECT_FILE_STORAGE_PROVIDER?.trim().toLowerCase() || "firebase";
  if (provider === "firebase") return new FirebaseProjectFileStorage();
  if (provider !== "supabase") throw new Error("PROJECT_FILE_STORAGE_PROVIDER must be firebase or supabase.");
  const url = env.SUPABASE_URL?.trim();
  const bucket = env.SUPABASE_STORAGE_BUCKET?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !bucket || !serviceRoleKey) throw new Error("Supabase project file storage is selected but incomplete.");
  return new SupabaseProjectFileStorage({ url, bucket, serviceRoleKey });
}
