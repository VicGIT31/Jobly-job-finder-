/**
 * Seed Jobly — comptes de démonstration uniquement.
 *
 * Les offres et entreprises ne sont plus fictives : elles proviennent de
 * l'ingestion temps réel des sources réelles (catalogue public gratuit), lancée
 * par le worker au démarrage puis toutes les 120 min par défaut. Voir `src/server/ingest`.
 * Ce seed reste volontairement hors-ligne et idempotent (upsert par email).
 *
 * ⚠️ Aucun compte ADMIN n'est créé ici : le mot de passe de démo est public
 * (dépôt + README), il ne doit jamais ouvrir le panneau d'administration.
 * L'administrateur est provisionné hors dépôt par `npm run admin:create`,
 * qui lit ses identifiants dans `.env` (non versionné).
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seed Jobly…");

  const passwordHash = await bcrypt.hash("jobly123", 10);
  const usersData = [
    {
      email: "camille@jobly.test",
      name: "Camille Dubois",
      role: Role.USER,
      school: "EDHEC Business School",
      graduationYear: 2026,
      headline: "Étudiante en M2 Marketing Digital",
      city: "Lille",
    },
    {
      email: "theo@jobly.test",
      name: "Théo Lefèvre",
      role: Role.USER,
      school: "INSA Lyon",
      graduationYear: 2025,
      headline: "Ingénieur logiciel junior — à la recherche d'une alternance",
      city: "Lyon",
    },
  ];
  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash, emailVerified: new Date() },
    });
  }
  console.log(`  ✔ ${usersData.length} utilisateurs de démonstration (rôle USER)`);
  console.log("  ℹ Compte administrateur : `npm run admin:create` (identifiants dans .env)");
  console.log("🌱 Seed terminé. Les offres réelles sont ingérées par le worker au démarrage.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
