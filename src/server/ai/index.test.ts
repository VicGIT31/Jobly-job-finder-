import { afterEach, describe, expect, it, vi } from "vitest";
import { getAiProvider } from "./index";

describe("getAiProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retombe sur MockProvider quand ANTHROPIC_API_KEY est absente", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const provider = getAiProvider();
    expect(provider.name).toBe("mock");
    expect(provider.isRealAi).toBe(false);
  });

  it("sélectionne AnthropicProvider quand ANTHROPIC_API_KEY est configurée", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key");
    const provider = getAiProvider();
    expect(provider.name).toBe("anthropic");
    expect(provider.isRealAi).toBe(true);
  });
});
