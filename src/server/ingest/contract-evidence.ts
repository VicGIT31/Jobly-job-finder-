/** Preuve explicite du contrat, sans confondre « CDI après le stage » avec le poste. */
export function nonStudentContractEvidence(title: string, description: string): string | null {
  const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const heading = fold(title);
  const studentTitle =
    /\b(stage|stagiaire|internship|intern|alternance|alternant\w*|apprenti\w*|pfe)\b/.test(heading);
  if (!studentTitle && /\b(cdi|cdd|permanent|freelance)\b/.test(heading))
    return "Contrat salarié explicite dans le titre";
  const body = fold(description);
  const match =
    /(?:contract\s*type|employment\s*type|type\s*(?:de\s*)?(?:contrat|d.emploi)|contrat)\s*[:：-]\s*(cdi|permanent|regular(?:\s+employee)?|freelance)(?:\b|(?=classe|experience|company|job|full|temps))/.exec(
      body,
    );
  if (match) return `Contrat explicite dans la description : ${match[1]}`;
  if (
    !studentTitle &&
    /\b(?:poste (?:en|a pourvoir en)|emploi en)\s*cdi\b|\bcontrat a duree indeterminee\b/.test(body)
  )
    return "Poste explicitement proposé en CDI";
  return null;
}
