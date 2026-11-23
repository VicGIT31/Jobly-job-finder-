import { join } from "node:path";
import { app, safeStorage, shell } from "electron";
import type { ModelProvider } from "./model-provider";
import type { SubscriptionStatus } from "../src/lib/collection-assistant";

export async function personalChatGPT(directory: string): Promise<ModelProvider> {
  const { createChatGPT } = await import("@jobly/chatgpt-devkit");
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
  let catalog: { at: number; models: SubscriptionStatus["models"] } | undefined;

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
