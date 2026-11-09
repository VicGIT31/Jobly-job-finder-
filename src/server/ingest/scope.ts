import { observeEmployerWebsite } from "./sources/discovery-store";
import { personalContract } from "./personal-offer";
import { classifyJob, isInScope } from "./job-classifier";
import { classifySpecialty } from "./classify";
import { offerMissionText } from "./offer-text";
import { aiTopics } from "./ai-topics";
import type { RawOffer } from "./normalize";
import { inferContractType, inferEducationLevel, inferRemotePolicy } from "./enrich";
import { nonStudentContractEvidence } from "./contract-evidence";
import { geocodeCity } from "./sources/geocode";
import {
  employmentContractType,
  jobLocationCity,
  jobLocationCountry,
  jsonLdText,
  type JsonLdJobPosting,
} from "./jsonld";

export const foldText = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const TECH =
  /\b(developpeu\w*|developer|software|logiciel\w*|informatique|data|devops|cloud|cyber\w*|machine learning|intelligence artificielle|ia|ai|digital\w*|numerique\w*|electronique|robotique|sap|full[ -]?stack|front[ -]?end|back[ -]?end|sre|qa|it|sysadmin|systemes? embarques?|reseaux? informatiques?|ux|ui|test[\w -]*logiciel|technico[ -]fonctionnel\w*)\b/;
const NON_TECH =
  /\b(commercial\w*|commerce|business develop\w*|sales|account executive|customer success|partner development|revenue operations|enablement|event operations|approvision\w*|achats?|stocks?|controle de gestion|export\w*|douane|communication|hse|legal|video editor|motion designer|community manager|community management|mecanique|genie civil|vendeu\w*|vente|ressources humaines|human resources|recruit\w*|rh|recrutement|comptab\w*|marketing|finance|handicap|juridique|logistique)\b/;
const TECH_TASK =
  /\b(python|javascript|typescript|sql|matlab|simulink|vhdl|verilog|fpga|power[ -]?bi|spark|hadoop|aws|azure|kubernetes|docker|linux|tensorflow|pytorch|scikit|react|angular|devops|cybersecurite|cybersecurity|sap|erp|produits? digitaux|digital product|machine learning|deep learning|intelligence artificielle|developpement logiciel|tests? (?:de |des |du )?logiciel\w*|developper.{0,80}logiciel\w*|developpement d.(?:un |une )?(?:outil|application|logiciel)|scripts? (?:python|java|sql))\b/;

/** Évite notamment « développer l'activité commerciale » et les offres RH d'une ESN. */
const TECH_ROLE =
  /\b(developpeu\w*|developer|software|logiciel\w*|informatique|data (?:analyst\w*|engineer|science|scientist)|devops|cyber\w*|machine learning|full[ -]?stack|front[ -]?end|back[ -]?end)\b/;
const SUPPORT_ROLE =
  /\b(ressources humaines|human resources|rh|hr|talent development|community manager|community management|merchandis\w*|controleur de gestion|fp&a|recrutement|recruit\w*|sales|commercial\w*|commerce|marketing|communication|douane|export\w*|legal|juridique|comptab\w*|services? et experience client|conseiller\w*|vendeu\w*|vente)\b/;
export function isTechOffer(title: string, description = ""): boolean {
  const text = foldText(title);
  if (/\b(?:licensing|intellectual property|propriete intellectuelle|juriste)\b/.test(text) && !TECH_ROLE.test(text)) return false;
  if (/\bbusiness develop\w*\b/.test(text)) return false;
  if (SUPPORT_ROLE.test(text) && !TECH_ROLE.test(text)) return false;
  if (classifySpecialty(title) !== "AUTRE" || TECH.test(text)) return true;
  if (NON_TECH.test(text)) return false;
  return TECH_TASK.test(offerMissionText(description)) || aiTopics(title, description).includes("AI_ML");
}

