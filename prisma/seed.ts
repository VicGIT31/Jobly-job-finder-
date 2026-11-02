import { getPersonalProfile } from "../src/server/personal/profile";
import { prisma } from "../src/lib/prisma";
getPersonalProfile().then(() => console.log("Profil personnel prêt ; aucune offre fictive créée.")).catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
