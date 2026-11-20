export const MODEL_ASSISTANTS = ["chatgpt", "copilot", "ollama"] as const;
export type RemoteAssistant = (typeof MODEL_ASSISTANTS)[number];
export type AssistantProvider = "local" | RemoteAssistant;
export type AssistantSettings = { provider: AssistantProvider; model: string; dailyCalls: number; callsToday: number };
export type SubscriptionStatus = { connected: boolean; models: { slug: string; displayName: string }[]; message?: string };
