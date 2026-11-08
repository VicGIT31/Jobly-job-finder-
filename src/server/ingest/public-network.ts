import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** N'accepte aucun littéral IP : les URLs découvertes sont des noms de sites publics. */
export function publicHttpUrl(value: string, base?: string): URL | null {
  try {
    const url = new URL(value, base);
    const host = url.hostname.toLowerCase();
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      isIP(host) ||
      host.startsWith("[") ||
      !host.includes(".") ||
      /(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)
    )
      return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0)
    );
  }
  // Autoriser uniquement l'espace IPv6 global unicast, hors documentation.
  return isIP(address) === 6 && /^[23]/i.test(address) && !/^2001:(?:db8|0:)/i.test(address);
}

export async function assertPublicTarget(url: URL): Promise<void> {
  if (!publicHttpUrl(url.href)) throw new Error("URL publique requise");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address)))
    throw new Error("Adresse réseau non publique refusée");
}
