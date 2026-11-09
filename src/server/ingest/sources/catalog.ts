import { readFile } from "node:fs/promises";
import { z } from "zod";
import bundledSources from "../../../../config/job-sources.json";

const urlSchema = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.port &&
      !/^(localhost|.*\.(?:local|internal)|\d+\.\d+\.\d+\.\d+|\[)/i.test(url.hostname)
    );
  }, "URL HTTPS publique requise");

export const sourceDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    label: z.string().min(1),
    kind: z.enum(["html", "workday", "greenhouse", "lever", "ashby", "smartrecruiters", "recruitee", "teamtailor", "workable", "inria"]),
    priority: z.enum(["AI", "DEFAULT"]).default("DEFAULT"),
    url: urlSchema,
    company: z.string().optional(),
    enabled: z.boolean().default(true),
    listingUrls: z.array(urlSchema).default([]),
    sitemapUrls: z.array(urlSchema).default([]),
    jobUrlPattern: z.string().max(300).optional(),
    defaultCountry: z.literal("FR").optional(),
    queries: z.array(z.string().max(80)).default(["stage", "alternance", "intern", "apprentice"]),
    pagination: z
      .object({
        param: z.string(),
        start: z.number().int().min(0),
        step: z.number().int().positive(),
      })
      .optional(),
    maxPages: z.number().int().min(1).max(100).default(30),
    maxOffers: z.number().int().min(1).max(5000).default(500),
    maxSitemaps: z.number().int().min(1).max(100).default(24),
    notes: z.string().optional(),
  })
  .superRefine((source, context) => {
    const host = new URL(source.url).hostname;
    const expected: Partial<Record<string, RegExp>> = {
      workday: /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/,
      greenhouse: /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/,
      lever: /^jobs(?:\.eu)?\.lever\.co$/,
      ashby: /^jobs\.ashbyhq\.com$/,
      smartrecruiters: /^careers\.smartrecruiters\.com$/,
      recruitee: /^[a-z0-9-]+\.recruitee\.com$/,
      teamtailor: /^[a-z0-9-]+\.teamtailor\.com$/,
      workable: /^apply\.workable\.com$/,
      inria: /^(?:jobs|recrutement)\.inria\.fr$/,
    };
    if (expected[source.kind] && !expected[source.kind]!.test(host)) {
      context.addIssue({ code: "custom", message: `Domaine incompatible avec ${source.kind}` });
    }
    if (source.jobUrlPattern) {
      try {
        new RegExp(source.jobUrlPattern);
      } catch {
        context.addIssue({ code: "custom", message: "jobUrlPattern invalide" });
      }
    }
  });

export type SourceDefinition = z.infer<typeof sourceDefinitionSchema>;
const catalogSchema = z.array(sourceDefinitionSchema).superRefine((sources, context) => {
  const ids = new Set<string>();
  for (const source of sources) {
    if (ids.has(source.id))
      context.addIssue({ code: "custom", message: `ID dupliqué : ${source.id}` });
    ids.add(source.id);
  }
});

/** Un fichier utilisateur remplace le catalogue, sans changement de code. */
export async function loadSourceCatalog(): Promise<SourceDefinition[]> {
  const path = process.env.JOB_SOURCES_FILE;
  const data: unknown = path ? JSON.parse(await readFile(path, "utf8")) : bundledSources;
  const catalog = catalogSchema.parse(data);
  try {
    const { discoveredDefinitions } = await import("./discovery-store");
    const { boardEndpoint } = await import("./public-boards");
    const endpoints = new Set(catalog.map(boardEndpoint));
    const ids = new Set(catalog.map((source) => source.id));
    for (const source of await discoveredDefinitions()) {
      if (endpoints.has(boardEndpoint(source)) || ids.has(source.id)) continue;
      catalog.push(source); ids.add(source.id); endpoints.add(boardEndpoint(source));
    }
  } catch (error) { console.error("[discovery] Catalogue embarqué conservé :", error); }
  return catalog;
}
