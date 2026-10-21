import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugifyFr } from "@/lib/slug";
import { classifySpecialty } from "./classify";
import { computeDedupHash } from "./dedup";
import {
  normalizeOffer,
  rawOfferSchema,
  NormalizationError,
  type NormalizeOptions,
} from "./normalize";
import { syncOffersToSearch } from "@/server/search/sync";
import { isTechOffer } from "./scope";
import { getSettings } from "@/lib/settings";

export type IngestSummary = {
  received: number;
  created: number;
  updated: number;
  duplicates: number;
  rejected: number;
  errors: Array<{ index: number; reason: string }>;
  indexingErrors: number;
};

/**
 * Pipeline d'ingestion aval : normalise, déduplique (hash unique en base),
 * indexe dans Meilisearch et trace chaque opération dans ingest_logs.
 */
export async function processIngest(
  sourceSite: string,
  rawOffers: unknown[],
  options: NormalizeOptions = {},
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    received: rawOffers.length,
    created: 0,
    updated: 0,
    duplicates: 0,
    rejected: 0,
    errors: [],
    indexingErrors: 0,
  };
  const { maxAgeDays, freshnessDays } = await getSettings("ingestion");
  const now = new Date();
  const searchBatch: Parameters<typeof syncOffersToSearch>[0] = [];
  async function queueSearch(
    offer: Parameters<typeof syncOffersToSearch>[0][number],
  ): Promise<void> {
    searchBatch.push(offer);
    if (searchBatch.length >= 100) await flushSearch(searchBatch.splice(0));
  }

  async function flushSearch(offers: Parameters<typeof syncOffersToSearch>[0]): Promise<void> {
    if (!offers.length) return;
    try {
      await syncOffersToSearch(offers);
    } catch (error) {
      summary.indexingErrors++;
      console.error("[ingest] Indexation échouée ; réparation au prochain rapprochement :", error);
    }
  }

  try {
    for (const [index, rawInput] of rawOffers.entries()) {
      const parsed = rawOfferSchema.safeParse(rawInput);
      if (!parsed.success) {
        const reason = parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" ; ");
        summary.rejected++;
        summary.errors.push({ index, reason });
        await prisma.ingestLog.create({
          data: {
            sourceSite,
            result: "REJECTED",
            rawTitle: extractTitle(rawInput),
            message: reason.slice(0, 500),
          },
        });
        continue;
      }

      let normalized;
      try {
        normalized = normalizeOffer(parsed.data, options);
        if (normalized.validThrough && normalized.validThrough <= now)
          throw new NormalizationError("Annonce expirée à la source", "validThrough");
        if (
          normalized.publishedAt &&
          normalized.publishedAt.getTime() < now.getTime() - maxAgeDays * 86_400_000
        )
          throw new NormalizationError("Annonce trop ancienne pour être republiée", "publishedAt");
        if (normalized.publishedAt && normalized.publishedAt.getTime() > now.getTime() + 86_400_000)
          throw new NormalizationError("Date de publication future incohérente", "publishedAt");
        if (
          normalized.scrapedAt.getTime() < now.getTime() - freshnessDays * 86_400_000 ||
          normalized.scrapedAt.getTime() > now.getTime() + 300_000
        )
          throw new NormalizationError("Observation périmée ou future", "scrapedAt");
        if (
          normalized.countryCode !== "FR" ||
          !["STAGE", "ALTERNANCE"].includes(normalized.contractType) ||
          !isTechOffer(normalized.title, normalized.description)
        )
          throw new NormalizationError(
            "Offre hors périmètre : tech, France, stage ou alternance",
            "scope",
          );
      } catch (err) {
        const reason = err instanceof NormalizationError ? err.message : "Normalisation impossible";
        summary.rejected++;
        summary.errors.push({ index, reason });
        await prisma.ingestLog.create({
          data: { sourceSite, result: "REJECTED", rawTitle: parsed.data.title, message: reason },
        });
        continue;
      }

      const dedupHash = computeDedupHash(
        normalized.title,
        normalized.companyName,
        normalized.city,
        normalized.sourceUrl,
      );
      // Spécialité déduite ici plutôt que dans chaque connecteur : toute source,
      // présente ou future, est classée de la même façon.
      const specialty = classifySpecialty(normalized.title, normalized.description);
      // Attribution : la source portée par l'offre prime (agrégateur multi-sites).
      const offerSourceSite = normalized.sourceSite ?? sourceSite;

      // Offre déjà connue ? → rafraîchir last_seen_at (et réactiver si besoin)
      const existing =
        (await prisma.jobOffer.findUnique({ where: { dedupHash } })) ??
        (await prisma.jobOffer.findFirst({ where: { sourceUrl: normalized.sourceUrl } }));
      if (existing) {
        // Le logo de l'entreprise peut arriver après la création de la fiche.
        if (normalized.companyLogoUrl) {
          await prisma.company.update({
            where: { id: existing.companyId },
            data: { logoUrl: normalized.companyLogoUrl },
          });
        }
        const updated = await prisma.jobOffer.update({
          where: { id: existing.id },
          // Un extrait ne prouve ni la disponibilité ni une modification de la fiche.
          data: normalized.descriptionIsExcerpt
            ? {}
            : {
                dedupHash,
                lastSeenAt: normalized.scrapedAt,
                scrapedAt: normalized.scrapedAt,
                specialty,
                sector: normalized.sector,
                countryCode: normalized.countryCode,
                contractType: normalized.contractType,
                description: normalized.description,
                title: normalized.title,
                city: normalized.city,
                remotePolicy: normalized.remotePolicy,
                educationLevel: normalized.educationLevel,
                // La modération reste prioritaire sur le retour de l'annonce à la source.
                ...(existing.blockedAt ? {} : { status: "ACTIVE" as const }),
                sourceUrl: normalized.sourceUrl,
                sourceSite: offerSourceSite,
                ...(normalized.publishedAt ? { publishedAt: normalized.publishedAt } : {}),
                validThrough: normalized.validThrough,
                ...(normalized.salaryMin != null ? { salaryMin: normalized.salaryMin } : {}),
                ...(normalized.salaryMax != null ? { salaryMax: normalized.salaryMax } : {}),
                ...(normalized.latitude != null && normalized.longitude != null
                  ? { latitude: normalized.latitude, longitude: normalized.longitude }
                  : {}),
              },
          include: { company: true },
        });
        const changed =
          [
            "title",
            "description",
            "specialty",
            "contractType",
            "city",
            "remotePolicy",
            "educationLevel",
            "countryCode",
            "sourceUrl",
            "status",
            "salaryMin",
            "salaryMax",
            "latitude",
            "longitude",
            "sourceSite",
            "sector",
          ].some(
            (key) =>
              existing[key as keyof typeof existing] !== updated[key as keyof typeof updated],
          ) ||
          ["publishedAt", "validThrough"].some((key) => {
            const before = existing[key as "publishedAt" | "validThrough"];
            const after = updated[key as "publishedAt" | "validThrough"];
            return before?.getTime() !== after?.getTime();
          });
        if (changed) summary.updated++;
        else summary.duplicates++;
        await prisma.ingestLog.create({
          data: {
            sourceSite,
            result: changed ? "UPDATED" : "DUPLICATE",
            offerId: existing.id,
            dedupHash,
            rawTitle: normalized.title,
            message: normalized.descriptionIsExcerpt
              ? "Extrait reçu : fraîcheur et contenu complet préservés"
              : changed
                ? "Contenu actualisé et reclassé"
                : "Annonce vérifiée, contenu inchangé",
          },
        });
        await queueSearch(updated);
        continue;
      }

      // Entreprise : réutiliser si connue (slug), créer sinon
      const companySlug = slugifyFr(normalized.companyName);
      const company = await prisma.company.upsert({
        where: { slug: companySlug },
        update: normalized.companyLogoUrl ? { logoUrl: normalized.companyLogoUrl } : {},
        create: {
          name: normalized.companyName,
          slug: companySlug,
          logoUrl: normalized.companyLogoUrl,
          description: `${normalized.companyName} recrute sur Jobly. Cette fiche a été créée automatiquement lors de l'ingestion et sera enrichie par nos équipes.`,
          sector: normalized.sector,
          size: "Non renseigné",
        },
      });

      const slug = await uniqueOfferSlug(normalized.title, normalized.companyName, normalized.city);

      try {
        const created = await prisma.jobOffer.create({
          data: {
            title: normalized.title,
            slug,
            description: normalized.description,
            companyId: company.id,
            contractType: normalized.contractType,
            city: normalized.city,
            countryCode: normalized.countryCode,
            latitude: normalized.latitude,
            longitude: normalized.longitude,
            remotePolicy: normalized.remotePolicy,
            salaryMin: normalized.salaryMin,
            salaryMax: normalized.salaryMax,
            educationLevel: normalized.educationLevel,
            sector: normalized.sector,
            specialty,
            sourceUrl: normalized.sourceUrl,
            sourceSite: offerSourceSite,
            scrapedAt: normalized.scrapedAt,
            lastSeenAt: normalized.scrapedAt,
            dedupHash,
            status: "ACTIVE",
            validThrough: normalized.validThrough,
            ...(normalized.publishedAt ? { publishedAt: normalized.publishedAt } : {}),
          },
          include: { company: true },
        });
        summary.created++;
        await prisma.ingestLog.create({
          data: {
            sourceSite,
            result: "CREATED",
            offerId: created.id,
            dedupHash,
            rawTitle: normalized.title,
          },
        });
        await queueSearch(created);
      } catch (err) {
        // Course concurrente : le hash unique a été inséré entre-temps → doublon
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          summary.duplicates++;
          await prisma.ingestLog.create({
            data: {
              sourceSite,
              result: "DUPLICATE",
              dedupHash,
              rawTitle: normalized.title,
              message: "Doublon détecté par contrainte unique (insertion concurrente)",
            },
          });
        } else {
          throw err;
        }
      }
    }
  } finally {
    // Même si une écriture échoue, les offres déjà persistées sont indexées.
    await flushSearch(searchBatch);
  }

  return summary;
}

function extractTitle(rawInput: unknown): string | null {
  if (typeof rawInput === "object" && rawInput !== null && "title" in rawInput) {
    const t = (rawInput as { title: unknown }).title;
    return typeof t === "string" ? t.slice(0, 200) : null;
  }
  return null;
}

async function uniqueOfferSlug(title: string, company: string, city: string): Promise<string> {
  const base = `${slugifyFr(title)}-${slugifyFr(company)}-${slugifyFr(city)}`;
  const existing = await prisma.jobOffer.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${Date.now().toString(36)}`;
}
