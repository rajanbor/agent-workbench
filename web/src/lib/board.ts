/** The terminal board: which terminals are open as windows, and where.
 *
 *  A window is a placement, not a terminal. The terminal itself — its sandbox,
 *  shell, working directory and policy — comes from the engine, or is built
 *  from a sandbox when the person opens a new one; the board only remembers
 *  where it sits. Kept on this machine, like the rest of the layout, and said
 *  to be local: sessions that outlive the window belong to the daemon. */

export interface TerminalWindow {
  id: string;
  /** The terminal this window shows; two windows never share one id. */
  terminalId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  focused: boolean;
}

const STORAGE_KEY = "open-cube.terminal-board.v1";

export interface StoredBoard {
  windows: TerminalWindow[];
  /** Sandbox ids of terminals this session created, so they can be rebuilt. */
  opened: { terminalId: string; sandboxId: string; index: number }[];
}

export function saveBoard(state: StoredBoard) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* the board is a convenience, not state */
  }
}

export function loadBoard(): StoredBoard | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBoard;
    if (!Array.isArray(parsed?.windows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Where the next window goes: stepped down and right from the last one, the
 *  way a window manager cascades, so a new one is never hidden exactly behind
 *  the old one. */
export function place(windows: TerminalWindow[], terminalId: string): TerminalWindow {
  const step = windows.length % 6;
  return {
    id: `w-${terminalId}-${Date.now()}`,
    terminalId,
    x: 24 + step * 34,
    y: 20 + step * 30,
    width: 520,
    height: 300,
    z: topZ(windows) + 1,
    focused: true,
  };
}

export function topZ(windows: TerminalWindow[]): number {
  return windows.reduce((high, item) => Math.max(high, item.z), 0);
}

export function focus(windows: TerminalWindow[], id: string): TerminalWindow[] {
  const top = topZ(windows) + 1;
  return windows.map((item) =>
    item.id === id ? { ...item, z: top, focused: true } : { ...item, focused: false },
  );
}

/** Lay the windows out in columns that fill the board — the one arrangement
 *  nobody wants to do by hand after opening six terminals. */
export function tidy(windows: TerminalWindow[], width: number, height: number): TerminalWindow[] {
  if (windows.length === 0) return windows;
  const columns = Math.min(windows.length, Math.max(1, Math.floor(width / 520)));
  const rows = Math.ceil(windows.length / columns);
  const gap = 14;
  const cellWidth = Math.max(300, (width - gap * (columns + 1)) / columns);
  const cellHeight = Math.max(180, (height - gap * (rows + 1)) / rows);

  return windows.map((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      ...item,
      x: gap + column * (cellWidth + gap),
      y: gap + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    };
  });
}
