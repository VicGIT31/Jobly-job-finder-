import { fold } from "@/lib/job-taxonomy";
import { BARISTA_AREAS, isBaristaArea } from "@/lib/barista-area";
import { classifyJob } from "../job-classifier";
import { PersonalConnector, type PersonalSourceDefinition } from "./personal";
import type { RawOffer } from "../normalize";

export const BARISTA_TERMS = [
  "barista",
  "employé coffee shop",
  "préparateur café",
  "café de spécialité",
] as const;
class BaristaConnector extends PersonalConnector {
  async fetchOffers(): Promise<RawOffer[]> {
    const offers = await super.fetchOffers();
    let uncertain = 0;
    const selected = offers.filter((offer) => {
      if (
        classifyJob(offer.title, offer.description, { company: offer.companyName }).family !==
        "BARISTA"
      )
        return false;
      const accepted = isBaristaArea(offer);
      if (!accepted && offer.latitude == null) uncertain++;
      return accepted;
    });
    if (uncertain)
      this.warnings.push(
        `${uncertain} offre(s) barista sans localisation confirmée dans les zones suivies`,
      );
    return selected;
  }
}
export function baristaConnectors() {
  return ["france-travail", "hellowork"].flatMap((provider) =>
    BARISTA_AREAS.flatMap((area) =>
      BARISTA_TERMS.map((term) => {
        const id = `${provider}-barista-${area.id}-${fold(term).replace(/ /g, "-")}`;
        const definition: PersonalSourceDefinition = {
          id,
          label: `${provider === "hellowork" ? "HelloWork" : "France Travail"} · ${term} · ${area.label}`,
          kind: provider,
          url:
            provider === "hellowork"
              ? "https://www.hellowork.com/fr-fr/emploi/recherche.html"
              : "https://candidat.francetravail.fr/offres/recherche",
          query: term,
          place: provider === "hellowork" ? area.helloWork : area.franceTravail,
          radiusKm: area.id === "haute-garonne" ? 0 : 30,
          priority: 1,
          universe: "HOSPITALITY",
          maxPages: 8,
          maxDetails: 180,
          rotatePages: true,
        };
        return { id, connector: new BaristaConnector(definition) };
      }),
    ),
  );
}
