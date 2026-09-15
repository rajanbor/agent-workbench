import { useState } from "react";
import { Icon } from "./Icon";
import { IconButton } from "./primitives";
import { highlight } from "../lib/highlight";

export interface Snippet {
  id: string;
  label: string;
  code: string;
}

export function CodeSnippet({
  title,
  snippets,
  onCopied,
}: {
  title: string;
  snippets: Snippet[];
  onCopied: (message: string) => void;
}) {
  const [active, setActive] = useState(snippets[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);
  const snippet = snippets.find((item) => item.id === active) ?? snippets[0];
  const lines = snippet.code.split("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      onCopied("Snippet copied to the clipboard.");
    } catch {
      onCopied("Clipboard access was refused by the system.");
    }
  };

  return (
    <div className="snippet">
      <header className="snippet__bar">
        <span className="snippet__title">
          <Icon name="code" size={15} />
          {title}
        </span>
        <div className="snippet__tools">
          <label className="select">
            <select
              value={active}
              onChange={(event) => setActive(event.target.value)}
              aria-label="Snippet language"
            >
              {snippets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <Icon name="chevronUpDown" size={13} />
          </label>
          <IconButton
            icon="expand"
            label={expanded ? "Collapse snippet" : "Expand snippet"}
            onClick={() => setExpanded((value) => !value)}
          />
          <IconButton icon="copy" label="Copy snippet" onClick={copy} />
        </div>
      </header>

      <div className={`snippet__code ${expanded ? "is-expanded" : ""}`}>
        <pre>
          {lines.map((line, index) => (
            <span className="code-line" key={index}>
              <span className="code-line__number">{index + 1}</span>
              <span className="code-line__text">{highlight(line)}</span>
            </span>
          ))}
        </pre>
        {!expanded && lines.length > 12 && <span className="snippet__fade" />}
      </div>
    </div>
  );
}
