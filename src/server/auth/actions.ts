"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

/** Inscription email/mot de passe + envoi de l'email de vérification. */
export async function register(formData: FormData): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Vérifiez les champs : 8 caractères minimum pour le mot de passe." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: { email, name: parsed.data.name, passwordHash },
  });

  await sendVerificationEmail(email);

  await sendEmail({
    to: email,
    subject: "Bienvenue sur NextStep 🎯",
    text: `Bonjour ${parsed.data.name},\n\nBienvenue sur NextStep ! Créez vos alertes et sauvegardez vos offres préférées : ${APP_URL()}/offres\n\nÀ très vite.`,
    html: `<p>Bonjour ${parsed.data.name},</p><p>Bienvenue sur NextStep ! <a href="${APP_URL()}/offres">Explorez les offres</a>, créez vos alertes et sauvegardez vos favorites.</p><p>À très vite.</p>`,
  });

  return { ok: true, message: "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse." };
}

/** Génère un token de vérification et envoie l'email. */
export async function sendVerificationEmail(email: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `verify:${email}`,
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  const url = `${APP_URL()}/api/verifier-email?token=${token}&email=${encodeURIComponent(email)}`;
  await sendEmail({
    to: email,
    subject: "Confirmez votre adresse email — NextStep",
    text: `Confirmez votre adresse en ouvrant ce lien (valable 24 h) :\n${url}`,
    html: `<p>Confirmez votre adresse email en cliquant sur ce lien (valable 24 h) :</p><p><a href="${url}">Confirmer mon adresse</a></p>`,
  });
}

const emailSchema = z.string().email().max(200);

/** Demande de réinitialisation de mot de passe. */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Email invalide." };

  const email = parsed.data.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Réponse identique que le compte existe ou non (pas d'énumération d'emails)
  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        identifier: `reset:${email}`,
        token,
        expires: new Date(Date.now() + 3600 * 1000),
      },
    });
    const url = `${APP_URL()}/reinitialiser/${token}?email=${encodeURIComponent(email)}`;
    await sendEmail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — NextStep",
      text: `Réinitialisez votre mot de passe (lien valable 1 h) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      html: `<p>Réinitialisez votre mot de passe (lien valable 1 h) :</p><p><a href="${url}">Choisir un nouveau mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    });
  }

  return { ok: true, message: "Si un compte existe avec cet email, un lien vient d'être envoyé." };
}

const resetSchema = z.object({
  token: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

/** Applique un nouveau mot de passe via le token reçu par email. */
export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Mot de passe invalide (8 caractères minimum)." };
  }

  const email = parsed.data.email.toLowerCase();
  const record = await prisma.verificationToken.findUnique({
    where: { token: parsed.data.token },
  });

  if (!record || record.identifier !== `reset:${email}` || record.expires < new Date()) {
    return { ok: false, error: "Lien invalide ou expiré. Refaites une demande." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);

  return { ok: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." };
}
