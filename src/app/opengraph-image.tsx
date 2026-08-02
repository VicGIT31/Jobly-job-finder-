import { ImageResponse } from "next/og";

/**
 * Image Open Graph par défaut de Jobly (partages LinkedIn, X, Slack…).
 * Reprend le monogramme « J »-flèche et le dégradé indigo de la marque.
 */
export const runtime = "edge";
export const alt = "Jobly — stages et alternances tech en France";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "80px",
        background: "linear-gradient(135deg, #FFFFFF 0%, #EEF2FF 100%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="112" height="112" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="55%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill="url(#badge)" />
          <g
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 10 V18.4 A4.6 4.6 0 1 1 8.8 18.4" />
            <path d="M13.4 13 L18 8.4 L22.6 13" />
          </g>
        </svg>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#171717" }}>
          Jobly<span style={{ color: "#4F46E5" }}>.</span>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 40, fontSize: 46, color: "#171717" }}>
        Stages &amp; alternances tech en France
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 18,
          fontSize: 30,
          color: "rgba(23,23,23,0.6)",
          maxWidth: 900,
        }}
      >
        Les meilleures offres du web, agrégées — et toujours un lien direct vers la source.
      </div>
    </div>,
    size,
  );
}
