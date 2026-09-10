import { spawn } from "node:child_process";

const processes = [
  spawn("npm", ["run", "dev:api"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev:averon"], { stdio: "inherit" }),
  spawn("npm", ["run", "dev:emmy"], { stdio: "inherit" }),
];

function stop(signal) {
  for (const process of processes) process.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
await Promise.race(processes.map((process) => new Promise((resolve) => process.once("exit", resolve))));
stop("SIGTERM");
