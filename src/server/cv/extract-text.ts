// pdf-parse/index.js exécute un auto-test au chargement quand `module.parent`
// est absent (`if (!module.parent) { lit ./test/data/05-versions-space.pdf }`)
// — vrai sous le bundling webpack de Next.js, ce qui fait planter le build
// (ENOENT sur un fichier de test qui n'existe pas dans l'image). Contourné en
// important directement l'implémentation interne, qui n'a pas ce garde-fou.
// Voir node_modules/pdf-parse/index.js.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extrait le texte brut d'un CV PDF. Purement lexical (pas d'IA) : sert de
 * base à `analyze.ts` pour comparer le CV à une offre. Retourne `null` sur
 * un PDF illisible (scanné sans couche texte, corrompu…) plutôt que de
 * lever — un CV illisible ne doit jamais bloquer l'upload lui-même.
 */
export async function extractCvText(buffer: Buffer): Promise<string | null> {
  try {
    const result = await pdfParse(buffer);
    const text = result.text.trim();
    return text.length >= 50 ? text : null;
  } catch {
    return null;
  }
}
