/**
 * Provisionne (ou met à jour) le compte administrateur du site.
 *
 * Usage : `npm run admin:create`
 *
 * ⚠️ Aucun identifiant n'est écrit dans le dépôt : le script lit `.env`, qui
 * est ignoré par Git. C'est la seule façon de créer un compte ADMIN — le seed
 * de démonstration n'en crée plus (son mot de passe est public).
 *
 * Variables lues :
 *   ADMIN_USERNAME  identifiant de connexion court (requis)
 *   ADMIN_PASSWORD  mot de passe en clair, haché en bcrypt avant écriture (requis)
 *   ADMIN_EMAIL     email du compte (optionnel — `<username>@jobly.local` sinon)
 *   ADMIN_NAME      nom affiché (optionnel)
 *
 * Le script est idempotent : relancé, il remet le rôle à ADMIN, réactive le
 * compte s'il avait été suspendu et met le mot de passe à jour.
 */
import "./load-env";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** Masque une valeur sensible dans les logs : « Vic******* ». */
function mask(value: string): string {
  return value.slice(0, 3) + "*".repeat(Math.max(value.length - 3, 3));
}

async function main(): Promise<void> {
  const username = process.env.ADMIN_USERNAME?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || null;

  if (!username || !password) {
    // `--if-configured` : mode démarrage (docker-compose). Sans identifiants,
    // on ne fait rien plutôt que d'empêcher l'application de démarrer.
    if (process.argv.includes("--if-configured")) {
      console.log("ℹ Aucun identifiant administrateur configuré — provisionnement ignoré.");
      return;
    }
    console.error(
      "❌ ADMIN_USERNAME et ADMIN_PASSWORD sont requis.\n" +
        "   Renseignez-les dans votre fichier `.env` (non versionné) — voir `.env.example`.",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("❌ ADMIN_PASSWORD doit faire au moins 8 caractères.");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL?.trim() || `${username}@jobly.local`).toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  // Le compte peut déjà exister sous l'un ou l'autre identifiant : on récupère
  // celui qui correspond pour ne jamais créer de doublon.
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });

  const data = {
    email,
    username,
    name,
    passwordHash,
    role: Role.ADMIN,
    emailVerified: new Date(),
    // Un admin ne peut pas rester suspendu : re-provisionner débloque le compte.
    suspendedAt: null,
  };

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data });

  await prisma.auditLog.create({
    data: {
      actorEmail: "script:admin:create",
      action: existing ? "admin.account.updated" : "admin.account.created",
      target: user.id,
      detail: `Compte administrateur ${mask(username)} provisionné par script`,
    },
  });

  console.log(
    `✅ Compte administrateur ${existing ? "mis à jour" : "créé"} : ` +
      `${mask(username)} (rôle ADMIN, connexion sur /connexion, panneau sur /admin).`,
  );
}

main()
  .catch((err) => {
    console.error("❌ Provisionnement impossible :", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
