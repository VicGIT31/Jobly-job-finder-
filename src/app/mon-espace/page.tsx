import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="profil-titre">
        <h2 id="profil-titre" className="font-display text-xl font-bold">
          Profil
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          Ces informations personnalisent vos alertes et votre expérience.
        </p>
        <div className="card mt-4 p-5">
          <ProfileForm
            initial={{
              name: user.name ?? "",
              headline: user.headline ?? "",
              school: user.school ?? "",
              graduationYear: user.graduationYear?.toString() ?? "",
              city: user.city ?? "",
            }}
            email={user.email}
            emailVerified={Boolean(user.emailVerified)}
          />
        </div>
      </section>

      <section aria-labelledby="cv-titre">
        <h2 id="cv-titre" className="font-display text-xl font-bold">
          CV
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          PDF uniquement, 5 Mo maximum. Votre CV reste privé.
        </p>
        <div className="card mt-4 p-5">
          <CvSection
            cvFilename={user.cvFilename}
            cvUploadedAt={user.cvUploadedAt?.toLocaleDateString("fr-FR") ?? null}
          />
        </div>
      </section>
    </div>
  );
}
