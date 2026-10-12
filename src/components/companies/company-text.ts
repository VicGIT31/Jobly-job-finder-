/**
 * Les fiches entreprises créées à l'ingestion portent des valeurs de
 * remplissage ; l'interface les masque plutôt que d'afficher du bruit.
 */
export function isPlaceholderDescription(description: string | null | undefined): boolean {
  return !description || /fiche a été créée automatiquement/i.test(description);
}

export function companySizeLabel(size: string | null | undefined): string | null {
  if (!size || /non renseign/i.test(size)) return null;
  return `${size} salariés`;
}
