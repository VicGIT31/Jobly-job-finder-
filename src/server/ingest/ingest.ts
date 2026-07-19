import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugifyFr } from "@/lib/slug";
import { computeDedupHash } from "./dedup";
import { normalizeOffer, rawOfferSchema, NormalizationError } from "./normalize";
import { syncOffersToSearch } from "@/server/search/sync";

export type IngestSummary = {
  received: number;
  created: number;
  updated: number;
  duplicates: number;
  rejected: number;
  errors: Array<{ index: number; reason: string }>;
};

/**
 * Pipeline d'ingestion aval : normalise, déduplique (hash unique en base),
 * indexe dans Meilisearch et trace chaque opération dans ingest_logs.
 */
export async function processIngest(
  sourceSite: string,
  rawOffers: unknown[],
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    received: rawOffers.length,
    created: 0,
    updated: 0,
    duplicates: 0,
    rejected: 0,
    errors: [],
  };

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
      normalized = normalizeOffer(parsed.data);
    } catch (err) {
      const reason = err instanceof NormalizationError ? err.message : "Normalisation impossible";
      summary.rejected++;
      summary.errors.push({ index, reason });
      await prisma.ingestLog.create({
        data: { sourceSite, result: "REJECTED", rawTitle: parsed.data.title, message: reason },
      });
      continue;
    }

    const dedupHash = computeDedupHash(normalized.title, normalized.companyName, normalized.city);
    // Attribution : la source portée par l'offre prime (agrégateur multi-sites).
    const offerSourceSite = normalized.sourceSite ?? sourceSite;

    // Offre déjà connue ? → rafraîchir last_seen_at (et réactiver si besoin)
    const existing = await prisma.jobOffer.findUnique({ where: { dedupHash } });
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
        data: {
          lastSeenAt: new Date(),
          scrapedAt: normalized.scrapedAt,
          status: "ACTIVE",
          sourceUrl: normalized.sourceUrl,
          sourceSite: offerSourceSite,
          // La date de publication réelle prime sur la date d'ingestion
          // enregistrée par défaut lors de la création.
          ...(normalized.publishedAt ? { publishedAt: normalized.publishedAt } : {}),
          // Coordonnées : rétro-remplies quand le géocodage les a trouvées
          // (indispensable au filtre « à moins de X km »).
          ...(normalized.latitude != null && normalized.longitude != null
            ? { latitude: normalized.latitude, longitude: normalized.longitude }
            : {}),
        },
        include: { company: true },
      });
      summary.duplicates++;
      await prisma.ingestLog.create({
        data: {
          sourceSite,
          result: "DUPLICATE",
          offerId: existing.id,
          dedupHash,
          rawTitle: normalized.title,
          message: "Doublon : last_seen_at rafraîchi",
        },
      });
      await safeSync([updated]);
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
        description: `${normalized.companyName} recrute sur NextStep. Cette fiche a été créée automatiquement lors de l'ingestion et sera enrichie par nos équipes.`,
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
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          remotePolicy: normalized.remotePolicy,
          salaryMin: normalized.salaryMin,
          salaryMax: normalized.salaryMax,
          educationLevel: normalized.educationLevel,
          sector: normalized.sector,
          sourceUrl: normalized.sourceUrl,
          sourceSite: offerSourceSite,
          scrapedAt: normalized.scrapedAt,
          lastSeenAt: new Date(),
          dedupHash,
          status: "ACTIVE",
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
      await safeSync([created]);
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

/** La sync Meilisearch ne doit jamais faire échouer l'ingestion (ré-indexable via search:sync). */
async function safeSync(offers: Parameters<typeof syncOffersToSearch>[0]): Promise<void> {
  try {
    await syncOffersToSearch(offers);
  } catch (err) {
    console.error("[ingest] Sync Meilisearch échouée :", err);
  }
}
