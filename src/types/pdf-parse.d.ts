/**
 * Déclaration ad hoc pour le sous-chemin interne de pdf-parse (voir
 * src/server/cv/extract-text.ts pour pourquoi on ne peut pas importer le
 * point d'entrée public). Mêmes types que le module public @types/pdf-parse.
 */
declare module "pdf-parse/lib/pdf-parse.js" {
  import type PDFParse from "pdf-parse";
  const pdfParse: typeof PDFParse;
  export default pdfParse;
}
