import { createContext } from "react";

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  company: string;
  emailVerified: boolean;
  portalStatus: "pending" | "active";
}

export interface CustomerAuthContextValue {
  user: CustomerUser | null;
  loading: boolean;
  initializationError?: string | null;
  developmentLoginAvailable?: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { name: string; email: string; company: string; password: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDevelopmentCustomer?: () => Promise<void>;
  logout: () => void;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
}

export const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);
