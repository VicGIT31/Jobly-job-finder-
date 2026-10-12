import { ImageResponse } from "next/og";

/**
 * Image Open Graph par défaut de Jobly (partages LinkedIn, X, Slack…).
 * Reprend le nouveau monogramme J.
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
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "#111113",
        color: "#EDEDF0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <svg width="84" height="84" viewBox="0 0 40 40">
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
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -4 }}>
          jobly
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Stages &amp; alternances tech
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            color: "#D6FF3D",
            letterSpacing: -4,
          }}
        >
          en France.
        </div>
        <div
          style={{ display: "flex", marginTop: 28, fontSize: 30, color: "rgba(237,237,240,0.6)" }}
        >
          Trouvez votre première expérience tech. Postulez sur l’annonce d’origine.
        </div>
      </div>
    </div>,
    size,
  );
}
