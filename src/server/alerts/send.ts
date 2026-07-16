import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { offerMatchesSearch, parseSearchParams } from "./match";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Cron d'alertes : pour chaque recherche sauvegardée (fréquence DAILY, pas
 * d'envoi depuis 20 h), matche les offres publiées dans les dernières 24 h
 * et envoie un email récapitulatif.
 */
export async function sendDailyAlerts(now = new Date()): Promise<{ sent: number; matchedOffers: number }> {
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const resendThreshold = new Date(now.getTime() - 20 * 3600 * 1000);

  const [searches, recentOffers] = await Promise.all([
    prisma.savedSearch.findMany({
      where: {
        frequency: "DAILY",
        OR: [{ lastSentAt: null }, { lastSentAt: { lt: resendThreshold } }],
      },
      include: { user: true },
    }),
    prisma.jobOffer.findMany({
      where: { status: "ACTIVE", publishedAt: { gte: since } },
      include: { company: true },
    }),
  ]);

  let sent = 0;
  let matchedTotal = 0;

  for (const search of searches) {
    const params = parseSearchParams(search.params);
    const matches = recentOffers.filter((offer) =>
      offerMatchesSearch(params, { ...offer, companyName: offer.company.name }),
    );
    if (matches.length === 0) continue;

    const lines = matches.map(
      (o) => `• ${o.title} — ${o.company.name}, ${o.city}\n  ${APP_URL()}/offres/${o.slug}`,
    );
    const htmlItems = matches
      .map(
        (o) =>
          `<li><a href="${APP_URL()}/offres/${o.slug}">${o.title}</a> — ${o.company.name}, ${o.city}</li>`,
      )
      .join("");

    await sendEmail({
      to: search.user.email,
      subject: `NextStep — ${matches.length} nouvelle${matches.length > 1 ? "s" : ""} offre${matches.length > 1 ? "s" : ""} pour « ${search.name} »`,
      text: `Bonjour ${search.user.name ?? ""},\n\nVotre alerte « ${search.name} » a trouvé ${matches.length} nouvelle(s) offre(s) :\n\n${lines.join("\n\n")}\n\nGérer vos alertes : ${APP_URL()}/mon-espace/alertes`,
      html: `<p>Bonjour ${search.user.name ?? ""},</p><p>Votre alerte « <strong>${search.name}</strong> » a trouvé ${matches.length} nouvelle(s) offre(s) :</p><ul>${htmlItems}</ul><p><a href="${APP_URL()}/mon-espace/alertes">Gérer vos alertes</a></p>`,
    });

    await prisma.savedSearch.update({
      where: { id: search.id },
      data: { lastSentAt: now },
    });
    sent++;
    matchedTotal += matches.length;
  }

  return { sent, matchedOffers: matchedTotal };
}
