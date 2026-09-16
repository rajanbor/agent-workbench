#!/usr/bin/env node
/* Every stylesheet must parse. A truncated rule silently kills every rule
   after it, which is how the activity calendar disappeared once already:
   a merge conflict was resolved by concatenating both sides and the tail of
   one rule was lost. Cheap to check, expensive to miss. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = "web/src/styles";
let failed = false;

for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
  const text = readFileSync(join(dir, file), "utf8");
  let depth = 0;
  let line = 1;
  let openedAt = 0;

  for (const char of text) {
    if (char === "\n") line += 1;
    if (char === "{") {
      if (depth === 0) openedAt = line;
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth < 0) {
        console.error(`${file}:${line}: closing brace without an opening one`);
        failed = true;
        depth = 0;
      }
    }
  }

  if (depth !== 0) {
    console.error(`${file}: ${depth} unclosed rule(s); the last one opens at line ${openedAt}`);
    failed = true;
  } else {
    console.log(`${file}: ok`);
  }
}

process.exit(failed ? 1 : 0);
