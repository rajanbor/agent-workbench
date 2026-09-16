/** What a terminal pane does with what you type.
 *
 *  One implementation, used by the bottom panel and by every window on the
 *  terminal canvas, so the same terminal behaves the same way wherever it is
 *  shown — and, because buffers are keyed by terminal id in one place, shows
 *  the same history in both.
 *
 *  Two modes. The shell answers the engine-backed commands and refuses
 *  everything else with its reason. A program session — `claude`, `codex`,
 *  `qwen`, `agentctl` — takes a task per line and answers it through the
 *  built-in inspector under the read-only policy. The real binary cannot be
 *  launched from this window: it runs as the sandbox user, which is
 *  `workbenchd`'s work, and the banner says so on every start. */

import { ask, type DesktopSnapshot, type Sandbox, type TerminalLine, type TerminalProgram, type TerminalSession } from "./engine";

export const HELP: TerminalLine[] = [
  { stream: "output", text: "Answered by the engine — no process is spawned:" },
  { stream: "output", text: "  help                 this list" },
  { stream: "output", text: "  status               machine, sandbox and provider state" },
  { stream: "output", text: "  agents | sandboxes   objects in this workspace" },
  { stream: "output", text: "  models | cost        catalogue, pinned versions, spend" },
  { stream: "output", text: "  ask <question>       inspector answer under the read-only policy" },
  { stream: "output", text: "  clear                clear this pane" },
  { stream: "output", text: "" },
  { stream: "output", text: "Programs — a session that takes a task per line, until `exit`:" },
];

/** Which engine topic a shell command maps to, or null when it needs a pty. */
function topicOf(command: string): string | null {
  if (command === "status") return "overview";
  if (command.startsWith("ask ")) return command.slice(4);
  return ["agents", "sandboxes", "models", "cost"].includes(command) ? command : null;
}

export interface TerminalRun {
  /** Lines to append to this terminal's buffer. */
  lines: TerminalLine[];
  /** The program session after this command: an id, or null for the shell. */
  session: string | null;
  /** Clear the buffer before appending — `clear` is the only one that does. */
  reset?: boolean;
  /** A message for the window's own notice area, when one is worth raising. */
  notice?: string;
}

export function promptOf(terminal: TerminalSession, session: string | null, programs: TerminalProgram[]): string {
  if (!session) return `agent@${terminal.sandboxId} ${terminal.cwd} %`;
  const program = programs.find((item) => item.id === session);
  return `${program?.command ?? session} >`;
}

function helpWith(programs: TerminalProgram[]): TerminalLine[] {
  return [
    ...HELP,
    ...programs.map((program) => ({
      stream: "output",
      text: `  ${program.command.padEnd(20)} ${program.summary}`,
    })),
  ];
}

/** The banner a program prints, plus what is missing and what to try. */
function open(program: TerminalProgram, snapshot: DesktopSnapshot): TerminalLine[] {
  const model = snapshot.models.find((item) => item.id === program.modelId);
  const lines: TerminalLine[] = program.banner.map((text, index) => ({
    stream: index === 0 ? "input" : "output",
    text,
  }));

  if (program.blockedBy) lines.push({ stream: "warn", text: program.blockedBy });
  if (model) {
    lines.push({
      stream: "info",
      text: `Answers come from ${snapshot.inspector.modelId}, not ${model.name} — ${
        model.ready ? "which is ready but not reachable from this window" : "which is not connected"
      }.`,
    });
  }
  if (program.examples.length > 0) {
    lines.push({ stream: "output", text: `Try: ${program.examples[0]}` });
  }
  return lines;
}

