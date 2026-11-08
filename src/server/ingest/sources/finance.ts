import { fold } from "@/lib/job-taxonomy";
import { PersonalConnector, type PersonalSourceDefinition } from "./personal";

/** Requêtes nationales, jamais réécrites par la zone de recherche personnelle. */
export const FINANCE_TERMS = [
  "BTS assurance",
  "assurance",
  "gestionnaire sinistres",
  "actuariat",
  "banque",
  "conseiller bancaire",
  "finance",
  "contrôle de gestion",
  "comptabilité",
  "audit financier",
  "conformité bancaire",
  "gestion de patrimoine",
  "asset management",
] as const;
export function financeConnectors() {
  return ["france-travail", "hellowork"].flatMap((provider) =>
    FINANCE_TERMS.flatMap((term) =>
      ["stage", "alternance"].map((contract) => {
        const id = `${provider}-finance-${contract}-${fold(term).replace(/ /g, "-")}`;
        const definition: PersonalSourceDefinition = {
          id,
          label: `${provider === "hellowork" ? "HelloWork" : "France Travail"} · ${contract} ${term} · France`,
          kind: provider,
          url:
            provider === "hellowork"
              ? "https://www.hellowork.com/fr-fr/emploi/recherche.html"
              : "https://candidat.francetravail.fr/offres/recherche",
          query: `${contract} ${term}`,
          priority: 1,
          universe: "FINANCE",
          maxPages: 8,
          maxDetails: 180,
          rotatePages: true,
        };
        return { id, connector: new PersonalConnector(definition) };
      }),
    ),
  );
}
