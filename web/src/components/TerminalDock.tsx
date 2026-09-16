import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Badge, IconButton } from "./primitives";
import { countBySeverity, problemsOf } from "../lib/problems";
import { promptOf } from "../lib/terminal";
import type { DesktopSnapshot, TerminalLine, TerminalSession } from "../lib/engine";
import type { AppEvent } from "../lib/shell";

type PanelTab = "terminal" | "problems" | "output";

/** The bottom panel. Tabs on the left, actions on the right, and — in the
 *  terminal tab — the sessions down the side, so the strip stops carrying
 *  which sandbox owns which pane. The prompt sits at the end of the output
 *  rather than in a bar of its own, because that is how a shell reads. */
export function TerminalDock({
  snapshot,
  terminals,
  activeId,
  onActive,
  buffers,
  sessions,
  busy: running,
  onRun,
  onBoard,
  height,
  onHeight,
  onClose,
  onAction,
  events,
}: {
  snapshot: DesktopSnapshot;
  /** Everything the engine ships, plus what this session opened on the board. */
  terminals: TerminalSession[];
  activeId: string;
  onActive: (id: string) => void;
  buffers: Record<string, TerminalLine[]>;
  sessions: Record<string, string | null>;
  busy: Record<string, boolean>;
  onRun: (terminalId: string, input: string) => void;
  /** Show this terminal as a window on the board. */
  onBoard: (terminalId: string) => void;
  height: number;
  onHeight: (height: number) => void;
  onClose: () => void;
  onAction: (message: string) => void;
  /** Everything the app has reported in this session, newest last. */
  events: AppEvent[];
}) {
  const [tab, setTab] = useState<PanelTab>("terminal");
  const [input, setInput] = useState("");
  const [maximised, setMaximised] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const terminal = terminals.find((item) => item.id === activeId) ?? terminals[0];
  const session = sessions[terminal?.id ?? ""] ?? null;
  const busy = running[terminal?.id ?? ""] ?? false;
  const lines = useMemo(
    () => [...(terminal?.lines ?? []), ...(buffers[terminal?.id ?? ""] ?? [])],
    [buffers, terminal],
  );
  const problems = useMemo(() => problemsOf(snapshot), [snapshot]);
  const counts = useMemo(() => countBySeverity(problems), [problems]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines.length, busy, tab]);

  const startDrag = (event: React.PointerEvent) => {
    if (maximised) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const move = (moveEvent: PointerEvent) => {
      onHeight(Math.min(Math.max(startHeight + (startY - moveEvent.clientY), 120), 640));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!terminal) return null;

  const tabs: { id: PanelTab; label: string; tail?: React.ReactNode }[] = [
    {
      id: "problems",
      label: "Problems",
      tail: (
        <em className="dock__tally">
          {counts.error} · {counts.warning} · {counts.info}
        </em>
      ),
    },
    { id: "output", label: "Output", tail: <em className="dock__tally">{events.length}</em> },
    { id: "terminal", label: "Terminal", tail: <em className="dock__tally">{terminals.length}</em> },
  ];

  return (
    <section className={`dock ${maximised ? "is-maximised" : ""}`} style={maximised ? undefined : { height }}>
      <div
        className="dock__grip"
        onPointerDown={startDrag}
        role="separator"
        aria-label="Resize the panel"
      />

      <header className="dock__bar">
        <div className="dock__tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={`dock__tab ${tab === item.id ? "is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <span>{item.label}</span>
              {item.tail}
            </button>
          ))}
        </div>

        <div className="dock__tools">
          {tab === "terminal" && (
            <>
              <IconButton
                icon="plus"
                label="New terminal"
                size={14}
                onClick={() => onAction("New sandbox terminals arrive with workbenchd.")}
              />
              <IconButton
                icon="split"
                label="Split this terminal"
                size={14}
                onClick={() => onAction("A second pty on one sandbox needs workbenchd.")}
              />
              <IconButton
                icon="trash"
                label="Clear this terminal"
                size={14}
                onClick={() => onRun(terminal.id, "clear")}
              />
              <IconButton
                icon="canvas"
                label="Open this terminal on the board"
                size={14}
                onClick={() => onBoard(terminal.id)}
              />
            </>
          )}
          <IconButton
            icon={maximised ? "chevronDown" : "expand"}
            label={maximised ? "Restore the panel" : "Maximise the panel"}
            size={14}
            onClick={() => setMaximised((value) => !value)}
          />
          <IconButton icon="close" label="Hide the panel" size={14} onClick={onClose} />
        </div>
      </header>

      {tab === "terminal" && (
        <div className="dock__split">
          <div className="dock__stream" ref={scroller} onClick={() => field.current?.focus()}>
            {/* The policy is stated once, at the head of this session's log. */}
            <p className="dock__policy">
              <Icon name="shield" size={13} />
              <span>
                <strong className="mono">
                  {terminal.title} · {terminal.shell} · {terminal.cwd}
                </strong>
                {terminal.policy}
              </span>
            </p>

            {lines.map((line, index) => (
              <p key={index} className={`dock__line dock__line--${line.stream}`}>
                {line.text}
              </p>
            ))}
            {busy && <p className="dock__line dock__line--info">inspector reading snapshot…</p>}

            <form
              className="dock__entry"
              onSubmit={(event) => {
                event.preventDefault();
                onRun(terminal.id, input);
                setInput("");
              }}
            >
              <span className="dock__prompt">{promptOf(terminal, session, snapshot.programs)}</span>
              <input
                ref={field}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={session ? "a task" : "help"}
                spellCheck={false}
                autoComplete="off"
                aria-label={`Terminal input for ${terminal.title}`}
              />
              <button type="submit" className="term__run" aria-label={`Run in ${terminal.title}`}>
                <Icon name="send" size={12} />
              </button>
            </form>
          </div>

          <ul className="dock__sessions" aria-label="Terminal sessions">
            {terminals.map((item) => (
              <li key={item.id}>
                <button
                  className={item.id === terminal.id ? "is-active" : ""}
                  onClick={() => onActive(item.id)}
                  title={item.policy}
                >
                  <Icon name="terminal" size={13} />
                  <span>
                    <strong className="mono">{item.title}</strong>
                    <small>
                      {sessions[item.id]
                        ? `${sessions[item.id]} session`
                        : `${item.sandboxId} · ${item.state}`}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "problems" && (
        <div className="dock__list">
          <p className="dock__note">
            Read from the snapshot this window holds — models, providers, skills, servers,
            sandboxes and engine modules. Each row names where it came from.
          </p>
          {problems.length === 0 && <p className="dock__note">Nothing is reported as broken.</p>}
          {problems.map((problem) => (
            <article key={problem.id} className={`problem problem--${problem.severity}`}>
              <Icon
                name={problem.severity === "info" ? "dot" : "alert"}
                size={14}
                className="problem__mark"
              />
              <div>
                <strong>{problem.title}</strong>
                <p>{problem.detail}</p>
              </div>
              <em className="mono">{problem.source}</em>
            </article>
          ))}
        </div>
      )}

      {tab === "output" && (
        <div className="dock__list">
          <p className="dock__note">
            Everything this window has reported in this session — refusals, reasons and
            confirmations. It is not written to disk; the daemon owns durable logs.
          </p>
          {events.length === 0 && <p className="dock__note">Nothing reported yet.</p>}
          {[...events].reverse().map((event) => (
            <p key={event.id} className="dock__event">
              <span className="mono">{event.at}</span>
              <span>{event.text}</span>
            </p>
          ))}
        </div>
      )}

      {tab !== "terminal" && (
        <footer className="dock__foot">
          <Badge tone="amber" icon="shield">
            {terminal.state}
          </Badge>
          <span className="mono">{terminal.policy}</span>
        </footer>
      )}
    </section>
  );
}
