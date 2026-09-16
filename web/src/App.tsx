import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./components/TopBar";
import { ActivityBar } from "./components/ActivityBar";
import { Sidebar } from "./components/Sidebar";
import { EditorGroups } from "./components/EditorGroups";
import { RightRail } from "./components/RightRail";
import { TerminalDock } from "./components/TerminalDock";
import { StatusBar } from "./components/StatusBar";
import { CommandPalette } from "./components/CommandPalette";
import { Icon } from "./components/Icon";

import { ChatView } from "./views/ChatView";
import { CanvasView } from "./views/CanvasView";
import { SandboxView } from "./views/SandboxView";
import { ModelsView } from "./views/ModelsView";
import { UsageView } from "./views/UsageView";
import { AgentView } from "./views/AgentView";
import { AgentStudioView } from "./views/AgentStudioView";
import { ProjectView } from "./views/ProjectView";
import { NewProjectView } from "./views/NewProjectView";
import { NewAgentView } from "./views/NewAgentView";
import { TerminalCanvasView } from "./views/TerminalCanvasView";
import { SettingsView } from "./views/SettingsView";

import {
  ask,
  isTauri,
  loadSnapshot,
  prototypeSnapshot,
  type DesktopSnapshot,
  type EngineSource,
} from "./lib/engine";
import { useTheme } from "./lib/theme";
import type { ChatRef } from "./lib/engine";
import type { AppEvent, ChatMessage } from "./lib/shell";
import { run as runTerminal, terminalForSandbox } from "./lib/terminal";
import {
  focus as focusWindow,
  loadBoard,
  place,
  saveBoard,
  tidy,
  type TerminalWindow,
} from "./lib/board";
import type { TerminalLine, TerminalSession } from "./lib/engine";
import {
  activities,
  activeTab,
  agentTab,
  chatTab,
  closeGroup,
  closeTab,
  defaultLayout,
  focusTab,
  loadShell,
  modelTab,
  moveTab,
  newProjectTab,
  projectTab,
  openTab,
  pruneLayout,
  sandboxTab,
  saveShell,
  settingsTab,
  splitRight,
  terminalsTab,
  studioTab,
  usageTab,
  workbenchChatTab,
  type ActivityId,
  type Group,
  type Layout,
  type TabSpec,
} from "./lib/layout";

/** Threads are keyed by chat id. An agent's first chat opens with its last
 *  message, so a chat starts with context instead of a blank pane. */
function seedThreads(snapshot: DesktopSnapshot): Record<string, ChatMessage[]> {
  const threads: Record<string, ChatMessage[]> = { workbench: [] };
  for (const agent of snapshot.agents) {
    agent.chats.forEach((chat, index) => {
      threads[chat.id] =
        index === 0
          ? [
              {
                id: `${chat.id}-seed`,
                role: "assistant",
                text: agent.lastMessage,
                modelId: agent.modelId,
                tokens: agent.tokensOut,
                costUsd: agent.costUsd,
                sources: [`agent:${agent.id}`],
              },
            ]
          : [];
    });
  }
  return threads;
}

