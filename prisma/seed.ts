/**
 * Seed NextStep — comptes de démonstration uniquement.
 *
 * Les offres et entreprises ne sont plus fictives : elles proviennent de
 * l'ingestion temps réel des sources réelles (France Travail, The Muse), lancée
 * par le worker au démarrage puis toutes les 30 min. Voir `src/server/ingest`.
 * Ce seed reste volontairement hors-ligne et idempotent (upsert par email).
 */
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seed NextStep…");

  const passwordHash = await bcrypt.hash("nextstep123", 10);
  const usersData = [
    {
      email: "admin@nextstep.test",
      name: "Alex Martin",
      role: Role.ADMIN,
      school: null,
      graduationYear: null,
      headline: "Admin NextStep",
      city: "Paris",
    },
    {
      email: "camille@nextstep.test",
      name: "Camille Dubois",
      role: Role.USER,
      school: "EDHEC Business School",
      graduationYear: 2026,
      headline: "Étudiante en M2 Marketing Digital",
      city: "Lille",
    },
    {
      email: "theo@nextstep.test",
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
  console.log(`  ✔ ${usersData.length} utilisateurs`);
  console.log("🌱 Seed terminé. Les offres réelles sont ingérées par le worker au démarrage.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
