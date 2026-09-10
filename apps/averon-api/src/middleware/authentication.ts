import { authenticateAuthorizationHeader } from "../services/auth/authentication.ts";
import type { AppDependencies, RequestContext } from "../types/http.ts";

export async function requireAuthentication(context: RequestContext, dependencies: AppDependencies) {
  context.auth = await authenticateAuthorizationHeader(context.request.headers.authorization, dependencies.tokenVerifier);
  return context.auth;
}
