import { AveronApiClient } from "@averon/api-client";
import { firebaseAuth } from "./firebase";

export const averonApi = new AveronApiClient({
  baseUrl: import.meta.env.VITE_AVERON_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:8787" : ""),
  getAuthToken: async (forceRefresh = false) => firebaseAuth.currentUser?.getIdToken(forceRefresh) ?? null,
});
