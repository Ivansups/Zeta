import { Fragment, type ReactNode } from "react";

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((chunk, index) => {
    if (chunk.startsWith("**") && chunk.endsWith("**")) {
      return <strong key={index}>{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith("`") && chunk.endsWith("`")) {
      return <code key={index}>{chunk.slice(1, -1)}</code>;
    }
    if (
      chunk.startsWith("*") &&
      chunk.endsWith("*") &&
      chunk.length > 2
    ) {
      return <em key={index}>{chunk.slice(1, -1)}</em>;
    }
    return <Fragment key={index}>{chunk}</Fragment>;
  });
}

/**
 * Minimal, dependency-free Markdown subset for homework text:
 * bold, italics, inline code, bullet lists and line breaks.
 * Raw HTML is never rendered, only React-escaped text.
 */
export function HomeworkDescription({
  text,
}: {
  text: string;
}): React.JSX.Element {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList(): void {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  }

  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();
    if (line.length === 0) {
      return;
    }
    blocks.push(<p key={`line-${lineIndex}`}>{renderInline(line)}</p>);
  });
  flushList();

  return <div className="homework-description">{blocks}</div>;
}
