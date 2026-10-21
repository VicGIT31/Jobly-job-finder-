import { describe, expect, it, vi } from "vitest";
const wait = vi.hoisted(() => vi.fn());
vi.mock("@/lib/meilisearch", () => ({ getMeili: () => ({ tasks: { waitForTask: wait } }) }));
import { confirmSearchTask } from "./task";
describe("confirmation de l'indexation", () => {
  it("refuse une tâche acceptée puis échouée par Meilisearch", async () => {
    wait.mockResolvedValueOnce({ status: "failed", error: { message: "invalid document" } });
    await expect(confirmSearchTask({ taskUid: 12 })).rejects.toThrow("invalid document");
  });
  it("attend la réussite effective de la tâche", async () => {
    wait.mockResolvedValueOnce({ status: "succeeded" });
    await expect(confirmSearchTask({ taskUid: 13 })).resolves.toBeUndefined();
  });
});
