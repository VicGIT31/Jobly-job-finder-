/**
 * Démarre l'app Next.js et le worker BullMQ dans le même conteneur.
 * Si l'un des deux processus meurt, on arrête tout (Docker le relancera).
 */
import { spawn } from "node:child_process";

function run(name, cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    console.error(`[start-all] ${name} s'est arrêté (code ${code}), arrêt du conteneur.`);
    process.exit(code ?? 1);
  });
  return child;
}

run("next", "npx", ["next", "start", "-p", "3000"]);
run("worker", "npx", ["tsx", "src/workers/index.ts"]);
