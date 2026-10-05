import { PUBLIC_OFFER_WHERE } from "@/server/offers/public-scope";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OfferCard } from "@/components/offers/offer-card";
import { offerToDocument } from "@/server/search/sync";
import { COUNTRY_FLAGS, COUNTRY_LABELS } from "@/lib/search-params";

export const dynamic = "force-dynamic";

async function getCompany(slug: string) {
  return prisma.company.findUnique({
    where: { slug },
    include: {
      offers: {
        where: PUBLIC_OFFER_WHERE,
        include: { company: true },
        orderBy: { publishedAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const params = await pendingParams;
  const company = await getCompany(params.slug);
  if (!company) return { title: "Entreprise introuvable" };
  return {
    title: `${company.name} — offres et présentation`,
    description: company.description.slice(0, 160),
  };
}

export default async function EntreprisePage({
  params: pendingParams,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = await pendingParams;
  const company = await getCompany(params.slug);
  if (!company) notFound();

  // Pays dérivés des offres actives (pas de champ dédié sur Company) —
  // affiché seulement au-delà d'un seul pays, pour ne pas ajouter de bruit
  // aux entreprises purement françaises (spec: focus Europe/France).
  const countries = Array.from(new Set(company.offers.map((o) => o.countryCode))).sort((a, b) =>
    a === "FR" ? -1 : b === "FR" ? 1 : a.localeCompare(b),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Fil d'Ariane" className="text-sm text-ink/60">
        <Link href="/entreprises" className="underline-offset-4 hover:underline">
          Entreprises
        </Link>{" "}
        / <span aria-current="page">{company.name}</span>
      </nav>

      <header className="mt-4 border-b border-ink/10 pb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-4xl font-bold tracking-tight">{company.name}</h1>
          {company.featured && <span className="stamp">À la une</span>}
        </div>
        <p className="mt-2 text-sm uppercase tracking-wider text-ink/60">
          {company.sector} · {company.size} salariés
          {company.website && (
            <>
              {" · "}
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="normal-case text-cobalt underline-offset-4 hover:underline"
              >
                Site web ↗
              </a>
            </>
          )}
        </p>
        {countries.length > 1 && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink/70">
            <span className="text-ink/50">Recrute en :</span>
            {countries.map((c) => (
              <span key={c} className="ticket">
                {c !== "FR" && <span aria-hidden="true">{COUNTRY_FLAGS[c] ?? "🌍"}</span>}
                {COUNTRY_LABELS[c] ?? c}
              </span>
            ))}
          </p>
        )}
        <p className="mt-4 max-w-3xl leading-relaxed text-ink/85">{company.description}</p>
      </header>

      <section className="mt-8" aria-labelledby="offres-entreprise">
        <h2 id="offres-entreprise" className="font-display text-2xl font-bold">
          {company.offers.length} offre{company.offers.length > 1 ? "s" : ""} active
          {company.offers.length > 1 ? "s" : ""}
        </h2>
        {company.offers.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {company.offers.map((offer) => (
              <OfferCard key={offer.id} offer={offerToDocument(offer)} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-ink/20 p-8 text-center text-ink/70">
            Aucune offre active pour le moment —{" "}
            <Link
              href="/offres"
              className="font-semibold text-cobalt underline-offset-4 hover:underline"
            >
              voir toutes les offres
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}
