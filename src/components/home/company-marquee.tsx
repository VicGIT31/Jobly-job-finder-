import Link from "next/link";

/**
 * Bandeau défilant des entreprises qui recrutent (données réelles). Pure CSS ;
 * se met en pause au survol/focus et s'arrête si le mouvement est réduit.
 */
export function CompanyMarquee({
  companies,
}: {
  companies: Array<{ slug: string; name: string }>;
}) {
  if (companies.length < 6) return null;
  const loop = [...companies, ...companies];
  return (
    <div
      className="mask-fade-x group relative overflow-hidden"
      aria-label="Entreprises qui recrutent"
    >
      <ul className="flex w-max animate-marquee items-center gap-12 py-2 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {loop.map((c, i) => (
          <li key={`${c.slug}-${i}`} aria-hidden={i >= companies.length || undefined}>
            <Link
              href={`/entreprises/${c.slug}`}
              tabIndex={i >= companies.length ? -1 : undefined}
              className="whitespace-nowrap text-xl font-semibold tracking-[-0.03em] text-ink/60 transition-colors duration-base hover:text-ink sm:text-2xl"
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
