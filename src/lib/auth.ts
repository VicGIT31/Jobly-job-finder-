import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Durée de validité du rôle mis en cache dans le JWT. */
const ROLE_TTL_MS = 5 * 60 * 1000;

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Identifiant et mot de passe",
    credentials: {
      email: { label: "Email ou identifiant", type: "text" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const identifier =
        typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      if (!identifier || !password) return null;

      // Le champ accepte l'email (comptes candidats) comme l'identifiant court
      // (comptes internes). `username` est stocké tel quel : on compare en
      // insensible à la casse pour rester tolérant à la saisie.
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: { equals: identifier, mode: "insensitive" } }],
        },
      });
      if (!user?.passwordHash) return null;
      // Compte suspendu par un administrateur : connexion refusée.
      if (user.suspendedAt) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  providers.push(
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion",
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      // Au login, enrichit le token avec le rôle (évite une requête par page)
      if (user?.id) token.userId = user.id;

      // Le rôle est mis en cache dans le token, mais rafraîchi périodiquement :
      // sans cela, retirer les droits admin ou suspendre un compte depuis le
      // panneau n'aurait d'effet qu'à la prochaine connexion de l'intéressé.
      const checkedAt = typeof token.roleCheckedAt === "number" ? token.roleCheckedAt : 0;
      const stale = Date.now() - checkedAt > ROLE_TTL_MS;
      if (token.userId && (stale || token.role === undefined)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { role: true, suspendedAt: true },
        });
        token.role = dbUser?.suspendedAt ? "USER" : (dbUser?.role ?? "USER");
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? session.user.id;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
});
