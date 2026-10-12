import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { getSettings } from "@/lib/settings";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Inscription" };

export const dynamic = "force-dynamic";

export default async function InscriptionPage() {
  // Interrupteur de `/admin/parametres` ; l'action serveur refuse aussi.
  const { registrationOpen } = await getSettings("general");

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Gratuit. Les offres restent consultables sans compte."
    >
      {registrationOpen ? (
        <RegisterForm />
      ) : (
        <div>
          <p className="text-sm text-ink/70">
            Les inscriptions sont momentanément fermées. Revenez bientôt — les offres restent
            consultables sans compte.
          </p>
          <Link href="/offres" className="btn-cobalt mt-6 w-full">
            Voir les offres
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
