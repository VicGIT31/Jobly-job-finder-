import "./load-env";
import { resolve, join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createBackup } from "../desktop/backup";

async function main() {
  const destination = process.argv[2];
  if (!destination?.endsWith(".jobly")) throw new Error("Usage : npm run desktop:export-web -- /chemin/sauvegarde.jobly");
  const client = new pg.Client({ connectionString: process.env.JOBLY_WEB_DATABASE_URL ?? process.env.DATABASE_URL });
  const temporary = resolve(".cache", `export-desktop-${randomUUID()}`);
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  await client.connect();
  try {
    const users = await client.query('SELECT "cvKey" FROM users WHERE "cvKey" IS NOT NULL');
    const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION ?? "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "", secretAccessKey: process.env.S3_SECRET_KEY ?? "" } });
    for (const user of users.rows) {
      const key = String(user.cvKey);
      if (key.startsWith("/") || key.split(/[\\/]/).includes("..")) throw new Error("Clé CV invalide dans la base source.");
      const response = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET_CV ?? "nextstep-cv", Key: key }));
      if (!response.Body) throw new Error("Un CV source est manquant ; export interrompu pour éviter une sauvegarde incomplète.");
      const path = join(temporary, key); await mkdir(resolve(path, ".."), { recursive: true });
      await writeFile(path, await response.Body.transformToByteArray(), { mode: 0o600 });
    }
    await createBackup(client, temporary, resolve(destination));
    console.log(`Sauvegarde privée créée : ${resolve(destination)}. Ne la joignez pas à une distribution publique.`);
  } finally { await client.end(); await rm(temporary, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Export impossible"); process.exitCode = 1; });
