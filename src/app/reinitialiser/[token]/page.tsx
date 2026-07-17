import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function ReinitialiserPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { email?: string };
}) {
  return (
    <AuthCard title="Nouveau mot de passe">
      <ResetForm token={params.token} email={searchParams.email ?? ""} />
    </AuthCard>
  );
}
