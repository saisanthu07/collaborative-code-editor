import { spawn } from "node:child_process";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [
  { name: "server", args: ["run", "dev", "--prefix", "server"] },
  { name: "client", args: ["run", "dev", "--prefix", "client"] },
].map(({ name, args }) => {
  const command = process.platform === "win32" ? process.env.ComSpec : npmCommand;
  const commandArgs =
    process.platform === "win32" ? ["/d", "/s", "/c", npmCommand, ...args] : args;
  const child = spawn(command, commandArgs, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
  });

  return { name, child };
});

let shuttingDown = false;

const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of children) {
    if (!child.killed) child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

for (const { name, child } of children) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    if (code !== 0) {
      console.error(
        `[${name}] exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
      );
    }

    shutdown("SIGTERM");
    process.exitCode = code ?? 1;
  });
}
