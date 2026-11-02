/** Human provider names; connector identifiers remain in the ingestion records. */
export function sourceLabel(value: string) {
  if (/jysk-commerce/i.test(value)) return "JYSK";
  if (/metro-commerce/i.test(value)) return "METRO France";
  const host = value.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return ({ "hellowork.com": "HelloWork", "candidat.francetravail.fr": "France Travail", "emplois.anicura.fr": "AniCura", "recrutement-monveto.com": "Mon Véto", "nous-rejoindre.sevetys.fr": "Sevetys", "groupe.argos-veterinaire.com": "Argos Vétérinaire", "api.smartrecruiters.com": "SmartRecruiters" } as Record<string,string>)[host] ?? host;
}
