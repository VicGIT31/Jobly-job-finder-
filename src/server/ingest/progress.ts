export type SourceProgress = {
  label: string; source: string; phase: "WAITING" | "RUNNING" | "DONE" | "PARTIAL" | "FAILED" | "CANCELLED";
  fetched: number; startedAt?: string; completedAt?: string;
};
export type IngestionProgress = { cycleId: string; startedAt: string; completedAt?: string; sources: SourceProgress[] };
const state = globalThis as typeof globalThis & { joblyIngestionProgress?: IngestionProgress };
export const getIngestionProgress = () => state.joblyIngestionProgress ?? null;
export function startProgress(cycleId: string, sources: Array<{ label: string; sourceSite: string }>) {
  const progress: IngestionProgress = { cycleId, startedAt: new Date().toISOString(), sources: sources.map((source) => ({ label: source.label, source: source.sourceSite, phase: "WAITING", fetched: 0 })) };
  state.joblyIngestionProgress = progress;
  return progress;
}
export function finishProgress() {
  const progress = state.joblyIngestionProgress;
  if (!progress) return;
  progress.completedAt = new Date().toISOString();
  for (const source of progress.sources) if (["WAITING", "RUNNING"].includes(source.phase)) source.phase = "CANCELLED";
}
