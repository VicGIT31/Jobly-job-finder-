import { prisma } from "@/lib/prisma";
import { getPersonalProfile, resetPersonalProfile } from "./profile";

const key = "joblyWelcome";
type Welcome = { firstName: string; lastName: string; completed: boolean };

export async function getWelcome(): Promise<Welcome> {
  const [profile, row] = await Promise.all([
    getPersonalProfile(), prisma.siteSetting.findUnique({ where: { key } }),
  ]);
  const value = row?.value;
  if (value && typeof value === "object" && !Array.isArray(value) &&
      typeof value.firstName === "string" && typeof value.lastName === "string") {
    return { firstName: value.firstName, lastName: value.lastName, completed: value.completed === true };
  }
  const [firstName = "", ...rest] = profile.name && profile.name !== "Mon profil" ? profile.name.trim().split(/\s+/) : [];
  return { firstName, lastName: rest.join(" "), completed: false };
}

export async function saveWelcomeName(firstName: string, lastName: string) {
  const profile = await getPersonalProfile();
  const previous = await getWelcome();
  const value = { firstName, lastName, completed: previous.completed };
  await prisma.$transaction([
    prisma.user.update({ where: { id: profile.id }, data: { name: `${firstName} ${lastName}` } }),
    prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
  ]);
  resetPersonalProfile();
}

export async function finishWelcome() {
  const value = await getWelcome();
  if (!value.firstName || !value.lastName) return false;
  const completed = { ...value, completed: true };
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value: completed }, update: { value: completed } });
  return true;
}
