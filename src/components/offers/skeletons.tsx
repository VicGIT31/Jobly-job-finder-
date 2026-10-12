export function OfferCardSkeleton() {
  return (
    <div
      className="flex items-center gap-5 rounded-xl border border-line bg-paper p-5"
      aria-hidden="true"
    >
      <div className="skeleton h-12 w-12 shrink-0 !rounded-[10px]" />
      <div className="flex-1">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton mt-2.5 h-5 w-3/4" />
        <div className="mt-3 flex gap-4">
          <div className="skeleton h-3 w-16" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-3 w-14" />
        </div>
      </div>
      <div className="hidden flex-col items-end gap-3 sm:flex">
        <div className="skeleton h-6 w-20 !rounded-full" />
        <div className="skeleton h-10 w-24 !rounded-lg" />
      </div>
    </div>
  );
}

export function ResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3" role="status" aria-label="Chargement des offres">
      {Array.from({ length: count }, (_, i) => (
        <OfferCardSkeleton key={i} />
      ))}
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
