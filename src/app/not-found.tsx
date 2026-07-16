import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="font-display text-[8rem] font-black leading-none text-cobalt">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">Page introuvable</h1>
      <p className="mx-auto mt-3 max-w-md text-ink/70">
        Cette page n'existe pas ou n'existe plus. Les offres, elles, sont bien là.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="btn-outline">
          Accueil
        </Link>
        <Link href="/offres" className="btn-cobalt">
          Voir les offres
        </Link>
      </div>
    </div>
  );
}
