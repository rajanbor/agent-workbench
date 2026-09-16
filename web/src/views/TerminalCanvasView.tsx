import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Menu } from "../components/Menu";
import { Badge, IconButton } from "../components/primitives";
import { promptOf } from "../lib/terminal";
import type { DesktopSnapshot, TerminalLine, TerminalSession } from "../lib/engine";
import type { TerminalWindow } from "../lib/board";

type Props = {
  snapshot: DesktopSnapshot;
  windows: TerminalWindow[];
  terminals: TerminalSession[];
  buffers: Record<string, TerminalLine[]>;
  sessions: Record<string, string | null>;
  busy: Record<string, boolean>;
  onMove: (id: string, patch: Partial<TerminalWindow>) => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onOpen: (sandboxId: string) => void;
  onTidy: () => void;
  onRun: (terminalId: string, input: string) => void;
  onAction: (message: string) => void;
};

/** A board of terminals: as many as the work needs, placed where you want
 *  them. Each window is a real pane — the same buffer the bottom panel shows
 *  for that terminal — and inside it `claude`, `codex`, `qwen` or `agentctl`
 *  opens a session that takes a task per line. */
export function TerminalCanvasView(props: Props) {
  const { snapshot, windows, terminals } = props;
  const board = useRef<HTMLDivElement>(null);
  const open = windows.length;

  return (
    <div className="board">
      <header className="board__bar">
        <div className="board__title">
          <Icon name="terminal" size={15} />
          <strong>Terminals</strong>
          <em>
            {open} open · {snapshot.sandboxes.filter((item) => item.account).length} sandboxes can
            hold one
          </em>
        </div>

        <div className="board__tools">
          <Menu
            className="menu--board"
            align="right"
            title="Open a terminal in a sandbox"
            label={
              <>
                <Icon name="plus" size={14} />
                <span>New terminal</span>
              </>
            }
          >
            {(close) => (
              <>
                <p className="menu__label">Open in</p>
                {snapshot.sandboxes.map((sandbox) => (
                  <button
                    key={sandbox.id}
                    className="menu__item"
                    onClick={() => {
                      props.onOpen(sandbox.id);
                      close();
                    }}
                  >
                    <Icon name="sandbox" size={14} />
                    <span>
                      <strong className="mono">{sandbox.name}</strong>
                      <small>
                        {sandbox.account ? `runs as ${sandbox.account}` : "no account of its own"} ·
                        network {sandbox.network.mode}
                      </small>
                    </span>
                  </button>
                ))}
                <div className="menu__note">
                  A window opened here lives in this session. Terminals that outlive the window,
                  and any live pty, belong to the workbench daemon.
                </div>
              </>
            )}
          </Menu>

          <Menu
            className="menu--board"
            align="right"
            title="What a terminal can start"
            label={
              <>
                <Icon name="play" size={14} />
                <span>Programs</span>
              </>
            }
          >
            {() => (
              <>
                <p className="menu__label">Type one of these in a terminal</p>
                {snapshot.programs.map((program) => (
                  <div key={program.id} className="menu__item menu__item--static">
                    <Icon name={program.modelId ? "model" : "machine"} size={14} />
                    <span>
                      <strong className="mono">{program.command}</strong>
                      <small>{program.summary}</small>
                    </span>
                    <Badge tone={program.available ? "green" : "amber"}>
                      {program.available ? "runs" : "stands in"}
                    </Badge>
                  </div>
                ))}
                <div className="menu__note">
                  None of these launches its real binary yet: a program in a sandbox runs as the
                  sandbox user, which is the daemon&apos;s work. The session that opens is the
                  built-in inspector under the read-only policy, and it says so every time.
                </div>
              </>
            )}
          </Menu>

          <IconButton icon="layers" label="Tidy the windows" onClick={props.onTidy} />
        </div>
      </header>

      <div className="board__surface" ref={board}>
        {windows.length === 0 && (
          <div className="board__empty">
            <Icon name="terminal" size={40} />
            <p>No terminal is open on this board.</p>
            <p className="muted-copy">
              Open one in a sandbox, then type <span className="mono">claude</span> in it to start a
              session against that workspace.
            </p>
          </div>
        )}

        {windows.map((item) => {
          const terminal = terminals.find((entry) => entry.id === item.terminalId);
          if (!terminal) return null;
          return (
            <TerminalWindowPane
              key={item.id}
              window={item}
              terminal={terminal}
              snapshot={snapshot}
              lines={[...terminal.lines, ...(props.buffers[terminal.id] ?? [])]}
              session={props.sessions[terminal.id] ?? null}
              busy={props.busy[terminal.id] ?? false}
              boardRef={board}
              onMove={props.onMove}
              onFocus={props.onFocus}
              onClose={props.onClose}
              onRun={props.onRun}
            />
          );
        })}
      </div>
    </div>
  );
}

