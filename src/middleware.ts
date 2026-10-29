import { NextResponse, type NextRequest } from "next/server";

/**
 * Expose le chemin demandé au rendu serveur via l'en-tête `x-pathname`.
 *
 * Les layouts de l'App Router ne reçoivent pas le pathname ; or la coque
 * racine doit savoir sur quelle page elle est pour laisser passer `/connexion`
 * et `/admin` quand le mode maintenance est actif — sinon un administrateur
 * déconnecté ne pourrait plus jamais se connecter pour le désactiver.
 *
 * Volontairement minimal : pas d'accès base ni de session ici, ce middleware
 * tourne sur l'edge à chaque requête.
 */
export function middleware(request: NextRequest) {
  if (process.env.JOBLY_DESKTOP === "1") {
    const token = process.env.JOBLY_DESKTOP_TOKEN;
    if (!token || (request.cookies.get("jobly-desktop-access")?.value !== token && request.headers.get("x-jobly-desktop-token") !== token)) {
      return NextResponse.json({ error: "Ouvrez Jobly depuis son icône." }, { status: 403 });
    }
  }
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Tout sauf les assets statiques et les fichiers d'image générés par Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
