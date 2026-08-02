import { prisma } from "@/lib/prisma";
import type { AdminActor } from "./guard";

/**
 * Journal d'audit : chaque action d'administration laisse une trace
 * (qui, quoi, sur quoi, quand), consultable dans `/admin/journal`.
 *
 * L'écriture est volontairement « best-effort » : un journal indisponible ne
 * doit jamais empêcher l'action métier qu'il documente.
 */
export async function recordAudit(
  actor: AdminActor,
  action: string,
  target: string | null,
  detail?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        action,
        target,
        detail: detail?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] Journalisation impossible :", err);
  }
}
