import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

import { CustomerAuthContext, type CustomerAuthContextValue, type CustomerUser } from "./customerAuthCore";
import { firebaseAuth, firebaseAuthInitialization, googleAuthProvider } from "../lib/firebase";
import { averonApi } from "../lib/averonApi";
import { developmentCustomerCredentials } from "./customerAuthPolicy";

function firebaseErrorMessage(caught: unknown) {
  if (!(caught instanceof FirebaseError)) {
    return caught instanceof Error ? caught.message : "Authentication failed.";
  }

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/internal-error": "Firebase could not complete sign-in. Please try again.",
    "auth/network-request-failed": "Google sign-in could not reach Firebase. Check your connection and try again.",
    "auth/operation-not-allowed": "This sign-in method is not enabled for this Firebase project.",
    "auth/popup-closed-by-user": "Google sign-in was closed before completion.",
    "auth/redirect-cancelled-by-user": "Google sign-in was cancelled before completion.",
    "auth/unauthorized-domain": "This local address is not authorized for Firebase sign-in.",
    "auth/weak-password": "Password must be at least 6 characters.",
  };

  return messages[caught.code] ?? caught.message;
}

function toCustomerUser(firebaseUser: User, company = "Averon Customer"): CustomerUser {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Averon Customer",
    email: firebaseUser.email ?? "",
    company,
    emailVerified: firebaseUser.emailVerified,
    portalStatus: "pending",
  };
}

async function upsertCustomerProfile(firebaseUser: User, extra?: { name?: string; company?: string; provider?: "password" | "google" }) {
  const response = await averonApi.customer.upsertProfile({ name: extra?.name, company: extra?.company, authProvider: extra?.provider });
  return { ...toCustomerUser(firebaseUser, response.data.company), name: response.data.name, email: response.data.email, emailVerified: response.data.emailVerified, portalStatus: response.data.portalStatus };
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const developmentCredentials = developmentCustomerCredentials({
    email: import.meta.env.VITE_DEV_CUSTOMER_EMAIL,
    password: import.meta.env.VITE_DEV_CUSTOMER_PASSWORD,
    hostname: window.location.hostname,
    isDevelopment: import.meta.env.DEV,
  });

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;

    void firebaseAuthInitialization
      .then((initialization) => {
        if (initialization.error) setInitializationError(firebaseErrorMessage(initialization.error));
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
          try {
            setUser(firebaseUser ? await upsertCustomerProfile(firebaseUser) : null);
          } finally {
            setLoading(false);
          }
        });
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo<CustomerAuthContextValue>(
    () => ({
      user,
      loading,
      initializationError,
      developmentLoginAvailable: Boolean(developmentCredentials),
      async login(email, password) {
        setLoading(true);
        try {
          const initialization = await firebaseAuthInitialization;
          if (initialization.error) throw initialization.error;
          const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          setUser(await upsertCustomerProfile(credential.user, { provider: "password" }));
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
      async register(payload) {
        setLoading(true);
        try {
          const initialization = await firebaseAuthInitialization;
          if (initialization.error) throw initialization.error;
          const credential = await createUserWithEmailAndPassword(firebaseAuth, payload.email, payload.password);
          await updateProfile(credential.user, { displayName: payload.name });
          await sendEmailVerification(credential.user);
          setUser(await upsertCustomerProfile(credential.user, {
            name: payload.name,
            company: payload.company || "Averon Customer",
            provider: "password",
          }));
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
      async loginWithGoogle() {
        setLoading(true);
        setInitializationError(null);
        try {
          const initialization = await firebaseAuthInitialization;
          if (initialization.error) throw initialization.error;
          const credential = await signInWithPopup(firebaseAuth, googleAuthProvider);
          setUser(await upsertCustomerProfile(credential.user, { provider: "google" }));
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
      async loginAsDevelopmentCustomer() {
        if (!developmentCredentials) throw new Error("Development customer login is unavailable.");
        setLoading(true);
        try {
          const initialization = await firebaseAuthInitialization;
          if (initialization.error) throw initialization.error;
          const credential = await signInWithEmailAndPassword(firebaseAuth, developmentCredentials.email, developmentCredentials.password);
          setUser(await upsertCustomerProfile(credential.user, { provider: "password" }));
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
      logout() {
        void signOut(firebaseAuth);
      },
      async sendPasswordReset(email) {
        setLoading(true);
        try {
          await sendPasswordResetEmail(firebaseAuth, email);
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
      async verifyEmail() {
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) return;
        setLoading(true);
        try {
          await sendEmailVerification(currentUser);
        } catch (caught) {
          throw new Error(firebaseErrorMessage(caught), { cause: caught });
        } finally {
          setLoading(false);
        }
      },
    }),
    [developmentCredentials, initializationError, loading, user],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}
