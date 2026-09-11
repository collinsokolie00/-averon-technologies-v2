import { ApiError } from "../../errors/api-error.ts";
import { adminCollections, type AdminCollection, type ContractAssignment, type CustomerProfileInput, type QuoteReply, type QuoteSubmission } from "./business.types.ts";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "VALIDATION_ERROR", "Request body must be an object.");
  return value as Record<string, unknown>;
}
function string(input: Record<string, unknown>, key: string, min: number, max: number) {
  const value = typeof input[key] === "string" ? input[key].trim() : "";
  if (value.length < min || value.length > max) throw new ApiError(400, "VALIDATION_ERROR", `${key} has an invalid length.`);
  return value;
}
function exactKeys(input: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new ApiError(400, "UNKNOWN_FIELDS", "The request contains unsupported fields.", unknown);
}
export function parseCollection(value: string): AdminCollection {
  if (!adminCollections.includes(value as AdminCollection)) throw new ApiError(404, "NOT_FOUND", "The requested business domain does not exist.");
  return value as AdminCollection;
}
export function parseId(value: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{1,127}$/.test(value)) throw new ApiError(400, "INVALID_ID", "The record identifier is invalid.");
  return value;
}
export function parseQuoteSubmission(value: unknown): QuoteSubmission {
  const input = object(value); const keys = ["customerEmail", "customerName", "company", "projectType", "budget", "message"];
  exactKeys(input, keys);
  const customerEmail = string(input, "customerEmail", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new ApiError(400, "VALIDATION_ERROR", "customerEmail must be valid.");
  return { customerEmail, customerName: string(input, "customerName", 2, 120), company: string(input, "company", 0, 160), projectType: string(input, "projectType", 2, 120), budget: string(input, "budget", 1, 80), message: string(input, "message", 10, 5000) };
}
export function parseQuoteReply(value: unknown): QuoteReply {
  const input = object(value); exactKeys(input, ["status", "adminReply", "amountCents", "currency"]);
  const status = input.status;
  if (status !== "approved" && status !== "replied" && status !== "cancelled") throw new ApiError(400, "VALIDATION_ERROR", "Quote status is invalid.");
  if (status === "approved" || input.amountCents !== undefined || input.currency !== undefined) {
    if (!Number.isSafeInteger(input.amountCents) || Number(input.amountCents) < 100 || !["eur", "usd"].includes(String(input.currency))) throw new ApiError(400, "VALIDATION_ERROR", "A commercial quote requires an amount in cents and currency.");
    if (status !== "approved") throw new ApiError(400, "VALIDATION_ERROR", "Only an approved offer may contain commercial pricing.");
    return { status, adminReply: string(input, "adminReply", 1, 5000), amountCents: Number(input.amountCents), currency: input.currency as "eur" | "usd" };
  }
  return { status, adminReply: string(input, "adminReply", 1, 5000) };
}
export function parseCustomerProfileInput(value: unknown): CustomerProfileInput {
  const input = object(value); exactKeys(input, ["name", "company", "phone", "notificationPreference", "communicationPreference", "authProvider"]);
  const authProvider = input.authProvider;
  if (authProvider !== undefined && authProvider !== "password" && authProvider !== "google") throw new ApiError(400, "VALIDATION_ERROR", "authProvider is invalid.");
  const notificationPreference = input.notificationPreference;
  if (notificationPreference !== undefined && !["important", "all", "weekly"].includes(String(notificationPreference))) throw new ApiError(400, "VALIDATION_ERROR", "notificationPreference is invalid.");
  const communicationPreference = input.communicationPreference;
  if (communicationPreference !== undefined && communicationPreference !== "email" && communicationPreference !== "portal") throw new ApiError(400, "VALIDATION_ERROR", "communicationPreference is invalid.");
  return {
    ...(input.name === undefined ? {} : { name: string(input, "name", 2, 120) }),
    ...(input.company === undefined ? {} : { company: string(input, "company", 0, 160) }),
    ...(input.phone === undefined ? {} : { phone: string(input, "phone", 0, 40) }),
    ...(notificationPreference === undefined ? {} : { notificationPreference: notificationPreference as CustomerProfileInput["notificationPreference"] }),
    ...(communicationPreference === undefined ? {} : { communicationPreference }),
    ...(authProvider === undefined ? {} : { authProvider }),
  };
}
export function parseContractAssignment(value: unknown): ContractAssignment {
  const input = object(value); const keys = ["customerId", "customerEmail", "customerName", "title", "scope", "depositAmountCents", "currency", "workspaceAccess"];
  exactKeys(input, keys); const currency = input.currency;
  if (currency !== "eur" && currency !== "usd") throw new ApiError(400, "VALIDATION_ERROR", "currency is invalid.");
  if (!Number.isInteger(input.depositAmountCents) || Number(input.depositAmountCents) < 100) throw new ApiError(400, "VALIDATION_ERROR", "depositAmountCents must be at least 100.");
  if (typeof input.workspaceAccess !== "boolean") throw new ApiError(400, "VALIDATION_ERROR", "workspaceAccess must be boolean.");
  return { customerId: parseId(String(input.customerId ?? "")), customerEmail: string(input, "customerEmail", 3, 254).toLowerCase(), customerName: string(input, "customerName", 2, 120), title: string(input, "title", 2, 200), scope: string(input, "scope", 2, 10000), depositAmountCents: Number(input.depositAmountCents), currency, workspaceAccess: input.workspaceAccess };
}
