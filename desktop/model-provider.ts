import type { SubscriptionStatus } from "../src/lib/collection-assistant";

export type ModelRequest = { model: string; input: string; instructions: string };
export type ModelProvider = {
  status: () => Promise<SubscriptionStatus>;
  connect?: () => Promise<SubscriptionStatus>;
  disconnect?: () => Promise<SubscriptionStatus>;
  classify: (request: ModelRequest, signal: AbortSignal) => Promise<string>;
  close?: () => void;
};
