import { applicationDefault, cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

export interface FirebaseAdminServices {
  app: App;
  auth: Auth;
  firestore: Firestore;
  storage: Storage;
  serverTimestamp: () => FieldValue;
}

let services: FirebaseAdminServices | undefined;

function parseServiceAccount(value: string): object {
  try {
    return JSON.parse(value) as object;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }
}

export function getFirebaseAdminServices(env: NodeJS.ProcessEnv = process.env): FirebaseAdminServices {
  if (services) return services;
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const app = getApps().length ? getApp() : initializeApp({
    credential: serviceAccountJson ? cert(parseServiceAccount(serviceAccountJson)) : applicationDefault(),
    projectId: env.FIREBASE_PROJECT_ID?.trim() || undefined,
    storageBucket: env.FIREBASE_STORAGE_BUCKET?.trim() || env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
  });
  services = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    serverTimestamp: () => FieldValue.serverTimestamp(),
  };
  return services;
}
