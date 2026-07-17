import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "NextStep — Le job board des étudiants et jeunes diplômés",
    template: "%s · NextStep",
  },
  description:
    "Stages, alternances, CDI, VIE : NextStep agrège les meilleures offres pour étudiants et jeunes diplômés et vous redirige directement vers la source.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC : applique le thème avant le premier rendu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>
          <Providers>
            <SiteHeader />
            <main id="contenu" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
