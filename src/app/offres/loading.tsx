import { ResultsSkeleton } from "@/components/offers/skeletons";

/** Squelette instantané pendant le rendu serveur du catalogue ou d'une fiche. */
export default function Loading() {
  return (
    <div className="container-page pb-8 pt-8 sm:pt-12" aria-busy="true">
      <div className="skeleton h-3 w-48" />
      <div className="skeleton mt-4 h-10 w-full max-w-lg" />
      <div className="skeleton mt-8 h-12 w-full !rounded-xl" />
      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-8" />
          ))}
        </div>
        <ResultsSkeleton count={5} />
      </div>
    </div>
  );
}
