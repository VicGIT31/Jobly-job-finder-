export function OfferCardSkeleton() {
  return (
    <div className="animate-pulse border border-ink/20 bg-paper p-4" aria-hidden="true">
      <div className="h-3 w-24 bg-ink/10" />
      <div className="mt-2 h-6 w-3/4 bg-ink/15" />
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-16 bg-ink/10" />
        <div className="h-4 w-20 bg-ink/10" />
        <div className="h-4 w-14 bg-ink/10" />
      </div>
      <div className="mt-4 h-3 w-40 bg-ink/10" />
    </div>
  );
}

export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3" role="status" aria-label="Chargement des offres">
      {Array.from({ length: count }, (_, i) => (
        <OfferCardSkeleton key={i} />
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
