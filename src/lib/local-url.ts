/** Next's internal request URL may use localhost; the desktop origin is fixed by the launcher. */
export function localAppUrl(path: string, fallbackOrigin: string) {
  return new URL(path, process.env.JOBLY_DESKTOP === "1" && process.env.JOBLY_LOCAL_ORIGIN ? process.env.JOBLY_LOCAL_ORIGIN : fallbackOrigin);
}
