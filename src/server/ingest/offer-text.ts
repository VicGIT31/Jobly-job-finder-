import { htmlToText } from "./html-to-text";

const foldText = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Écarte l'introduction institutionnelle et les avantages, même après 2500 caractères. */
export function offerMissionText(description: string): string {
  const body = foldText(htmlToText(description.replace(/\\[nr]/g, "\n"))).replace(/[’‘]/g, "'");
  const heading =
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:(?:vos|les|votre|principales)\s+)?(?:missions?|responsabilites|responsibilities|votre quotidien|ce que nous pouvons accomplir ensemble|your (?:role|impact|mission)|what you(?:'ll| will) do|description (?:du poste|de l'emploi)|job description|descriptif du poste)\s*[:：]?/im.exec(
      body,
    );
  const introductionEnd =
    /\b(?:vous (?:integrez|integrerez|rejoignez|rejoindrez|interviendrez|aurez pour)|au sein de (?:l'equipe|notre equipe)|dans le cadre de (?:ce|votre) stage)\b/.exec(
      body,
    );
  const englishHeading = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:about the role|the role|your responsibilities|what you(?:'ll| will) work on)\s*[:：]?/im.exec(body);
  const start = heading?.index ?? englishHeading?.index ?? introductionEnd?.index ?? 0;
  const mission = body.slice(start);
  const end =
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:votre profil|profil recherche|qualifications|a propos de nous|nos avantages|pourquoi nous rejoindre|about (?:us|the company)|benefits|equal opportunit)/im.exec(
      mission,
    );
  return mission.slice(0, end?.index ?? 6500);
}
