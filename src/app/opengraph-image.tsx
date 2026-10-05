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
        justifyContent: "center",
        padding: "80px",
        background: "#FAFAFA",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <svg width="112" height="112" viewBox="0 0 40 40">
          <rect width="40" height="40" rx="12" fill="#4F46E5" />
          <path
            d="M24 12v13a7 7 0 0 1-14 0M18 12h12"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="31" cy="27" r="3" fill="#C7D2FE" />
        </svg>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#171717" }}>
          Jobly
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
        Trouvez votre première expérience tech. Postulez sur l’annonce d’origine.
      </div>
    </div>,
    size,
  );
}
