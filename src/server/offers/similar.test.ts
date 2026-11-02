import { expect, it, vi } from "vitest";
const find = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/lib/prisma", () => ({ prisma: { jobOffer: { findMany: find } } }));
import { findSimilarOffers } from "./similar";
it("garde les recommandations ASV dans leur univers et leur famille métier", async () => { await findSimilarOffers({ id: "asv", sector: "Santé animale", contractType: "CDI", universe: "ASV", jobFamily: "ASV" }); expect(find.mock.calls[0][0].where).toMatchObject({ universe: "ASV", jobFamily: "ASV", status: "ACTIVE", countryCode: "FR" }); expect(find.mock.calls[0][0].where.OR).toBeUndefined(); });