export async function run(
  input: string,
  context: {
    snapshot: DesktopSnapshot;
    terminal: TerminalSession;
    session: string | null;
  },
): Promise<TerminalRun> {
  const { snapshot, terminal, session } = context;
  const command = input.trim();
  const programs = snapshot.programs;
  if (!command) return { lines: [], session };

  const echo: TerminalLine[] = [
    { stream: "prompt", text: promptOf(terminal, session, programs) },
    { stream: "input", text: command },
  ];

  if (command === "clear") return { lines: [], session, reset: true };

  /* ------------------------------------------------------------- a session */
  if (session) {
    const program = programs.find((item) => item.id === session);

    if (command === "exit" || command === "quit") {
      return {
        lines: [...echo, { stream: "info", text: `${program?.name ?? session} session closed.` }],
        session: null,
      };
    }
    if (command === "help") {
      return {
        lines: [
          ...echo,
          { stream: "output", text: `${program?.name} takes a task per line and answers it.` },
          ...(program?.examples ?? []).map((text) => ({ stream: "output", text: `  ${text}` })),
          { stream: "output", text: "  exit                 close this session" },
        ],
        session,
      };
    }

    // Inside a session every line is a task, including the ones that look like
    // shell commands: `agentctl status` is the same question as `status`.
    const answer = await ask(topicOf(command) ?? command, snapshot);
    return {
      lines: [
        ...echo,
        ...answer.text.split("\n").map((text) => ({ stream: "output", text })),
        {
          stream: "info",
          text: `— ${answer.modelId} · ${answer.tokens} tokens · $${answer.costUsd.toFixed(2)}${
            answer.refused.length ? ` · refused: ${answer.refused.join(", ")}` : ""
          }`,
        },
      ],
      session,
    };
  }

  /* --------------------------------------------------------------- a shell */
  if (command === "help") return { lines: [...echo, ...helpWith(programs)], session };

  const [head, ...rest] = command.split(" ");
  const program = programs.find((item) => item.command === head);
  if (program) {
    const opened = open(program, snapshot);
    const task = rest.join(" ").replace(/^-p\s+/, "").replace(/^["']|["']$/g, "");

    // `claude "do the thing"` answers once and stays in the session, the way
    // the real CLI takes a first prompt from its arguments.
    if (task) {
      const answer = await ask(task, snapshot);
      return {
        lines: [
          ...echo,
          ...opened,
          { stream: "prompt", text: `${program.command} >` },
          { stream: "input", text: task },
          ...answer.text.split("\n").map((text) => ({ stream: "output", text })),
          {
            stream: "info",
            text: `— ${answer.modelId} · ${answer.tokens} tokens · $${answer.costUsd.toFixed(2)}`,
          },
        ],
        session: program.id,
        notice: program.blockedBy ?? undefined,
      };
    }

    return { lines: [...echo, ...opened], session: program.id, notice: program.blockedBy ?? undefined };
  }

  const topic = topicOf(command);
  if (topic === null) {
    return {
      lines: [
        ...echo,
        {
          stream: "error",
          text: `${head}: refused by policy — a live command runs as the sandbox user and needs workbenchd.`,
        },
        { stream: "output", text: "Type `help` for what this pane answers, and which programs it can open." },
      ],
      session,
      notice: "Live shell execution is not implemented yet.",
    };
  }

  const answer = await ask(topic, snapshot);
  return {
    lines: [
      ...echo,
      ...answer.text.split("\n").map((text) => ({ stream: "output", text })),
      {
        stream: "info",
        text: `— ${answer.modelId} · ${answer.tokens} tokens · $${answer.costUsd.toFixed(2)}${
          answer.refused.length ? ` · refused: ${answer.refused.join(", ")}` : ""
        }`,
      },
    ],
    session,
  };
}

/* ------------------------------------------------------- terminals on a board
 *  A window the person opened is local to this machine until the daemon owns
 *  sessions, so it is built here from the sandbox it belongs to rather than
 *  invented: the account, the mount and the network policy are the engine's. */

export function terminalForSandbox(sandbox: Sandbox, index: number): TerminalSession {
  const writable = sandbox.mounts.find((mount) => mount.mode !== "denied");
  return {
    id: `canvas-${sandbox.id}-${index}`,
    title: `${sandbox.name} ${index}`,
    sandboxId: sandbox.id,
    shell: "zsh",
    cwd: writable?.path ?? "~",
    state: "detached",
    policy: sandbox.account
      ? `Runs as ${sandbox.account} · network ${sandbox.network.mode}. A live pty needs workbenchd; this pane answers from the engine.`
      : `${sandbox.name} has no account of its own, so nothing may run in it. This pane answers from the engine only.`,
    lines: [],
  };
}
