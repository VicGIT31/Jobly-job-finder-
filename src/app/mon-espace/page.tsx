import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { CvSection } from "./cv-section";

export const metadata: Metadata = { title: "Profil & CV" };

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/connexion");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section aria-labelledby="profil-titre" className="panel">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <UserRound aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="profil-titre" className="text-lg font-semibold tracking-tight">
              Profil
            </h2>
            <p className="mt-0.5 text-sm text-ink/60">
              Ces informations personnalisent vos alertes et votre expérience.
            </p>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-6">
          <ProfileForm
            initial={{
              name: user.name ?? "",
              headline: user.headline ?? "",
              school: user.school ?? "",
              graduationYear: user.graduationYear?.toString() ?? "",
              city: user.city ?? "",
              educationLevel: user.educationLevel ?? "",
              targetSpecialty: user.targetSpecialty ?? "",
            }}
            email={user.email}
            emailVerified={Boolean(user.emailVerified)}
          />
        </div>
      </section>

      <section aria-labelledby="cv-titre" className="panel self-start">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-volt text-volt-ink">
            <FileText aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 id="cv-titre" className="text-lg font-semibold tracking-tight">
              CV
            </h2>
            <p className="mt-0.5 text-sm text-ink/60">
              PDF uniquement, 5 Mo maximum. Votre CV reste privé.
            </p>
          </div>
        </div>
        <div className="mt-6 border-t border-line pt-6">
          <CvSection
            cvFilename={user.cvFilename}
            cvUploadedAt={user.cvUploadedAt?.toLocaleDateString("fr-FR") ?? null}
          />
        </div>
      </section>
    </div>
  );
}
