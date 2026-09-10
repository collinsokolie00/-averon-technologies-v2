import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SourceValidationResult, SourceValidationRunner } from "./frontend-source.actions.ts";
const run = promisify(execFile);
export class FixedFrontendValidationRunner implements SourceValidationRunner {
  async run(files: string[]): Promise<SourceValidationResult[]> {
    const checks: Array<{ name: SourceValidationResult["name"]; command: string; args: string[] }> = [
      { name: "typecheck", command: "npx", args: ["tsc", "-b", "--pretty", "false"] },
      { name: "lint", command: "npx", args: ["eslint", ...files] },
      { name: "test", command: "npm", args: ["run", "test:metadata"] },
      { name: "build", command: "npm", args: ["run", "build:averon"] },
    ];
    const results: SourceValidationResult[] = [];
    for (const check of checks) { try { await run(check.command, check.args, { cwd: new URL("../../../../../", import.meta.url), timeout: 120_000, maxBuffer: 2_000_000 }); results.push({ name: check.name, passed: true }); } catch { results.push({ name: check.name, passed: false }); break; } }
    return results;
  }
}
