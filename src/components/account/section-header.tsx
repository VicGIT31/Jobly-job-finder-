/** En-tête de section des pages de l'espace candidat. */
export function SectionHeader({
  id,
  title,
  description,
  aside,
}: {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink/60">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

/** État vide : pictogramme dans une tuile, message, appel à l'action. */
export function AccountEmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state mt-6">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-paper text-ink/60 shadow-card">
        {icon}
      </span>
      <p className="mt-5 text-lg font-semibold tracking-tight">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
