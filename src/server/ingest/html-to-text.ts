/**
 * Conversion HTML → texte brut pour les sources qui exposent leur
 * description au format HTML (The Muse, Greenhouse, Ashby…) plutôt qu'en
 * texte simple. Partagé entre connecteurs pour éviter de dupliquer la même
 * liste de balises/entités.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
