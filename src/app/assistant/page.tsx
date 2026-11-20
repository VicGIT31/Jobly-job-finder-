import Link from "next/link";
import { AssistantForm } from "./form";
import { assistantStatus, availableAssistants } from "@/server/ingest/assistant-config";
import { getWelcome } from "@/server/personal/welcome";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modèle d’IA" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const [status, profile, params] = await Promise.all([assistantStatus(), getWelcome(), searchParams]);
  const welcome = params.bienvenue === "1";
  return (
    <div className="container-page national-section">
      <div className="mx-auto max-w-2xl">
        {!welcome && <Link href="/offres" className="link">Retour aux offres</Link>}
        <AssistantForm initial={status} profile={profile} welcome={welcome} providers={availableAssistants()} />
      </div>
    </div>
  );
}
