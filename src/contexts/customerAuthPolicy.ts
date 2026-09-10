export interface DevelopmentCustomerCredentials {
  email: string;
  password: string;
}

export function developmentCustomerCredentials(input: {
  email?: string;
  password?: string;
  hostname: string;
  isDevelopment: boolean;
}): DevelopmentCustomerCredentials | null {
  const localHost = input.hostname === "localhost" || input.hostname === "127.0.0.1" || input.hostname === "::1";
  const email = input.email?.trim();
  const password = input.password;
  if (!input.isDevelopment || !localHost || !email || !password) return null;
  return { email, password };
}
