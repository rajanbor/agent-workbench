import type { ReactNode } from "react";

type Kind = "comment" | "string" | "number" | "keyword" | "type" | "fn" | "punct" | "plain";

const RULES: { kind: Kind; pattern: RegExp }[] = [
  { kind: "comment", pattern: /^(\/\/[^\n]*|#[^\n]*)/ },
  { kind: "string", pattern: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/ },
  { kind: "number", pattern: /^\d+(?:\.\d+)?/ },
  {
    kind: "keyword",
    pattern:
      /^\b(?:const|let|var|import|export|from|await|async|new|return|function|class|true|false|null|undefined|if|else|for|while|type|interface)\b/,
  },
  { kind: "fn", pattern: /^[A-Za-z_$][\w$]*(?=\()/ },
  { kind: "type", pattern: /^[A-Z][A-Za-z0-9_]*/ },
  { kind: "punct", pattern: /^[{}()[\].,;:=<>+\-*/|&!?]/ },
];

/** Small, dependency-free tokenizer: enough for the TypeScript and shell snippets we show. */
export function highlight(line: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = line;
  let plain = "";
  let key = 0;

  const flush = () => {
    if (!plain) return;
    nodes.push(<span key={key++}>{plain}</span>);
    plain = "";
  };

  while (rest.length > 0) {
    const rule = RULES.find((candidate) => candidate.pattern.test(rest));
    if (!rule) {
      plain += rest[0];
      rest = rest.slice(1);
      continue;
    }
    const [match] = rule.pattern.exec(rest) as RegExpExecArray;
    flush();
    nodes.push(
      <span key={key++} className={`tok tok--${rule.kind}`}>
        {match}
      </span>,
    );
    rest = rest.slice(match.length);
  }

  flush();
  return nodes;
}
