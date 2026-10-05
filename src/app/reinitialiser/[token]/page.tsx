import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ReinitialiserPage({
  params: pendingParams,
  searchParams: pendingSearchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await pendingParams;
  const searchParams = await pendingSearchParams;
  return (
    <AuthCard title="Nouveau mot de passe">
      <ResetForm token={params.token} email={searchParams.email ?? ""} />
    </AuthCard>
  );
}
