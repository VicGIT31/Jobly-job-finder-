"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOffersToSearch } from "@/server/search/sync";

async function requireAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

/** Modération : désactive (EXPIRED) ou réactive (ACTIVE) une offre + sync index. */
export async function toggleOfferStatus(offerId: string): Promise<void> {
  if (!(await requireAdmin())) return;

  const offer = await prisma.jobOffer.findUnique({ where: { id: offerId } });
  if (!offer) return;

  const updated = await prisma.jobOffer.update({
    where: { id: offerId },
    data: {
      status: offer.status === "ACTIVE" ? "EXPIRED" : "ACTIVE",
      ...(offer.status === "EXPIRED" ? { lastSeenAt: new Date() } : {}),
    },
    include: { company: true },
  });

  try {
    await syncOffersToSearch([updated]);
  } catch (err) {
    console.error("[admin] Sync Meilisearch échouée :", err);
  }

  revalidatePath("/admin/offres");
}
