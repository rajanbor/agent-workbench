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
import type { ChatMessage } from "./lib/shell";
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
  openTab,
  pruneLayout,
  sandboxTab,
  saveShell,
  settingsTab,
  splitRight,
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

  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(() =>
    seedThreads(prototypeSnapshot),
  );
  const [extraChats, setExtraChats] = useState<Record<string, ChatRef[]>>({});
  const [busyThreads, setBusyThreads] = useState<Record<string, boolean>>({});
  const [chatModelId, setChatModelId] = useState(prototypeSnapshot.inspector.modelId);
  const [period, setPeriod] = useState("today");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => setToast(message), []);

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
          return (
            <AgentStudioView
              snapshot={snapshot}
              agentId={tab.target ?? null}
              onSelectAgent={(id) => {
                const agent = snapshot.agents.find((item) => item.id === id);
                if (agent) open(studioTab(agent));
              }}
              onOpenChat={openAgentChat}
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
      busyThreads,
      chatModel,
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
            agents: snapshot.agents.length,
            sandboxes: snapshot.sandboxes.length,
            vcs: snapshot.versionControl.changes.length,
          }}
          onPick={pickActivity}
          onSettings={() => open(settingsTab())}
          onShortcuts={() =>
            notify("⌘K palette · ⌘B sidebar · ⌘J terminals · ⌘I workbench API · ⌘\\ split · ⌘W close")
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
              activeId={activeTerminal}
              onActive={setActiveTerminal}
              height={terminalHeight}
              onHeight={setTerminalHeight}
              onClose={() => setTerminalOpen(false)}
              onAction={notify}
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
