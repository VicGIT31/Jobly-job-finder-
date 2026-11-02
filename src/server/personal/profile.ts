import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

const globalState = globalThis as typeof globalThis & { personalProfilePromise?: Promise<{ id: string; name: string | null; email: string }> };
/** Legacy user rows are a migration store, never an authentication service. */
export function getPersonalProfile() {
  return globalState.personalProfilePromise ??= migratePersonalProfile().catch((error) => { globalState.personalProfilePromise = undefined; throw error; });
}
export function resetPersonalProfile() { globalState.personalProfilePromise = undefined; }
async function migratePersonalProfile() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(305030)`;
    const marker = await tx.siteSetting.findUnique({ where: { key: "personalProfile" } });
    const id = typeof marker?.value === "object" && marker.value && !Array.isArray(marker.value) ? marker.value.id : null;
    if (typeof id === "string") {
      const existing = await tx.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
      if (existing) return existing;
    }
    const users = await tx.user.findMany({ orderBy: [{ cvUploadedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }] });
    const primary = users.find((user) => !/@jobly\.(test|local)$/.test(user.email)) ?? users[0] ?? await tx.user.create({ data: { id: `personal-${randomUUID()}`, name: "Mon profil", email: "local@jobly.invalid" } });
    const secondary = users.filter((user) => user.id !== primary.id);
    const archive = secondary.map(({ passwordHash: _hash, role: _role, username: _username, suspendedAt: _suspended, ...profile }) => ({ ...profile, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString(), emailVerified: profile.emailVerified?.toISOString() ?? null, cvUploadedAt: profile.cvUploadedAt?.toISOString() ?? null }));
    for (const other of secondary) {
      for (const row of await tx.savedOffer.findMany({ where: { userId: other.id } })) await tx.savedOffer.upsert({ where: { userId_offerId: { userId: primary.id, offerId: row.offerId } }, update: {}, create: { userId: primary.id, offerId: row.offerId, createdAt: row.createdAt } });
      for (const row of await tx.hiddenOffer.findMany({ where: { userId: other.id } })) await tx.hiddenOffer.upsert({ where: { userId_offerId: { userId: primary.id, offerId: row.offerId } }, update: {}, create: { userId: primary.id, offerId: row.offerId, createdAt: row.createdAt } });
      for (const row of await tx.application.findMany({ where: { userId: other.id } })) {
        const duplicate = row.offerId ? await tx.application.findUnique({ where: { userId_offerId: { userId: primary.id, offerId: row.offerId } } }) : null;
        await tx.application.update({ where: { id: row.id }, data: { userId: primary.id, ...(duplicate ? { offerId: null } : {}) } });
      }
      await tx.savedSearch.updateMany({ where: { userId: other.id }, data: { userId: primary.id } });
      await tx.applyClick.updateMany({ where: { userId: other.id }, data: { userId: primary.id } });
      await tx.user.delete({ where: { id: other.id } });
    }
    const oldSources = await tx.siteSetting.findUnique({ where: { key: "desktopSources" } });
    if (oldSources) { await tx.siteSetting.upsert({ where: { key: "legacyDesktopSources" }, create: { key: "legacyDesktopSources", value: oldSources.value! }, update: { value: oldSources.value! } }); await tx.siteSetting.delete({ where: { key: "desktopSources" } }); }
    await tx.account.deleteMany({}); await tx.session.deleteMany({}); await tx.verificationToken.deleteMany({});
    await tx.user.update({ where: { id: primary.id }, data: { passwordHash: null, username: null, suspendedAt: null, role: "USER", emailVerified: null } });
    if (archive.length) await tx.siteSetting.upsert({ where: { key: "importedPersonalProfiles" }, create: { key: "importedPersonalProfiles", value: JSON.parse(JSON.stringify(archive)) }, update: { value: JSON.parse(JSON.stringify(archive)) } });
    await tx.siteSetting.upsert({ where: { key: "personalProfile" }, create: { key: "personalProfile", value: { id: primary.id, migrationVersion: "0.3.0" } }, update: { value: { id: primary.id, migrationVersion: "0.3.0" } } });
    return { id: primary.id, name: primary.name, email: primary.email };
  }, { timeout: 60000 });
}
