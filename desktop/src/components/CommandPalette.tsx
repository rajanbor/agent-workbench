import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { KeyHint } from "./primitives";
import type { DesktopSnapshot } from "../lib/engine";
import type { Selection, ViewId } from "../lib/shell";

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: string;
  run: () => void;
}

export function CommandPalette({
  open,
  snapshot,
  onClose,
  onSelect,
  onAction,
}: {
  open: boolean;
  snapshot: DesktopSnapshot;
  onClose: () => void;
  onSelect: (view: ViewId, selection?: Partial<Selection>) => void;
  onAction: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: "v:chat", label: "Workbench chat", hint: "Go to", icon: "cube", run: () => onSelect("chat", { chat: "workbench", agent: null }) },
      { id: "v:canvas", label: "Canvas", hint: "Go to", icon: "canvas", run: () => onSelect("canvas") },
      { id: "v:sandboxes", label: "Sandboxes", hint: "Go to", icon: "sandbox", run: () => onSelect("sandboxes") },
      { id: "v:models", label: "Models", hint: "Go to", icon: "model", run: () => onSelect("models") },
      { id: "v:usage", label: "Usage and cost", hint: "Go to", icon: "bolt", run: () => onSelect("usage") },
      { id: "v:settings", label: "Settings", hint: "Go to", icon: "settings", run: () => onSelect("settings") },
      ...snapshot.agents.map((agent) => ({
        id: `a:${agent.id}`,
        label: agent.name,
        hint: `Agent · ${agent.status}`,
        icon: "agent",
        run: () => onSelect("chat", { chat: agent.id, agent: agent.id }),
      })),
      ...snapshot.sandboxes.map((sandbox) => ({
        id: `s:${sandbox.id}`,
        label: sandbox.name,
        hint: `Sandbox · ${sandbox.state}`,
        icon: "sandbox",
        run: () => onSelect("sandboxes", { sandbox: sandbox.id }),
      })),
      ...snapshot.models.map((model) => ({
        id: `m:${model.id}`,
        label: model.name,
        hint: `Model · ${model.version}`,
        icon: model.icon,
        run: () => onSelect("models", { model: model.id }),
      })),
      {
        id: "x:run",
        label: "Run an agent",
        hint: "Action",
        icon: "play",
        run: () => onAction("The desktop client cannot launch providers yet."),
      },
    ],
    [onAction, onSelect, snapshot],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands.slice(0, 9);
    return commands.filter((command) => command.label.toLowerCase().includes(needle)).slice(0, 9);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      input.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const pick = (index: number) => {
    const command = results[index];
    if (!command) return;
    command.run();
    onClose();
  };

  return (
    <div className="palette-scrim" onClick={onClose} role="presentation">
      <div className="palette" onClick={(event) => event.stopPropagation()}>
        <div className="palette__input">
          <Icon name="search" size={16} />
          <input
            ref={input}
            value={query}
            placeholder="Search agents, sandboxes, models and views"
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((value) => Math.min(value + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((value) => Math.max(value - 1, 0));
              }
              if (event.key === "Enter") pick(cursor);
            }}
          />
          <KeyHint>esc</KeyHint>
        </div>
        <ul className="palette__list">
          {results.map((command, index) => (
            <li key={command.id}>
              <button
                className={index === cursor ? "is-active" : ""}
                onMouseEnter={() => setCursor(index)}
                onClick={() => pick(index)}
              >
                <Icon name={command.icon} size={15} />
                <span>{command.label}</span>
                <em>{command.hint}</em>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="palette__empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
