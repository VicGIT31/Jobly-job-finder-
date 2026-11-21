import { z } from "zod";
import type { ModelProvider } from "./model-provider";

const endpoint = "http://127.0.0.1:11434";
const tags = z.object({ models: z.array(z.object({
  name: z.string(),
  remote_host: z.string().optional(),
  remote_model: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  details: z.object({ format: z.string().optional() }).optional(),
})) });

export const ollama: ModelProvider = {
  async status() {
    try {
      const response = await fetch(endpoint + "/api/tags", { redirect: "error", signal: AbortSignal.timeout(2500) });
      if (!response.ok) throw new Error();
      const { models } = tags.parse(await response.json());
      const visible = models.filter((item) => !item.remote_host && !item.remote_model &&
        !/(?:^|[:-])cloud(?:$|[-:])/i.test(item.name) && item.details?.format === "gguf" &&
        (!item.capabilities?.length || item.capabilities.includes("completion")));
      return { connected: true, models: visible.map(({ name }) => ({ slug: name, displayName: name })),
        message: visible.length ? undefined : "Aucun modèle de texte local. Installez un modèle dans Ollama puis actualisez." };
    } catch {
      return { connected: false, models: [], message: "Ouvrez Ollama sur cet ordinateur, puis actualisez les modèles." };
    }
  },
  async classify({ model, instructions, input }, signal) {
    const response = await fetch(endpoint + "/api/chat", {
      method: "POST", redirect: "error", signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model, stream: false, format: "json", think: false, keep_alive: "1m",
        messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
        options: { temperature: 0, num_predict: 300 },
      }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error("Modèle local indisponible."); }
    const { message } = z.object({ message: z.object({ content: z.string().max(6500) }) }).parse(await response.json());
    return message.content;
  },
};