/** Le titre et le contrat structuré priment sur le vocabulaire du pied de page. */
export function studentContract(title: string, structured = "", description = ""): string | null {
  if (nonStudentContractEvidence(title, description)) return null;
  if (
    /\bvie\b|volontariat international|international internship (?:program|programme)/.test(
      foldText(title),
    )
  )
    return null;
  const value = foldText(structured);
  const explicit =
    /(?:contract\s*type|employment\s*type|type\s*(?:de\s*)?(?:contrat|d.emploi)|contrat)\s*[:：-]\s*(internship|intern|apprenticeship|apprentice|alternance|stage)(?:\b|(?=classe|experience|company|job|full|temps))/.exec(
      foldText(description),
    );
  if (explicit && !value) return studentContract(title, explicit[1]);
  if (
    /\b(cdi|cdd|interim|permanent|regular employee)\b/.test(value) &&
    !/(apprent|altern|contrat[ _-]*pro|intern|stage|trainee)/.test(value)
  )
    return null;
  if (/apprent|altern|contrat[ _-]*pro/.test(value)) return "alternance";
  const fromTitle = inferContractType(title);
  if (fromTitle) return fromTitle;
  if (/^intern(?:ship)?$/.test(value) && /\bcontrat (?:d.apprentissage|de professionnalisation)\b/.test(foldText(description.slice(0, 2500)))) return "alternance";
  if (/intern|stage|trainee/.test(value)) return "stage";
  if (/full[ _-]?time|part[ _-]?time|contract|freelance|regular/.test(value)) return null;
  if (/\b(cdi|cdd|permanent|regular employee)\b/.test(value)) return null;
  if (/\b(cdi|cdd|permanent)\b/.test(foldText(title))) return null;
  if (/\b(senior|experienced|staff|principal|lead)\b/.test(foldText(title))) return null;
  // « early-stage startup » ou « late stage » décrit l'entreprise, pas le contrat.
  const context = foldText(description.slice(0, 2000));
  if (
    /\b(?:en alternance|en apprentissage|contrat (?:d.apprentissage|de professionnalisation)|(?:recherche|recrute|recherchons|recrutons) (?:un.e? )?alternant\w*)\b/.test(
      context,
    )
  )
    return "alternance";
  if (
    /\b(?:stage de (?:fin|6|six)|offre de stage|contrat de stage|(?:hiring|seeking|recherchons) (?:an? |un.e? )?(?:intern|stagiaire))\b/.test(
      context,
    )
  )
    return "stage";
  return null;
}

const FRENCH_CITIES =
  /\b(paris|lyon|toulouse|bordeaux|nantes|lille|rennes|montpellier|grenoble|marseille|nice|strasbourg|aix.en.provence|blagnac|merignac|massy|saclay|palaiseau|velizy|elancourt|gennevilliers|courbevoie|puteaux|issy.les.moulineaux|boulogne.billancourt|croix|villeneuve.d.ascq|saint.ouen|saint.denis|roubaix|tourcoing|cannes|sophia.antipolis|limours|chatellerault|orleans|reims|brest|nancy|niort|chambery)\b/;
export function frenchLocation(location: string, country?: string | null): boolean {
  if (country) return ["fr", "france", "fra"].includes(foldText(country.trim()));
  const text = foldText(location);
  if (/\b(france|fr)\b/.test(text)) return true;
  // Un suffixe étranger explicite prime sur un nom de ville homonyme.
  if (
    /\b(us|usa|uk|gb|de|es|united states|united kingdom|germany|spain|belgium|switzerland|canada)\b/.test(
      text,
    )
  )
    return false;
  return FRENCH_CITIES.test(text);
}

