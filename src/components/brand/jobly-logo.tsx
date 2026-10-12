type LogoSize = "sm" | "md" | "lg";
const markSizes = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-14 w-14" };
const textSizes = { sm: "text-lg", md: "text-[22px]", lg: "text-4xl" };

/**
 * Monogramme Jobly : un J tracé sur un carré « volt », dont la courbe se
 * termine par un point — la trajectoire vers une première expérience.
 * Mêmes couleurs dans les deux thèmes : le vert volt reste lisible partout.
 */
export function JoblyMark({
  size = "md",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`shrink-0 ${markSizes[size]} ${className}`}
    >
      <rect width="40" height="40" rx="11" fill="#D6FF3D" />
      <path
        d="M24.5 10.5v14a7.25 7.25 0 0 1-14.5 0"
        fill="none"
        stroke="#111113"
        strokeWidth="4.25"
        strokeLinecap="round"
      />
      <circle cx="31" cy="29.5" r="3.1" fill="#111113" />
    </svg>
  );
}

export function JoblyLogo({
  size = "md",
  withMark = true,
  className = "",
}: {
  size?: LogoSize;
  withMark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {withMark && <JoblyMark size={size} />}
      <span
        className={`font-sans font-semibold leading-none tracking-[-0.055em] ${textSizes[size]}`}
      >
        jobly
      </span>
    </span>
  );
}
