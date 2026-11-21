import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { join } from "node:path";
import { app, safeStorage, shell } from "electron";
import { z } from "zod";
import type { ChatGPTModel } from "./vendor/siwc/types";
import { createCopilot } from "./copilot";
import { ollama } from "./ollama";
import type { ModelProvider } from "./model-provider";
import type { RemoteAssistant } from "../src/lib/collection-assistant";

declare const JOBLY_PERSONAL_CHATGPT: boolean;

async function personalChatGPT(directory: string): Promise<ModelProvider> {
  const { createChatGPT } = await import("./vendor/siwc/index");
  const chatgpt = createChatGPT({
    appName: "Jobly",
    appId: "fr-jobly-desktop",
    sendHostId: true,
    redirectPort: 0,
    storageDir: join(directory, "private", "chatgpt"),
    credentialEncryption: {
      id: "jobly-electron-safe-storage-v1",
      isAvailable: () => app.isReady() && safeStorage.isEncryptionAvailable() &&
        (process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text"),
      encrypt: (text) => safeStorage.encryptString(text),
      decrypt: (data) => safeStorage.decryptString(Buffer.from(data)),
    },
    openBrowser: async (url) => {
      const target = new URL(url);
      if (target.origin !== "https://auth.openai.com") throw new Error("Adresse de connexion inattendue.");
      await shell.openExternal(target.href);
    },
  });
  let catalog: { at: number; models: ChatGPTModel[] } | undefined;

  async function models() {
    const session = await chatgpt.getSession();
    if (!session.sharing || session.status !== "connected") return [];
    if (catalog && Date.now() - catalog.at < 120_000) return catalog.models;
    const next = await chatgpt.listModels({ signal: AbortSignal.timeout(10_000) });
    catalog = { models: next, at: Date.now() };
    return next;
  }

  async function status() {
    const session = await chatgpt.getSession();
    const connected = session.status === "connected" && session.sharing;
    const visible = connected ? await models().catch(() => []) : [];
    return {
      connected,
      models: visible,
      message: connected && !visible.length ? "Aucun modèle disponible. Vérifiez les autorisations et les limites de votre abonnement."
        : session.status === "connected" && !session.sharing ? "Autorisez l’utilisation de votre abonnement ChatGPT pour afficher les modèles."
        : session.status === "reauth_required" ? "Reconnectez votre compte ChatGPT." : undefined,
    };
  }

  return {
    status,
    async connect() {
      catalog = undefined;
      await chatgpt.signIn({ signal: AbortSignal.timeout(5 * 60_000) });
      return status();
    },
    async disconnect() { catalog = undefined; await chatgpt.disconnect(); return status(); },
    async classify(input, signal) {
      const limit = new AbortController();
      let emitted = 0;
      const result = await chatgpt.streamResponse({
        ...input, signal: AbortSignal.any([signal, limit.signal]),
        onDelta: (delta) => { emitted += delta.length; if (emitted > 1200) limit.abort(); },
      });
      return result.text;
    },
    close() { chatgpt.cancelSignIn(); },
  };
}

export async function startSubscription(directory: string, resources: string) {
  const providers: Partial<Record<RemoteAssistant, ModelProvider>> = {
    copilot: createCopilot(resources, directory), ollama,
  };
  if (JOBLY_PERSONAL_CHATGPT) providers.chatgpt = await personalChatGPT(directory);
  const present = Object.keys(providers) as RemoteAssistant[];
  const unavailable = { connected: false, models: [] };
  const secret = randomBytes(32).toString("hex");
  const expected = Buffer.from(secret);
  const bodySchema = z.object({
    provider: z.enum(["chatgpt", "copilot", "ollama"]),
    model: z.string().min(1).max(120),
    input: z.string().min(1).max(6500),
    instructions: z.string().min(1).max(2800),
  });
  const server = createServer(async (request, response) => {
    const provided = Buffer.from(String(request.headers.authorization ?? "").replace(/^Bearer /, ""));
    if (request.method !== "POST" || request.url !== "/classify" ||
      provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      response.writeHead(403).end();
      return;
    }
    const abort = new AbortController();
    response.once("close", () => abort.abort());
    try {
      let body = "";
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 28_000) { response.writeHead(413).end(); return; }
      }
      const { provider, ...input } = bodySchema.parse(JSON.parse(body));
      const source = providers[provider];
      if (!(await source?.status())?.models.some(({ slug }) => slug === input.model)) {
        response.writeHead(409).end(); return;
      }
      const deadline = provider === "ollama" ? 85_000 : 28_000;
      const result = await source!.classify(input, AbortSignal.any([abort.signal, AbortSignal.timeout(deadline)]));
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ text: result }));
    } catch {
      if (!response.destroyed) response.writeHead(503).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Assistant local indisponible.");

  return {
    url: `http://127.0.0.1:${address.port}/classify`,
    secret,
    present,
    status: (provider: RemoteAssistant) => providers[provider]?.status() ?? Promise.resolve(unavailable),
    connect: (provider: RemoteAssistant) => providers[provider]?.connect?.() ?? providers[provider]?.status() ?? Promise.resolve(unavailable),
    disconnect: (provider: RemoteAssistant) => providers[provider]?.disconnect?.() ?? Promise.resolve(unavailable),
    close() {
      for (const provider of Object.values(providers)) provider.close?.();
      server.closeAllConnections(); server.close();
    },
  };
}
