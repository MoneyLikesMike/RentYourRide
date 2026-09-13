import type { ReactNode } from 'react';

type Props = {
  body: string;
};

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string };

const HEADING = /^#{2,3}\s*(.+)$/;
const ORDERED_ITEM = /^\d+[.)]\s+(.+)$/;
/** `-`, `*`, `·`, `•` at the start, or a whitespace-indented `o` sub-bullet. */
const BULLET_ITEM = /^(?:[-*·•]|\s+o)\s+(.+)$/;

function classify(lines: string[]): Block {
  const trimmed = lines.map((line) => line.trim());

  if (trimmed.length === 1) {
    const heading = HEADING.exec(trimmed[0]);
    if (heading) return { kind: 'heading', text: heading[1].trim() };
  }

  const ordered = lines.map((line) => ORDERED_ITEM.exec(line.trim()));
  if (ordered.every(Boolean)) {
    return {
      kind: 'list',
      ordered: true,
      items: ordered.map((match) => match![1].trim()),
    };
  }

  // Bullets keep their leading whitespace so indented `o` items still match.
  const bullets = lines.map((line) => BULLET_ITEM.exec(line.replace(/\s+$/, '')));
  if (bullets.every(Boolean)) {
    return {
      kind: 'list',
      ordered: false,
      items: bullets.map((match) => match![1].trim()),
    };
  }

  return { kind: 'paragraph', text: trimmed.join(' ') };
}

/**
 * Markdown-lite: blank-line separated blocks, `##` headings, `-`/`·` bullets and
 * `1.` numbered lists. Everything renders as text, so pasted content can't
 * inject markup.
 */
function parseBlocks(body: string): Block[] {
  return body
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '    ')
    .split(/\n{2,}/)
    .map((chunk) => chunk.replace(/^\n+|\n+$/g, ''))
    .filter((chunk) => chunk.trim().length > 0)
    .map((chunk) => classify(chunk.split('\n').filter((line) => line.trim())));
}

export default function ArticleBody({ body }: Props) {
  const blocks = parseBlocks(body ?? '');
  if (blocks.length === 0) return null;

  return (
    <div className="article-body">
      {blocks.map((block, index): ReactNode => {
        if (block.kind === 'heading') {
          return <h2 key={index}>{block.text}</h2>;
        }
        if (block.kind === 'list') {
          const items = block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{item}</li>
          ));
          return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
        }
        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
