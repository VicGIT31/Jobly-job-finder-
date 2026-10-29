/** Single local backend: volatile locks/rate limits, no separate Redis daemon. */
export class DesktopCoordinator {
  private entries = new Map<string, { value: string; expiresAt: number }>();
  private get(key: string) {
    const entry = this.entries.get(key);
    if (entry && entry.expiresAt <= Date.now()) this.entries.delete(key);
    return this.entries.get(key);
  }
  async set(key: string, value: string, _ex: "EX", seconds: number, _nx: "NX") {
    if (this.get(key)) return null;
    this.entries.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
    return "OK" as const;
  }
  async incr(key: string) {
    const entry = this.get(key);
    const count = Number(entry?.value ?? 0) + 1;
    this.entries.set(key, { value: String(count), expiresAt: entry?.expiresAt ?? Infinity });
    if (this.entries.size > 10000) for (const name of this.entries.keys()) this.get(name);
    return count;
  }
  async expire(key: string, seconds: number) {
    const entry = this.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }
  async eval(script: string, _keys: number, key: string, token: string) {
    if (this.get(key)?.value !== token) return 0;
    if (script.includes("'expire'")) return this.expire(key, 180);
    if (script.includes("'del'")) return this.entries.delete(key) ? 1 : 0;
    throw new Error("Unsupported desktop lock operation");
  }
}
