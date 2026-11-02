/**
 * Démarre l'app Next.js et le worker BullMQ dans le même conteneur.
 * Si l'un des deux processus meurt, on arrête tout (Docker le relancera).
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import nextEnv from "@next/env";

const development = process.argv.includes("--dev");
nextEnv.loadEnvConfig(process.cwd(), development);
const children = [];
let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timeout = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill("SIGKILL");
  }, 5000);
  timeout.unref();
}

function run(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
  children.push(child);
  child.on("error", (error) => {
    console.error(`[start-all] ${name}: ${error.message}`);
    stop(1);
  });
  child.on("exit", (code) => {
    console.error(`[start-all] ${name} s'est arrêté (code ${code}), arrêt du conteneur.`);
    stop(code ?? 1);
  });
  return child;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
run("next", process.execPath, [
  resolve("node_modules/next/dist/bin/next"),
  development ? "dev" : "start",
  "-H", process.env.JOBLY_BIND_HOST ?? "127.0.0.1",
  "-p",
  process.env.PORT ?? "3000",
]);
run("worker", process.execPath, [resolve("node_modules/tsx/dist/cli.mjs"), "src/workers/index.ts"]);
