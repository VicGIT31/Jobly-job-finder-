import { getPersonalProfile } from "@/server/personal/profile";
/** Local personal context shared by the existing actions. No session or credentials. */
export async function auth() { const profile = await getPersonalProfile(); return { user: { ...profile, image: null } }; }
