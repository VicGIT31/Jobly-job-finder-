import { getMeili } from "@/lib/meilisearch";

/** Une tâche reçue peut encore échouer : attendre son résultat réel. */
export async function confirmSearchTask(task: { taskUid: number }): Promise<void> {
  const result = await getMeili().tasks.waitForTask(task.taskUid, {
    timeout: 60_000,
    interval: 100,
  });
  if (result.status !== "succeeded")
    throw new Error(`Indexation ${result.status} : ${result.error?.message ?? task.taskUid}`);
}