export function validDate(value: string | number | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function publicUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function makeStudentOffer(input: {
  title: string;
  company: string;
  description: string;
  city: string;
  country?: string | null;
  contract?: string;
  url: string;
  publishedAt?: string | number;
  validThrough?: string | number;
  logo?: string;
  remote?: string;
}, options: { baristaContracts?: boolean } = {}): RawOffer | null {
  const { title, city, description } = input;
  if (!frenchLocation(city, input.country)) return null;
  const classification = classifyJob(title, description, { company: input.company });
  if (classification.universe === "OTHER") return null;
  const contract = options.baristaContracts && classification.universe === "HOSPITALITY" ? personalContract(title, input.contract, description) : studentContract(title, input.contract, description);
  const url = publicUrl(input.url);
  if (!contract || !url || description.trim().length < 20 || !input.company.trim() || !city.trim())
    return null;
  const date = validDate(input.publishedAt);
  const validThrough = validDate(input.validThrough);
  if (validThrough && validThrough.getTime() <= Date.now()) return null;
  const geo = geocodeCity(city);
  if (!isInScope(classification, contract.toUpperCase(), { city, latitude: geo?.lat, longitude: geo?.lng }).ok) return null;
  return {
    title: title.trim().slice(0, 200),
    companyName: input.company.trim().slice(0, 120),
    city: city
      .trim()
      .replace(/\s+Area$/i, "")
      .slice(0, 120),
    description: description.trim().slice(0, 12000),
    contractType: contract,
    countryCode: "FR",
    sector: classification.universe === "TECH" ? "Tech / Informatique" : classification.universe === "FINANCE" ? "Assurance / Banque / Finance" : classification.universe === "ASV" ? "Santé animale" : classification.universe === "HOSPITALITY" ? "Café / Restauration" : "Commerce / Marketing",
    sourceUrl: url,
    sourceSite: new URL(url).hostname.replace(/^www\./, ""),
    scrapedAt: new Date(),
    remotePolicy: input.remote ?? inferRemotePolicy(title, description),
    educationLevel: inferEducationLevel(title, description),
    ...(date ? { publishedAt: date } : {}),
    ...(validThrough ? { validThrough } : {}),
    ...(geo ? { latitude: geo.lat, longitude: geo.lng } : {}),
    ...(input.logo && publicUrl(input.logo) ? { companyLogoUrl: input.logo } : {}),
  };
}

export function jsonLdOffer(
  posting: JsonLdJobPosting,
  url: string,
  company?: string,
  defaultCountry?: string,
  baristaContracts = false,
): RawOffer | null {
  const employer = posting.hiringOrganization;
  for (const value of [employer?.url, ...(Array.isArray(employer?.sameAs) ? employer.sameAs : [employer?.sameAs])])
    if (typeof value === "string") observeEmployerWebsite(value, employer?.name ?? "Employeur");
  if (posting.validThrough) {
    const expiry = validDate(posting.validThrough);
    if (expiry && expiry.getTime() < Date.now()) return null;
  }
  // Choisir une localisation française quand l'annonce déclare plusieurs bureaux.
  const locations = Array.isArray(posting.jobLocation)
    ? posting.jobLocation
    : [posting.jobLocation];
  for (const location of locations) {
    const local = { ...posting, jobLocation: location };
    const country = jobLocationCountry(local) ?? defaultCountry;
    const city = jobLocationCity(local);
    if (!city) continue;
    const raw = makeStudentOffer({
      title: posting.title ?? "",
      company: posting.hiringOrganization?.name ?? company ?? "",
      city,
      country,
      description: jsonLdText(posting.description ?? ""),
      contract:
        employmentContractType(posting) ??
        (Array.isArray(posting.employmentType)
          ? posting.employmentType.join(" ")
          : posting.employmentType),
      url,
      publishedAt: posting.datePosted,
      validThrough: posting.validThrough,
      ...(typeof posting.hiringOrganization?.logo === "string"
        ? { logo: posting.hiringOrganization.logo }
        : {}),
      ...(posting.jobLocationType === "TELECOMMUTE" ? { remote: "remote" } : {}),
    }, { baristaContracts });
    if (raw) return raw;
  }
  return null;
}