function TerminalWindowPane({
  window: item,
  terminal,
  snapshot,
  lines,
  session,
  busy,
  boardRef,
  onMove,
  onFocus,
  onClose,
  onRun,
}: {
  window: TerminalWindow;
  terminal: TerminalSession;
  snapshot: DesktopSnapshot;
  lines: TerminalLine[];
  session: string | null;
  busy: boolean;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onMove: (id: string, patch: Partial<TerminalWindow>) => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onRun: (terminalId: string, input: string) => void;
}) {
  const [input, setInput] = useState("");
  const stream = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const program = snapshot.programs.find((entry) => entry.id === session);

  useEffect(() => {
    stream.current?.scrollTo({ top: stream.current.scrollHeight });
  }, [lines.length, busy]);

  /** Drag by the title bar, resize from the corner. Both clamp to the board so
   *  a window cannot be pushed out of reach. */
  const grab = (mode: "move" | "resize") => (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onFocus(item.id);
    const from = { pointerX: event.clientX, pointerY: event.clientY, ...item };
    const box = boardRef.current?.getBoundingClientRect();

    const move = (pointer: PointerEvent) => {
      const dx = pointer.clientX - from.pointerX;
      const dy = pointer.clientY - from.pointerY;
      if (mode === "move") {
        onMove(item.id, {
          x: Math.max(0, Math.min(from.x + dx, (box?.width ?? 2000) - 80)),
          y: Math.max(0, Math.min(from.y + dy, (box?.height ?? 2000) - 40)),
        });
      } else {
        onMove(item.id, {
          width: Math.max(300, from.width + dx),
          height: Math.max(180, from.height + dy),
        });
      }
    };
    const up = () => {
      globalThis.removeEventListener("pointermove", move);
      globalThis.removeEventListener("pointerup", up);
    };
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", up);
  };

  return (
    <section
      className={`term ${item.focused ? "is-focused" : ""}`}
      style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.z }}
      onPointerDown={() => onFocus(item.id)}
    >
      <header className="term__bar" onPointerDown={grab("move")}>
        <span className="term__name">
          <Icon name="terminal" size={13} />
          <strong className="mono">{terminal.title}</strong>
          {program && <Badge tone="violet">{program.command}</Badge>}
        </span>
        <span className="term__where mono">{terminal.cwd}</span>
        <span className="term__tools">
          <IconButton
            icon="trash"
            label="Clear this terminal"
            size={12}
            onClick={() => onRun(terminal.id, "clear")}
          />
          <IconButton icon="close" label="Close this window" size={12} onClick={() => onClose(item.id)} />
        </span>
      </header>

      <div className="term__stream" ref={stream} onClick={() => field.current?.focus()}>
        <p className="term__policy">
          <Icon name="shield" size={12} />
          <span>{terminal.policy}</span>
        </p>
        {lines.map((line, index) => (
          <p key={index} className={`dock__line dock__line--${line.stream}`}>
            {line.text}
          </p>
        ))}
        {busy && <p className="dock__line dock__line--info">…</p>}

        <form
          className="term__entry"
          onSubmit={(event) => {
            event.preventDefault();
            onRun(terminal.id, input);
            setInput("");
          }}
        >
          <span className="term__prompt mono">{promptOf(terminal, session, snapshot.programs)}</span>
          <input
            ref={field}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={session ? "a task" : "help"}
            spellCheck={false}
            autoComplete="off"
            aria-label={`Terminal input for ${terminal.title}`}
          />
          {/* Return runs it; the button is here for a hand on the mouse. */}
          <button type="submit" className="term__run" aria-label={`Run in ${terminal.title}`}>
            <Icon name="send" size={12} />
          </button>
        </form>
      </div>

      <span className="term__grip" onPointerDown={grab("resize")} aria-hidden="true" />
    </section>
  );
}
