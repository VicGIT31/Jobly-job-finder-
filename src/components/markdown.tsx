import { Fragment } from "react";

/**
 * Rendu du sous-ensemble markdown utilisé par les descriptions d'offres :
 * ## titres, - listes, **gras**, paragraphes. Rendu en éléments React
 * (aucun dangerouslySetInnerHTML — contenu issu de l'ingestion).
 */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function Markdown({ content }: { content: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = content.split(/\r?\n/);
  let listItems: string[] = [];
  let paragraph: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length) {
      blocks.push(
        <ul key={`ul-${key}`} className="my-3 list-none space-y-1.5">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="mt-[2px] select-none text-cobalt">
                —
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const flushParagraph = (key: number) => {
    if (paragraph.length) {
      blocks.push(
        <p key={`p-${key}`} className="my-3 leading-relaxed">
          {renderInline(paragraph.join(" "))}
        </p>,
      );
      paragraph = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList(i);
      flushParagraph(i);
      blocks.push(
        <h2 key={`h-${i}`} className="rule mt-6 pt-4 font-display text-xl font-bold">
          {trimmed.slice(3)}
        </h2>,
      );
    } else if (trimmed.startsWith("- ")) {
      flushParagraph(i);
      listItems.push(trimmed.slice(2));
    } else if (trimmed === "") {
      flushList(i);
      flushParagraph(i);
    } else {
      flushList(i);
      paragraph.push(trimmed);
    }
  });
  flushList(lines.length);
  flushParagraph(lines.length);

  return <div>{blocks}</div>;
}
