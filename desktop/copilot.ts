import { createRequire } from "node:module";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { shell } from "electron";
import type { CopilotClient } from "@microsoft/copilot-sdk";
import type { ModelProvider } from "./model-provider";

export function createCopilot(resources: string, directory: string): ModelProvider {
  const privateDirectory = join(directory, "private", "copilot");
  const workspace = join(privateDirectory, "work");
  let client: Promise<CopilotClient> | undefined;
  let connecting = false;

  async function openClient() {
    await mkdir(workspace, { recursive: true, mode: 0o700 });
    const installed = createRequire(join(resources, "copilot", "package.json"));
    const sdk = installed("@microsoft/copilot-sdk") as typeof import("@microsoft/copilot-sdk");
    const platform = `${process.platform}-${process.arch}`;
    const name = process.platform === "win32" ? "copilot-runtime.exe" : "copilot-runtime";
    const path = join(resources, "copilot", "node_modules", "@microsoft", `copilot-sdk-${platform}`, "prebuilds", platform, name);
    const env = Object.fromEntries(
      ["HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "PATH", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "LANG"]
        .map((key) => [key, process.env[key]]),
    );
    const runtime = sdk.RuntimeConnection.forSpawnedStdio({
      path, baseDirectory: privateDirectory, workingDirectory: workspace,
      env: { ...env, COPILOT_TELEMETRY_DISABLED: "true", NO_COLOR: "1" },
    });
    const instance = new sdk.CopilotClient({
      mode: "empty", runtime, github: { useLoggedInUser: true }, observability: { logLevel: "error" },
    });
    try { await instance.start(); return instance; }
    catch (error) { await instance.forceStop().catch(() => undefined); throw error; }
  }

  const getClient = () => client ??= openClient().catch((error) => { client = undefined; throw error; });

  async function status() {
    try {
      const runtime = await getClient();
      const auth = await runtime.getAuthStatus();
      const authorized = auth.isAuthenticated && auth.authType === "user";
      if (!authorized) return { connected: false, models: [], message: "Connectez votre compte GitHub pour voir les modèles de votre abonnement Copilot." };
      const models = (await runtime.listModels()).filter(({ policy }) => !policy || policy.state === "enabled");
      return {
        connected: true,
        models: models.map(({ id, name }) => ({ slug: id, displayName: name })),
        message: models.length ? undefined : "GitHub ne propose aucun modèle pour ce compte. Vérifiez votre abonnement Copilot.",
      };
    } catch {
      return { connected: false, models: [], message: "Le service Copilot est indisponible. Vous pouvez réessayer ou choisir un autre mode." };
    }
  }

  return {
    status,
    async connect() {
      if (connecting) return status();
      connecting = true;
      let runtime: CopilotClient | undefined;
      let session: Awaited<ReturnType<CopilotClient["createSession"]>> | undefined;
      let loginFlow: string | undefined;
      try {
        runtime = await getClient();
        session = await runtime.createSession({
          workingDirectory: workspace, tools: { availableTools: [] }, enableConfigDiscovery: false,
          permissions: { onRequest: async () => ({ kind: "denied-by-rules", rules: [] }) },
        });
        const login = session.rpc.accounts.login;
        const { flowId, step } = await login.begin({ kind: "githubDotCom", method: "web" });
        loginFlow = flowId;
        let next = step;
        for (let i = 0; i < 4; i++) {
          if (next.kind === "completed" && next.result.status === "completed") return status();
          if (next.kind === "open-url") {
            const target = new URL(next.url);
            if (target.origin !== "https://github.com") throw new Error("Adresse d’autorisation GitHub inattendue.");
            await shell.openExternal(target.href);
          } else if (next.kind !== "awaiting") throw new Error("Connexion GitHub interrompue ou stockage sécurisé indisponible.");
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            next = await Promise.race([
              login.advance({ flowId }),
              new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Connexion GitHub expirée.")), 180_000); }),
            ]);
          } finally { clearTimeout(timer); }
        }
        throw new Error("Connexion GitHub incomplète.");
      } finally {
        if (loginFlow && session) await session.rpc.accounts.login.cancel({ flowId: loginFlow }).catch(() => undefined);
        if (session) {
          await session.disconnect().catch(() => undefined);
          await runtime?.deleteSession(session.sessionId).catch(() => undefined);
        }
        connecting = false;
      }
    },
    async classify({ model, input, instructions }, signal) {
      const runtime = await getClient();
      const session = await runtime.createSession({
        model, clientName: "Jobly", workingDirectory: workspace,
        tools: { availableTools: [] }, enableConfigDiscovery: false,
        permissions: { onRequest: async () => ({ kind: "denied-by-rules", rules: [] }) },
        systemMessage: { mode: "replace", content: instructions },
      });
      const cancel = () => { void session.abort().catch(() => undefined); };
      signal.addEventListener("abort", cancel, { once: true });
      try {
        signal.throwIfAborted();
        const answer = await session.sendAndWait({ prompt: input }, 25_000);
        signal.throwIfAborted();
        const content = answer?.data.content;
        if (!content || content.length > 6500) throw new Error("Réponse Copilot invalide.");
        return content;
      } finally {
        signal.removeEventListener("abort", cancel);
        await session.disconnect().catch(() => undefined);
        await runtime.deleteSession(session.sessionId).catch(() => undefined);
      }
    },
    close() { void client?.then((runtime) => runtime.forceStop()).catch(() => undefined); },
  };
}
