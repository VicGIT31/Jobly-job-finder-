import { load } from "cheerio";

/** Décode aussi le HTML échappé des boards Greenhouse et garde les paragraphes. */
export function htmlToText(input: string): string {
  let html = input;
  for (let depth = 0; depth < 3; depth++) {
    if (
      !/(?:&lt;|&#0*60;|&#x0*3c;|&amp;lt;)\s*\/?(?:p|div|h[1-6]|ul|li|br|strong|span|section)\b/i.test(
        html,
      )
    )
      break;
    html = load(html, undefined, false).root().text();
  }
  const $ = load(html, undefined, false);
  $("script, style").remove();
  $("p, div, h1, h2, h3, h4, h5, h6").each((_, node) => {
    $(node).after("\n\n");
  });
  $("li").each((_, node) => {
    $(node).prepend("- ").after("\n");
  });
  $("br").replaceWith("\n");
  return $.root()
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
