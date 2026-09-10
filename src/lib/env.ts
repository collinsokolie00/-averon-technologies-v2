export function cleanEnvValue(value: string | undefined) {
  return (value ?? "").trim().replace(/,+$/, "").replace(/^["']|["']$/g, "");
}

export function hasEnvValue(value: string | undefined) {
  return cleanEnvValue(value).length > 0;
}
