import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <AuthCard
      title="Bon retour"
      subtitle="Connectez-vous pour retrouver vos alertes, offres et candidatures."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
