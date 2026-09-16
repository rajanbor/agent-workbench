import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Badge, IconButton } from "./primitives";
import { ask, type DesktopSnapshot, type TerminalLine } from "../lib/engine";

type Buffers = Record<string, TerminalLine[]>;

const HELP: TerminalLine[] = [
  { stream: "output", text: "Built-in commands, answered by the engine — no process is spawned:" },
  { stream: "output", text: "  help                 this list" },
  { stream: "output", text: "  status               machine, sandbox and provider state" },
  { stream: "output", text: "  agents | sandboxes   objects in this workspace" },
  { stream: "output", text: "  models | cost        catalogue, pinned versions, spend" },
  { stream: "output", text: "  ask <question>       inspector answer under the read-only policy" },
  { stream: "output", text: "  clear                clear this pane" },
  {
    stream: "warn",
    text: "Anything else needs a live pty owned by the sandbox user; workbenchd is not implemented yet.",
  },
];

export function TerminalDock({
  snapshot,
  activeId,
  onActive,
  height,
  onHeight,
  onClose,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  activeId: string;
  onActive: (id: string) => void;
  height: number;
  onHeight: (height: number) => void;
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const [buffers, setBuffers] = useState<Buffers>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const terminal =
    snapshot.terminals.find((item) => item.id === activeId) ?? snapshot.terminals[0];
  const lines = useMemo(
    () => [...(terminal?.lines ?? []), ...(buffers[terminal?.id ?? ""] ?? [])],
    [buffers, terminal],
  );

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines.length, busy]);

  const push = (id: string, added: TerminalLine[]) =>
    setBuffers((current) => ({ ...current, [id]: [...(current[id] ?? []), ...added] }));

  const startDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const move = (moveEvent: PointerEvent) => {
      const next = Math.min(Math.max(startHeight + (startY - moveEvent.clientY), 120), 560);
      onHeight(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const run = async (raw: string) => {
    const command = raw.trim();
    if (!command || !terminal) return;
    const prompt = `agent@${terminal.sandboxId} ${terminal.cwd} %`;
    push(terminal.id, [
      { stream: "prompt", text: prompt },
      { stream: "input", text: command },
    ]);
    setInput("");

    if (command === "clear") {
      setBuffers((current) => ({ ...current, [terminal.id]: [] }));
      return;
    }
    if (command === "help") {
      push(terminal.id, HELP);
      return;
    }

    const question =
      command === "status"
        ? "overview"
        : command.startsWith("ask ")
          ? command.slice(4)
          : ["agents", "sandboxes", "models", "cost"].includes(command)
            ? command
            : null;

    if (question === null) {
      push(terminal.id, [
        {
          stream: "error",
          text: `${command.split(" ")[0]}: refused by policy — a live command runs as the sandbox user and needs workbenchd.`,
        },
        { stream: "output", text: "Type `help` for the commands this pane answers today." },
      ]);
      onAction("Live shell execution is not implemented yet.");
      return;
    }

    setBusy(true);
    const answer = await ask(question, snapshot);
    setBusy(false);
    push(terminal.id, [
      ...answer.text.split("\n").map((text) => ({ stream: "output", text })),
      {
        stream: "info",
        text: `— ${answer.modelId} · ${answer.tokens} tokens · $${answer.costUsd.toFixed(2)}${
          answer.refused.length ? ` · refused: ${answer.refused.join(", ")}` : ""
        }`,
      },
    ]);
  };

  if (!terminal) return null;

  return (
    <section className="dock" style={{ height }}>
      <div className="dock__grip" onPointerDown={startDrag} role="separator" aria-label="Resize terminal panel" />
      <header className="dock__bar">
        <div className="dock__tabs">
          {snapshot.terminals.map((item) => (
            <button
              key={item.id}
              className={`dock__tab ${item.id === terminal.id ? "is-active" : ""}`}
              onClick={() => onActive(item.id)}
            >
              <Icon name="terminal" size={13} />
              <span className="mono">{item.title}</span>
            </button>
          ))}
          <IconButton
            icon="plus"
            label="New terminal"
            onClick={() => onAction("New sandbox terminals arrive with workbenchd.")}
          />
        </div>
        <div className="dock__tools">
          <Badge tone="amber" icon="shield">
            {terminal.state}
          </Badge>
          <span className="dock__cwd mono">{terminal.cwd}</span>
          <IconButton icon="close" label="Hide terminals" onClick={onClose} />
        </div>
      </header>

      <div className="dock__body" ref={scroller}>
        <p className="dock__policy">
          <Icon name="shield" size={13} /> {terminal.policy}
        </p>
        {lines.map((line, index) => (
          <p key={index} className={`dock__line dock__line--${line.stream}`}>
            {line.text}
          </p>
        ))}
        {busy && <p className="dock__line dock__line--info">inspector reading snapshot…</p>}
      </div>

      <form
        className="dock__input"
        onSubmit={(event) => {
          event.preventDefault();
          void run(input);
        }}
      >
        <span className="mono dock__prompt">
          agent@{terminal.sandboxId} {terminal.cwd} %
        </span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="help"
          spellCheck={false}
          aria-label={`Terminal input for ${terminal.title}`}
        />
      </form>
    </section>
  );
}
