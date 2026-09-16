import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { KeyHint } from "./primitives";
import {
  activities,
  agentTab,
  canvasTab,
  chatTab,
  modelTab,
  newProjectTab,
  projectTab,
  sandboxTab,
  settingsTab,
  studioTab,
  terminalsTab,
  usageTab,
  workbenchChatTab,
  type ActivityId,
  type TabSpec,
} from "../lib/layout";
import type { ChatRef, DesktopSnapshot } from "../lib/engine";

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
  chatsOf,
  onClose,
  onOpen,
  onActivity,
  onAction,
}: {
  open: boolean;
  snapshot: DesktopSnapshot;
  chatsOf: (agentId: string) => ChatRef[];
  onClose: () => void;
  onOpen: (spec: TabSpec) => void;
  onActivity: (id: ActivityId) => void;
  onAction: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const tab = (spec: TabSpec, hint: string, icon?: string): Command => ({
      id: spec.key,
      label: spec.title,
      hint,
      icon: icon ?? (spec.icon as string),
      run: () => onOpen(spec),
    });

    return [
      tab(workbenchChatTab(), "Open"),
      tab(canvasTab(snapshot.workflow.name), "Open"),
      tab(usageTab(), "Open"),
      tab(terminalsTab(), "Open"),
      tab(studioTab(null), "Open", "plus"),
      tab(newProjectTab(), "Open", "plus"),
      ...snapshot.projects.map((project) => tab(projectTab(project), `Project · ${project.path}`)),
      tab(settingsTab(), "Open"),
      ...snapshot.agents.flatMap((agent) => [
        tab(agentTab(agent), `Agent · ${agent.status}`),
        ...chatsOf(agent.id).map((chat) => tab(chatTab(chat, agent), `Chat · ${agent.name}`)),
      ]),
      ...snapshot.sandboxes.map((sandbox) => tab(sandboxTab(sandbox), `Sandbox · ${sandbox.state}`)),
      ...snapshot.models.map((model) => tab(modelTab(model), `Model · ${model.version}`)),
      ...activities.map((area) => ({
        id: `area:${area.id}`,
        label: area.title,
        hint: "Sidebar",
        icon: area.icon as string,
        run: () => onActivity(area.id),
      })),
      {
        id: "x:run",
        label: "Run an agent",
        hint: "Action",
        icon: "play",
        run: () => onAction("The desktop client cannot launch providers yet."),
      },
    ];
  }, [chatsOf, onAction, onActivity, onOpen, snapshot]);

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
            placeholder="Search agents, chats, sandboxes, models and views"
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
