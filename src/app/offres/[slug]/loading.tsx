/** Squelette de fiche offre (prioritaire sur celui du catalogue). */
export default function Loading() {
  return (
    <div className="container-page pb-8 pt-6" aria-busy="true" role="status">
      <span className="sr-only">Chargement de l&apos;offre…</span>
      <div className="skeleton h-3 w-64" />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
        <div>
          <div className="flex items-center gap-3">
            <div className="skeleton h-14 w-14 !rounded-[10px]" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-28" />
            </div>
          </div>
          <div className="skeleton mt-6 h-10 w-4/5" />
          <div className="skeleton mt-3 h-10 w-3/5" />
          <div className="skeleton mt-8 h-20 w-full !rounded-xl" />
          <div className="mt-10 space-y-3">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="skeleton h-4" style={{ width: `${92 - (i % 3) * 14}%` }} />
            ))}
          </div>
        </div>
        <div className="skeleton hidden h-80 !rounded-2xl lg:block" />
      </div>
    </div>
  );
}
