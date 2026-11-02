import { getPersonalProfile } from "@/server/personal/profile";
export type AdminActor = { id: string; email: string; name: string | null };
export async function currentAdmin(): Promise<AdminActor> { return getPersonalProfile(); }
export async function requireAdminPage(_callbackUrl = "/admin"): Promise<AdminActor> { return getPersonalProfile(); }
export async function requireAdminAction(): Promise<AdminActor> { return getPersonalProfile(); }
