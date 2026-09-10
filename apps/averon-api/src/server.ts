import { createServer } from "node:http";
import { ACTION_RUNTIME_FINGERPRINT, API_RUNTIME_STARTED_AT, createRequestHandler, defaultDependencies } from "./app.ts";
import { loadServerEnvironment } from "./config/environment.ts";
import { log } from "./logger.ts";
import { ACTION_DEPENDENCY_FINGERPRINT } from "./ai/actions/action-capabilities.ts";

let config;
try { config = loadServerEnvironment(); }
catch (caught) {
  log("error", "invalid_environment", { error: caught instanceof Error ? caught.message : "Invalid environment" });
  process.exitCode = 1;
}

if (config) {
  const dependencies = defaultDependencies();
  const server = createServer(createRequestHandler({
    allowedOrigins: config.allowedOrigins,
    version: config.version,
    environment: config.environment,
    build: config.build,
  }, dependencies));
  server.listen(config.port, () => log("info", "server_started", { port: config.port, runtimeStartedAt: API_RUNTIME_STARTED_AT, actionRuntimeFingerprint: ACTION_RUNTIME_FINGERPRINT, actionDependencyFingerprint: ACTION_DEPENDENCY_FINGERPRINT, ...(config.build ? { build: config.build } : {}) }));
  let automationTickRunning = false;
  const automationWakeup = async () => { if (automationTickRunning || !dependencies.workspaceAutomationRunner) return; automationTickRunning = true; try { await dependencies.workspaceAutomationRunner.tick(); } catch { log("error", "automation_runner_tick_failed", { errorCode: "AUTOMATION_RUNNER_TICK_FAILED" }); } finally { automationTickRunning = false; } };
  const automationTimer = setInterval(() => { void automationWakeup(); }, 30_000).unref();
  void automationWakeup();

  let shuttingDown = false;
  const shutdown = (signal: string, exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(automationTimer);
    log("info", "server_stopping", { signal });
    const forcedExit = setTimeout(() => {
      log("error", "server_shutdown_timeout", { signal });
      process.exit(1);
    }, config.shutdownTimeoutMs).unref();
    server.close((error) => {
      clearTimeout(forcedExit);
      if (error) { log("error", "server_shutdown_failed", { errorCode: "SERVER_CLOSE_FAILED" }); process.exitCode = 1; }
      else { log("info", "server_stopped"); process.exitCode = exitCode; }
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", () => { log("error", "unhandled_rejection", { errorCode: "UNHANDLED_REJECTION" }); shutdown("unhandledRejection", 1); });
  process.on("uncaughtException", () => { log("error", "uncaught_exception", { errorCode: "UNCAUGHT_EXCEPTION" }); shutdown("uncaughtException", 1); });
}
