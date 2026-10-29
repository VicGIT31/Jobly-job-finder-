import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { auth } from "@/lib/auth";
import { getSettings, publicBaseUrl } from "@/lib/settings";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MaintenanceScreen } from "./maintenance-screen";

// Geist pour l'interface, Geist Mono pour les métadonnées, Instrument Serif
// (italique) pour les accents éditoriaux des titres.
const geist = localFont({ src: "./fonts/Geist.ttf", weight: "100 900", variable: "--font-geist", display: "swap" });
// Polices secondaires non préchargées : elles ne doivent pas concurrencer
// Geist sur le chemin critique (LCP).
const geistMono = localFont({
  src: "./fonts/GeistMono.ttf",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
});
const serif = localFont({
  src: "./fonts/InstrumentSerif-Italic.ttf",
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
  preload: false,
});

/**
 * Métadonnées pilotées depuis `/admin/seo` : titres, description, indexation et
 * jetons de vérification viennent de la base, avec repli sur les valeurs
 * d'usine si aucun réglage n'a encore été enregistré.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSettings("seo");
  const base = publicBaseUrl(seo);
  const keywords = seo.keywords
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

  return {
    metadataBase: new URL(base),
    title: { default: seo.defaultTitle, template: seo.titleTemplate },
    description: seo.description,
    applicationName: seo.siteName,
    ...(keywords.length > 0 ? { keywords } : {}),
    // Indexation coupée = « noindex, nofollow » global (pré-production).
    robots: seo.indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
    alternates: { canonical: base },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: seo.siteName,
      url: base,
      title: seo.defaultTitle,
      description: seo.description,
    },
    twitter: {
      card: "summary_large_image",
      ...(seo.twitterHandle ? { site: seo.twitterHandle } : {}),
    },
    verification: {
      ...(seo.googleSiteVerification ? { google: seo.googleSiteVerification } : {}),
      ...(seo.bingSiteVerification ? { other: { "msvalidate.01": seo.bingSiteVerification } } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
};

/** Chemins toujours servis, même en maintenance : sans eux, plus de retour possible. */
const MAINTENANCE_ALLOWLIST = ["/admin", "/connexion", "/api"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const general = await getSettings("general");

  // En maintenance, seuls les administrateurs (et les routes d'accès) passent.
  let maintenance = false;
  if (general.maintenanceMode) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    const allowlisted = MAINTENANCE_ALLOWLIST.some((prefix) => pathname.startsWith(prefix));
    if (!allowlisted) {
      const session = await auth();
      maintenance = session?.user?.role !== "ADMIN";
    }
  }

  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-FOUC : applique le thème avant le premier rendu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js");try{const t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>
          <Providers>
            {maintenance ? (
              <main id="contenu" className="flex-1">
                <MaintenanceScreen message={general.maintenanceMessage} />
              </main>
            ) : (
              <>
                <SiteHeader />
                <main id="contenu" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
              </>
            )}
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
