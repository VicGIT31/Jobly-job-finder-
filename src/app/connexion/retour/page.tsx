import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** Retour OAuth : appliquer le même accueil selon le rôle que la connexion locale. */
export default async function LoginReturnPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  redirect(session.user.role === "ADMIN" ? "/admin" : "/mon-espace");
}
