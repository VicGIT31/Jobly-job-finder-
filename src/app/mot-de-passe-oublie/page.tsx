import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOubliePage() {
  return (
    <AuthCard
      title="Mot de passe oublié"
      subtitle="Pas de panique : un lien de réinitialisation suffit."
    >
      <ForgotForm />
    </AuthCard>
  );
}
