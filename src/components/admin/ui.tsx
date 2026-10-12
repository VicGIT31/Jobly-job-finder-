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
    tone === "accent" ? "text-accent" : tone === "warn" ? "text-warning" : "text-ink";
  const dot = tone === "accent" ? "bg-accent" : tone === "warn" ? "bg-warning" : "bg-ink/25";
  return (
    <div className="card p-4">
      <p className="eyebrow flex items-center gap-1.5">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </p>
      <p
        className={`mt-2.5 font-mono text-[1.75rem] font-semibold tabular-nums leading-none tracking-[-0.04em] ${valueTone}`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-ink/60">{hint}</p>}
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
      className={`whitespace-nowrap py-2.5 pr-4 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink/60 ${className}`}
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
    <div className="mb-4">
      <h2 id={id} className="text-lg font-semibold tracking-tight">
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
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | number;
  hint?: string;
  type?: string;
  rows?: number;
  placeholder?: string;
  /**
   * Les réglages validés par Zod côté serveur sont rejetés en bloc si un champ
   * obligatoire est vide ; `required` évite d'envoyer un formulaire qui serait
   * silencieusement ignoré.
   */
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="field-label">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {rows ? (
        <textarea
          id={name}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="input-ink !h-auto py-2.5 font-mono text-xs leading-relaxed"
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className="input-ink"
        />
      )}
      {hint && <p className="mt-1.5 text-xs text-ink/60">{hint}</p>}
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
    <div className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3.5 transition-colors hover:border-ink/20">
      {/* Case native conservée (envoi du formulaire), présentée en interrupteur. */}
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={name}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-ink/15 transition-colors duration-base checked:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-paper shadow-card transition-transform duration-base ease-out peer-checked:translate-x-4"
        />
      </span>
      <div>
        <label htmlFor={name} className="cursor-pointer text-sm font-medium">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-ink/60">{hint}</p>}
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
      ? "bg-accent-soft text-accent"
      : tone === "danger"
        ? "bg-danger-soft text-danger"
        : "bg-ink/[0.07] text-ink/65";
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style}`}
    >
      {children}
    </span>
  );
}
