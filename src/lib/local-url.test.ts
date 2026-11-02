import { afterEach, expect, it, vi } from "vitest";
import { localAppUrl } from "./local-url";
afterEach(() => vi.unstubAllEnvs());
it("garde les redirections sur le port réel du bureau et non le localhost interne de Next", () => { vi.stubEnv("JOBLY_DESKTOP","1"); vi.stubEnv("JOBLY_LOCAL_ORIGIN","http://127.0.0.1:32178"); expect(localAppUrl("/offres","http://localhost:32178").href).toBe("http://127.0.0.1:32178/offres"); });
