type LogoSize = "sm" | "md" | "lg";
const markSizes = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-14 w-14" };
const textSizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

/** Un J ouvert : une trajectoire vers la première expérience professionnelle. */
export function JoblyMark({
  size = "md",
  className = "",
}: {
  size?: LogoSize;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={`shrink-0 ${markSizes[size]} ${className}`}
    >
      <rect width="40" height="40" rx="12" fill="#4F46E5" />
      <path
        d="M24 12v13a7 7 0 0 1-14 0"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M18 12h12" stroke="white" strokeWidth="4" strokeLinecap="round" />
      <circle cx="31" cy="27" r="3" fill="#C7D2FE" />
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
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {withMark && <JoblyMark size={size} />}
      <span className={`font-display font-bold leading-none tracking-[-0.05em] ${textSizes[size]}`}>
        Jobly
      </span>
    </span>
  );
}
