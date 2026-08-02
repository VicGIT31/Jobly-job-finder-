/**
 * Briques d'interface communes au panneau d'administration.
 * Purement présentationnelles (aucun état) : utilisables telles quelles depuis
 * les Server Components des pages `/admin`.
 */

/** Chiffre-clé du tableau de bord. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "accent" | "warn";
}) {
  const valueTone =
    tone === "accent" ? "text-cobalt" : tone === "warn" ? "text-amber-600" : "text-ink";
  return (
    <div className="card p-4">
      <p className={`font-display text-3xl font-bold tabular-nums ${valueTone}`}>{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-ink/60">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink/45">{hint}</p>}
    </div>
  );
}

/** En-tête de colonne de tableau, style unique pour tout le panneau. */
export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-ink/50 ${className}`}
    >
      {children}
    </th>
  );
}

/** Titre de section avec description optionnelle. */
export function SectionTitle({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h2 id={id} className="font-display text-xl font-bold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink/60">{description}</p>}
    </div>
  );
}

/** Champ texte d'un formulaire de réglages. */
export function Field({
  name,
  label,
  defaultValue,
  hint,
  type = "text",
  rows,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  hint?: string;
  type?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {rows ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-ink !h-auto py-2 font-mono text-xs"
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-ink"
        />
      )}
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

/** Interrupteur booléen d'un formulaire de réglages. */
export function Switch({
  name,
  label,
  defaultChecked,
  hint,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-ink/10 bg-surface p-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-cobalt"
      />
      <div>
        <label htmlFor={name} className="text-sm font-semibold">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-ink/55">{hint}</p>}
      </div>
    </div>
  );
}

/** Pastille d'état (actif / suspendu / expiré…). */
export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger";
  /** Infobulle — sert à exposer le détail d'une erreur sans alourdir le tableau. */
  title?: string;
}) {
  const style =
    tone === "accent"
      ? "bg-cobalt-soft text-cobalt dark:text-indigo-300"
      : tone === "danger"
        ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        : "bg-ink/10 text-ink/70";
  return (
    <span
      title={title}
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style}`}
    >
      {children}
    </span>
  );
}