export default function App() {
  const theme = useTheme();
  const [snapshot, setSnapshot] = useState<DesktopSnapshot>(prototypeSnapshot);
  const [source, setSource] = useState<EngineSource>("preview");

  const [layout, setLayout] = useState<Layout>(defaultLayout);
  const [activity, setActivity] = useState<ActivityId>("agents");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(252);
  const [restored, setRestored] = useState(false);

  const [rightOpen, setRightOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [activeTerminal, setActiveTerminal] = useState(prototypeSnapshot.terminals[0].id);

  /* Terminals are shared state: the bottom panel and every window on the board
     read the same buffer for the same terminal id, so one terminal has one
     history wherever it is shown. */
  const [buffers, setBuffers] = useState<Record<string, TerminalLine[]>>({});
  const [sessions, setSessions] = useState<Record<string, string | null>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<TerminalSession[]>([]);
  const [windows, setWindows] = useState<TerminalWindow[]>([]);
  const [boardRestored, setBoardRestored] = useState(false);

  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(() =>
    seedThreads(prototypeSnapshot),
  );
  const [extraChats, setExtraChats] = useState<Record<string, ChatRef[]>>({});
  const [busyThreads, setBusyThreads] = useState<Record<string, boolean>>({});
  const [chatModelId, setChatModelId] = useState(prototypeSnapshot.inspector.modelId);
  const [period, setPeriod] = useState("today");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [events, setEvents] = useState<AppEvent[]>([]);

  // A toast is gone in four seconds; the panel keeps what it said.
  const notify = useCallback((message: string) => {
    setToast(message);
    setEvents((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        at: new Date().toLocaleTimeString([], { hour12: false }),
        text: message,
      },
    ]);
  }, []);

  useEffect(() => {
    // The head script sets this before first paint; repeat it here in case the
    // IPC bridge lands after that ran. Native mode turns the page translucent
    // and leaves room for the traffic lights.
    if (isTauri()) document.documentElement.dataset.runtime = "tauri";
  }, []);

  useEffect(() => {
    loadSnapshot().then((result) => {
      setSnapshot(result.snapshot);
      setSource(result.source);
      setThreads(seedThreads(result.snapshot));
      setChatModelId(result.snapshot.inspector.modelId);
    });
  }, []);

  /* --------------------------------------------------------------- chats */

  const chatsOf = useCallback(
    (agentId: string): ChatRef[] => {
      const agent = snapshot.agents.find((item) => item.id === agentId);
      return [...(agent?.chats ?? []), ...(extraChats[agentId] ?? [])];
    },
    [extraChats, snapshot.agents],
  );

  const chatIds = useMemo(() => {
    const ids = new Set<string>(["workbench"]);
    for (const agent of snapshot.agents) for (const chat of chatsOf(agent.id)) ids.add(chat.id);
    return ids;
  }, [chatsOf, snapshot.agents]);

  /* -------------------------------------------------------------- layout */

  // Restore after mount, so the first render matches the prerendered HTML, and
  // only once the snapshot is in hand, so a tab cannot point at nothing.
  useEffect(() => {
    if (restored) return;
    const stored = loadShell();
    if (stored) {
      setLayout(pruneLayout(stored.layout, snapshot, chatIds));
      setActivity(stored.activity);
      setSidebarOpen(stored.sidebar);
      setSidebarWidth(stored.sidebarWidth);
    }
    setRestored(true);
  }, [chatIds, restored, snapshot]);

  useEffect(() => {
    if (restored) saveShell({ layout, activity, sidebar: sidebarOpen, sidebarWidth });
  }, [activity, layout, restored, sidebarOpen, sidebarWidth]);

  const open = useCallback((spec: TabSpec) => setLayout((current) => openTab(current, spec)), []);

  const openKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const group of layout.groups) for (const tab of group.tabs) keys.add(tab.key);
    return keys;
  }, [layout]);

  const focused = activeTab(layout);
  const focusedKey = focused?.key ?? "";

  const pickActivity = useCallback(
    (id: ActivityId) => {
      setActivity(id);
      setSidebarOpen((visible) => (id === activity ? !visible : true));
    },
    [activity],
  );

  /* ------------------------------------------------------------ terminals */

  const terminals = useMemo(
    () => [...snapshot.terminals, ...opened],
    [opened, snapshot.terminals],
  );

  /** One place where a terminal command is run, so the panel and the board
   *  behave identically and write to the same buffer. */
  const runInTerminal = useCallback(
    async (terminalId: string, input: string) => {
      const terminal = terminals.find((item) => item.id === terminalId);
      if (!terminal || !input.trim()) return;

      setRunning((current) => ({ ...current, [terminalId]: true }));
      const result = await runTerminal(input, {
        snapshot,
        terminal,
        session: sessions[terminalId] ?? null,
      });
      setBuffers((current) => ({
        ...current,
        [terminalId]: result.reset ? [] : [...(current[terminalId] ?? []), ...result.lines],
      }));
      setSessions((current) => ({ ...current, [terminalId]: result.session }));
      setRunning((current) => ({ ...current, [terminalId]: false }));
      if (result.notice) notify(result.notice);
    },
    [notify, sessions, snapshot, terminals],
  );

  // A terminal opened on the board is built from its sandbox and lives in this
  // session; the board remembers which sandbox, so it can be rebuilt on the
  // next start.
  const openTerminalWindow = useCallback(
    (sandboxId: string, existingId?: string, index?: number) => {
      const sandbox = snapshot.sandboxes.find((item) => item.id === sandboxId);
      if (!sandbox) return;
      const count = index ?? opened.filter((item) => item.sandboxId === sandboxId).length + 1;
      const terminal = existingId
        ? { ...terminalForSandbox(sandbox, count), id: existingId }
        : terminalForSandbox(sandbox, count);

      setOpened((current) =>
        current.some((item) => item.id === terminal.id) ? current : [...current, terminal],
      );
      setWindows((current) =>
        current.some((item) => item.terminalId === terminal.id)
          ? focusWindow(current, current.find((item) => item.terminalId === terminal.id)!.id)
          : [...current.map((item) => ({ ...item, focused: false })), place(current, terminal.id)],
      );
      return terminal.id;
    },
    [opened, snapshot.sandboxes],
  );

  /** Put a terminal the engine already ships on the board. */
  const showOnBoard = useCallback((terminalId: string) => {
    setWindows((current) => {
      const existing = current.find((item) => item.terminalId === terminalId);
      if (existing) return focusWindow(current, existing.id);
      return [...current.map((item) => ({ ...item, focused: false })), place(current, terminalId)];
    });
  }, []);

  useEffect(() => {
    if (boardRestored) return;
    const stored = loadBoard();
    if (stored) {
      // Rebuild the terminals this board opened before trusting its windows.
      const rebuilt = stored.opened
        .map((entry) => {
          const sandbox = snapshot.sandboxes.find((item) => item.id === entry.sandboxId);
          return sandbox
            ? { ...terminalForSandbox(sandbox, entry.index), id: entry.terminalId }
            : null;
        })
        .filter((item): item is TerminalSession => item !== null);
      const known = new Set([...snapshot.terminals.map((item) => item.id), ...rebuilt.map((item) => item.id)]);
      setOpened(rebuilt);
      setWindows(stored.windows.filter((item) => known.has(item.terminalId)));
    }
    setBoardRestored(true);
  }, [boardRestored, snapshot.sandboxes, snapshot.terminals]);

  useEffect(() => {
    if (!boardRestored) return;
    saveBoard({
      windows,
      opened: opened.map((item) => ({
        terminalId: item.id,
        sandboxId: item.sandboxId,
        index: Number(item.title.split(" ").pop()) || 1,
      })),
    });
  }, [boardRestored, opened, windows]);

  /* ---------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();

      const index = Number(key);
      if (index >= 1 && index <= activities.length) {
        event.preventDefault();
        pickActivity(activities[index - 1].id);
        return;
      }

      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
      if (key === "b") {
        event.preventDefault();
        setSidebarOpen((value) => !value);
      }
      if (key === "j") {
        event.preventDefault();
        setTerminalOpen((value) => !value);
      }
      if (key === "i") {
        event.preventDefault();
        setRightOpen((value) => !value);
      }
      if (key === "w") {
        event.preventDefault();
        setLayout((current) => {
          const tab = activeTab(current);
          return tab ? closeTab(current, current.activeGroupId, tab.key) : current;
        });
      }
      if (key === "\\") {
        event.preventDefault();
        setLayout((current) => {
          const tab = activeTab(current);
          return tab ? splitRight(current, current.activeGroupId, tab.key) : current;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickActivity]);

  /* ------------------------------------------------------- sidebar width */

  const shell = useRef<HTMLDivElement>(null);
  const startSidebarDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const move = (moveEvent: PointerEvent) =>
      setSidebarWidth(Math.min(Math.max(startWidth + (moveEvent.clientX - startX), 200), 440));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* ---------------------------------------------------------------- work */

  const chatModel =
    snapshot.models.find((model) => model.id === chatModelId) ?? snapshot.models[0];

  /** A second chat against the same agent: local until the daemon persists it. */
  const newChat = useCallback(
    (agentId: string) => {
      const agent = snapshot.agents.find((item) => item.id === agentId);
      if (!agent) return;
      const existing = chatsOf(agentId).length;
      const chat: ChatRef = {
        id: `${agentId}-chat-${existing + 1}`,
        title: `Chat ${existing + 1}`,
        updatedAt: "now",
      };
      setExtraChats((current) => ({ ...current, [agentId]: [...(current[agentId] ?? []), chat] }));
      setThreads((current) => ({ ...current, [chat.id]: [] }));
      open(chatTab(chat, agent));
      notify("Extra chats live in this session until the workbench daemon stores them.");
    },
    [chatsOf, notify, open, snapshot.agents],
  );

  const send = useCallback(
    async (thread: string, agentId: string | null, text: string) => {
      const agent = snapshot.agents.find((item) => item.id === agentId) ?? null;
      const stamp = Date.now();

      setThreads((current) => ({
        ...current,
        [thread]: [...(current[thread] ?? []), { id: `u${stamp}`, role: "user", text }],
      }));
      setBusyThreads((current) => ({ ...current, [thread]: true }));

      const answer = await ask(text, snapshot);

      setThreads((current) => {
        const existing = current[thread] ?? [];
        const notice: ChatMessage[] = agent
          ? [
              {
                id: `s${stamp}`,
                role: "system",
                text: `${agent.name} cannot run yet — the provider runtime is still on the Swift app. The built-in inspector answered from the snapshot instead.`,
              },
            ]
          : [];
        return {
          ...current,
          [thread]: [
            ...existing,
            ...notice,
            {
              id: `a${stamp}`,
              role: "assistant",
              text: answer.text,
              modelId: answer.modelId,
              tokens: answer.tokens,
              costUsd: answer.costUsd,
              sources: answer.sources,
              refused: answer.refused,
              redacted: answer.redacted,
            },
          ],
        };
      });
      setBusyThreads((current) => ({ ...current, [thread]: false }));
    },
    [snapshot],
  );

  const openAgentChat = useCallback(
    (agentId: string) => {
      const agent = snapshot.agents.find((item) => item.id === agentId);
      if (!agent) return;
      const chat = chatsOf(agentId)[0];
      if (chat) open(chatTab(chat, agent));
      else newChat(agentId);
    },
    [chatsOf, newChat, open, snapshot.agents],
  );

  /** One tab to one view. Every surface is reachable from more than one place,
   *  so the mapping lives here rather than in each caller. */
  const renderTab = useCallback(
    (tab: TabSpec, group: Group) => {
      switch (tab.view) {
        case "chat": {
          const thread = tab.target ?? "workbench";
          const agent = snapshot.agents.find((item) => item.id === tab.agentId) ?? null;
          return (
            <ChatView
              snapshot={snapshot}
              agent={agent}
              model={chatModel}
              workspace={agent?.project.name ?? "Open Cube"}
              source={source}
              branch={agent?.project.branch ?? snapshot.versionControl.branch}
              messages={threads[thread] ?? []}
              busy={busyThreads[thread] ?? false}
              onSend={(text) => send(thread, tab.agentId ?? null, text)}
              onOpenAgent={(id) => {
                const target = snapshot.agents.find((item) => item.id === id);
                if (target) open(agentTab(target));
              }}
              onAction={notify}
            />
          );
        }
        case "project":
          return (
            <ProjectView
              snapshot={snapshot}
              projectId={tab.target ?? snapshot.projects[0].id}
              onOpenAgent={(id) => {
                const agent = snapshot.agents.find((item) => item.id === id);
                if (agent) open(agentTab(agent));
              }}
              onNewChat={openAgentChat}
              onOpenTerminal={() => setTerminalOpen(true)}
              onNewProject={() => open(newProjectTab())}
              onAction={notify}
            />
          );
        case "new-project":
          return (
            <NewProjectView
              snapshot={snapshot}
              onOpenProject={(id) => {
                const project = snapshot.projects.find((item) => item.id === id);
                if (project) open(projectTab(project));
              }}
              onAction={notify}
            />
          );
        case "terminals":
          return (
            <TerminalCanvasView
              snapshot={snapshot}
              windows={windows}
              terminals={terminals}
              buffers={buffers}
              sessions={sessions}
              busy={running}
              onMove={(id, patch) =>
                setWindows((current) =>
                  current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
                )
              }
              onFocus={(id) => setWindows((current) => focusWindow(current, id))}
              onClose={(id) => setWindows((current) => current.filter((item) => item.id !== id))}
              onOpen={(sandboxId) => openTerminalWindow(sandboxId)}
              onTidy={() =>
                setWindows((current) => {
                  const surface = document.querySelector(".board__surface");
                  const box = surface?.getBoundingClientRect();
                  return tidy(current, box?.width ?? 1200, box?.height ?? 700);
                })
              }
              onRun={runInTerminal}
              onAction={notify}
            />
          );
        case "canvas":
          return <CanvasView snapshot={snapshot} onAction={notify} />;
        case "sandboxes":
          return (
            <SandboxView
              snapshot={snapshot}
              sandboxId={tab.target ?? snapshot.sandboxes[0].id}
              onSelect={(id) => {
                const sandbox = snapshot.sandboxes.find((item) => item.id === id);
                if (sandbox) open(sandboxTab(sandbox));
              }}
              onOpenAgent={(id) => {
                const agent = snapshot.agents.find((item) => item.id === id);
                if (agent) open(agentTab(agent));
              }}
              onAction={notify}
            />
          );
        case "models":
          return (
            <ModelsView
              snapshot={snapshot}
              modelId={tab.target ?? snapshot.models[0].id}
              onSelect={(id) => {
                const model = snapshot.models.find((item) => item.id === id);
                if (model) open(modelTab(model));
              }}
              onAction={notify}
            />
          );
        case "usage":
          return <UsageView snapshot={snapshot} period={period} />;
        case "agent":
          return (
            <AgentView
              snapshot={snapshot}
              agentId={tab.target ?? snapshot.agents[0].id}
              onChat={openAgentChat}
              onSandbox={(id) => {
                const sandbox = snapshot.sandboxes.find((item) => item.id === id);
                if (sandbox) open(sandboxTab(sandbox));
              }}
              onModel={(id) => {
                const model = snapshot.models.find((item) => item.id === id);
                if (model) open(modelTab(model));
              }}
              onStudio={(id) => {
                const agent = snapshot.agents.find((item) => item.id === id);
                if (agent) open(studioTab(agent));
              }}
              onAction={notify}
            />
          );
        case "studio":
          // No target means "design one"; a target means "refine this one".
          if (!tab.target) {
            return (
              <NewAgentView
                snapshot={snapshot}
                onOpenEditor={(id) => {
                  const agent = snapshot.agents.find((item) => item.id === id);
                  if (agent) open(studioTab(agent));
                }}
                onAction={notify}
              />
            );
          }
          return (
            <AgentStudioView
              snapshot={snapshot}
              agentId={tab.target ?? null}
              onSelectAgent={(id) => {
                const agent = snapshot.agents.find((item) => item.id === id);
                if (agent) open(studioTab(agent));
              }}
              onOpenChat={openAgentChat}
              onNewAgent={() => open(studioTab(null))}
              onAction={notify}
            />
          );
        case "settings":
          return (
            <SettingsView
              snapshot={snapshot}
              source={source}
              theme={theme.choice}
              onTheme={theme.setChoice}
              onAction={notify}
            />
          );
        default:
          return <div className="watermark">Nothing to show in {group.id}.</div>;
      }
    },
    [
      buffers,
      busyThreads,
      chatModel,
      openTerminalWindow,
      running,
      runInTerminal,
      sessions,
      terminals,
      windows,
      notify,
      open,
      openAgentChat,
      period,
      send,
      snapshot,
      source,
      theme.choice,
      theme.setChoice,
      threads,
    ],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="app">
      <TopBar
        snapshot={snapshot}
        source={source}
        chatModel={chatModel}
        onChatModel={setChatModelId}
        panels={{ left: sidebarOpen, right: rightOpen, terminal: terminalOpen }}
        onTogglePanel={(panel) => {
          if (panel === "left") setSidebarOpen((value) => !value);
          if (panel === "right") setRightOpen((value) => !value);
          if (panel === "terminal") setTerminalOpen((value) => !value);
        }}
        onPalette={() => setPaletteOpen(true)}
        onUsage={() => open(usageTab())}
        period={period}
        onPeriod={setPeriod}
        onAction={notify}
      />

      <div className="app__body" ref={shell}>
        <ActivityBar
          activity={activity}
          sidebarOpen={sidebarOpen}
          counts={{
            projects: snapshot.projects.length,
            agents: snapshot.agents.length,
            sandboxes: snapshot.sandboxes.length,
            vcs: snapshot.versionControl.changes.length,
          }}
          onPick={pickActivity}
          onSettings={() => open(settingsTab())}
          onShortcuts={() =>
            notify(
              "⌘K palette · ⌘B sidebar · ⌘J panel · ⌘I workbench API · ⌘\\ split · ⌘W close · ⌘1–⌘7 areas",
            )
          }
        />

        {sidebarOpen && (
          <div className="sidebar-slot" style={{ width: sidebarWidth }}>
            <Sidebar
              snapshot={snapshot}
              activity={activity}
              openKeys={openKeys}
              focusedKey={focusedKey}
              onOpen={open}
              onOpenTerminal={(id) => {
                if (id === "board") {
                  open(terminalsTab());
                  return;
                }
                setActiveTerminal(id);
                setTerminalOpen(true);
              }}
              onAction={notify}
              chatsOf={chatsOf}
              onNewChat={newChat}
              onClose={() => setSidebarOpen(false)}
            />
            <div
              className="sidebar-slot__grip"
              role="separator"
              aria-label="Resize the sidebar"
              onPointerDown={startSidebarDrag}
            />
          </div>
        )}

        <main className="workspace">
          <EditorGroups
            layout={layout}
            render={renderTab}
            onFocusGroup={(groupId) =>
              setLayout((current) => ({ ...current, activeGroupId: groupId }))
            }
            onFocusTab={(groupId, key) => setLayout((current) => focusTab(current, groupId, key))}
            onCloseTab={(groupId, key) => setLayout((current) => closeTab(current, groupId, key))}
            onSplit={(groupId, key) => setLayout((current) => splitRight(current, groupId, key))}
            onCloseGroup={(groupId) => setLayout((current) => closeGroup(current, groupId))}
            onMoveTab={(from, key, to) => setLayout((current) => moveTab(current, from, key, to))}
            onEmptyAction={() => open(workbenchChatTab())}
          />

          {terminalOpen && (
            <TerminalDock
              snapshot={snapshot}
              terminals={terminals}
              activeId={activeTerminal}
              onActive={setActiveTerminal}
              buffers={buffers}
              sessions={sessions}
              busy={running}
              onRun={runInTerminal}
              onBoard={(id) => {
                showOnBoard(id);
                open(terminalsTab());
              }}
              height={terminalHeight}
              onHeight={setTerminalHeight}
              onClose={() => setTerminalOpen(false)}
              onAction={notify}
              events={events}
            />
          )}
        </main>

        {rightOpen && (
          <RightRail snapshot={snapshot} onClose={() => setRightOpen(false)} onAction={notify} />
        )}
      </div>

      <StatusBar
        snapshot={snapshot}
        source={source}
        model={chatModel}
        sandboxId={
          focused?.view === "sandboxes" ? (focused.target ?? snapshot.sandboxes[0].id) : snapshot.sandboxes[0].id
        }
        onSelectUsage={() => open(usageTab())}
      />

      {toast && (
        <div className="toast" role="status">
          <Icon name="alert" size={15} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
        </div>
      )}

      <CommandPalette
        open={paletteOpen}
        snapshot={snapshot}
        chatsOf={chatsOf}
        onClose={() => setPaletteOpen(false)}
        onOpen={open}
        onActivity={pickActivity}
        onAction={notify}
      />
    </div>
  );
}
