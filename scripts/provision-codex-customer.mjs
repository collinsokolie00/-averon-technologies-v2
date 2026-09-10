import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const localEnvPath = new URL("../.env.development.local", import.meta.url);

function valuesFromLocalEnv() {
  if (!existsSync(localEnvPath)) return {};
  return Object.fromEntries(readFileSync(localEnvPath, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    return match ? [[match[1].trim(), match[2].trim()]] : [];
  }));
}

const existing = valuesFromLocalEnv();
const email = existing.VITE_DEV_CUSTOMER_EMAIL || `codex.customer.${randomBytes(6).toString("hex")}@example.com`;
const password = existing.VITE_DEV_CUSTOMER_PASSWORD || randomBytes(24).toString("base64url");
const apiKey = process.env.VITE_FIREBASE_API_KEY?.trim();
if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY is required.");
const operation = existing.VITE_DEV_CUSTOMER_EMAIL ? "signInWithPassword" : "signUp";
const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(apiKey)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
if (!response.ok) {
  const payload = await response.json().catch(() => ({}));
  throw new Error(`Firebase development customer provisioning failed (${payload?.error?.message || response.status}).`);
}
const user = await response.json();

writeFileSync(localEnvPath, [
  `VITE_DEV_CUSTOMER_EMAIL=${email}`,
  `VITE_DEV_CUSTOMER_PASSWORD=${password}`,
  "",
].join("\n"), { mode: 0o600 });

console.log(`Development customer provisioned (${user.localId}); credentials stored only in ignored .env.development.local.`);
