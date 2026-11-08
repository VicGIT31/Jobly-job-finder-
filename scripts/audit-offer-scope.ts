import "./load-env";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";
import { nonStudentContractEvidence } from "../src/server/ingest/contract-evidence";
import { studentContract } from "../src/server/ingest/scope";
import { classifyJob } from "../src/server/ingest/job-classifier";
import { syncOffersToSearch } from "../src/server/search/sync";

/** Audit réversible : conserve les anciennes fiches, expire celles sans preuve fiable. */
async function main(): Promise<void> {
  const offers = await prisma.jobOffer.findMany({
    where: { status: "ACTIVE", contractType: { in: ["STAGE", "ALTERNANCE"] } },
    include: { company: true },
  });
  const changes = [];
  for (const offer of offers) {
    const evidence = nonStudentContractEvidence(offer.title, offer.description);
    const legacy = /^(?:www\.)?(?:linkedin\.com|hellowork\.com|apec\.fr)$/.test(offer.sourceSite);
    const inferred = studentContract(offer.title, "", offer.description);
    const reason =
      evidence ??
      (classifyJob(offer.title, offer.description).universe === "OTHER"
        ? "Métier non suivi"
        : legacy && !inferred
          ? "Ancien import depuis un filtre de recherche sans preuve de stage/alternance"
          : null);
    const contractType = evidence
      ? /\bcdd\b/i.test(offer.title)
        ? ("CDD" as const)
        : /freelance/i.test(offer.title)
          ? ("FREELANCE" as const)
          : ("CDI" as const)
      : inferred === "stage"
        ? ("STAGE" as const)
        : inferred === "alternance"
          ? ("ALTERNANCE" as const)
          : offer.contractType;
    if (reason || contractType !== offer.contractType)
      changes.push({
        id: offer.id,
        title: offer.title,
        sourceUrl: offer.sourceUrl,
        reason: reason ?? "Correction stage / alternance",
        before: { status: offer.status, contractType: offer.contractType },
        after: { status: reason ? ("EXPIRED" as const) : offer.status, contractType },
      });
  }
  await mkdir("reports", { recursive: true });
  const filename = `reports/scope-audit-${Date.now()}.json`;
  await writeFile(
    filename,
    JSON.stringify(
      { auditedAt: new Date().toISOString(), inspected: offers.length, changes },
      null,
      2,
    ),
  );
  console.log(
    `${offers.length} fiches contrôlées ; ${changes.filter((c) => c.after.status === "EXPIRED").length} à retirer des résultats, ${changes.filter((c) => c.after.status !== "EXPIRED").length} contrats à corriger. Sauvegarde : ${filename}`,
  );
  if (!process.argv.includes("--apply")) return;
  const updated = [];
  for (const change of changes) {
    updated.push(
      await prisma.jobOffer.update({
        where: { id: change.id },
        data: change.after,
        include: { company: true },
      }),
    );
    await prisma.ingestLog.create({
      data: {
        sourceSite: "scope-audit",
        result: "REJECTED",
        rawTitle: change.title,
        message: change.reason,
      },
    });
    if (updated.length >= 100) {
      await syncOffersToSearch(updated);
      updated.length = 0;
    }
  }
  await syncOffersToSearch(updated);
  console.log("Corrections appliquées et réindexées, sans supprimer les fiches.");
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
