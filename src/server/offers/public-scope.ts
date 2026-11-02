import type { Prisma } from "@prisma/client";

/** Périmètre public de Jobly, même pour les anciennes données importées. */
export const STUDENT_OFFER_WHERE = {
  countryCode: "FR",
} satisfies Prisma.JobOfferWhereInput;

export const PUBLIC_OFFER_WHERE = {
  ...STUDENT_OFFER_WHERE,
  status: "ACTIVE",
} satisfies Prisma.JobOfferWhereInput;

export const PUBLIC_OFFER_FILTER = 'status = "ACTIVE" AND countryCode = "FR"';
