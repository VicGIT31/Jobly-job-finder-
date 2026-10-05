import type { Prisma } from "@prisma/client";

/** Périmètre public de Jobly, même pour les anciennes données importées. */
export const STUDENT_OFFER_WHERE = {
  contractType: { in: ["STAGE", "ALTERNANCE"] },
} satisfies Prisma.JobOfferWhereInput;

export const PUBLIC_OFFER_WHERE = {
  ...STUDENT_OFFER_WHERE,
  status: "ACTIVE",
} satisfies Prisma.JobOfferWhereInput;

export const PUBLIC_OFFER_FILTER = 'status = "ACTIVE" AND contractType IN ["STAGE", "ALTERNANCE"]';
