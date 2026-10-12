/**
 * Écran d'état plein cadre (404, offre retirée, erreur, maintenance) :
 * grand chiffre/symbole typographique, message, actions.
 */
export function StatusScreen({
  code,
  eyebrow,
  title,
  children,
  actions,
}: {
  code?: string;
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="container-page relative isolate flex min-h-[64vh] flex-col items-center justify-center py-20 text-center">
      <div
        aria-hidden="true"
        className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]"
      />
      {code && (
        <p
          aria-hidden="true"
          className="font-mono text-[clamp(5rem,3rem+10vw,10rem)] font-semibold leading-none tracking-[-0.08em] text-ink/[0.08]"
        >
          {code}
        </p>
      )}
      {eyebrow && <p className={`eyebrow ${code ? "-mt-4" : ""}`}>{eyebrow}</p>}
      <h1 className="mt-4 max-w-2xl text-display-sm font-semibold">{title}</h1>
      {children && <div className="mx-auto mt-4 max-w-md text-ink/60">{children}</div>}
      {actions && <div className="mt-9 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
