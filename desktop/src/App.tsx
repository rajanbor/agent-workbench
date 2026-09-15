import { useCallback, useEffect, useMemo, useState } from "react";
import "./styles/tokens.css";
import "./styles/app.css";

import { TopBar } from "./components/TopBar";
import { LeftRail } from "./components/LeftRail";
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
import type { ChatMessage, Selection, ViewId } from "./lib/shell";

/** First message of an agent thread, so a chat opens with context, not a blank pane. */
function seedThreads(snapshot: DesktopSnapshot): Record<string, ChatMessage[]> {
  const threads: Record<string, ChatMessage[]> = { workbench: [] };
  for (const agent of snapshot.agents) {
    threads[agent.id] = [
      {
        id: `${agent.id}-seed`,
        role: "assistant",
        text: agent.lastMessage,
        modelId: agent.modelId,
        tokens: agent.tokensOut,
        costUsd: agent.costUsd,
        sources: [`agent:${agent.id}`],
      },
    ];
  }
  return threads;
}

export default function App() {
  const theme = useTheme();
  const [snapshot, setSnapshot] = useState<DesktopSnapshot>(prototypeSnapshot);
  const [source, setSource] = useState<EngineSource>("preview");
  const [view, setView] = useState<ViewId>("chat");
  const [selection, setSelection] = useState<Selection>({
    chat: "workbench",
    agent: null,
    sandbox: prototypeSnapshot.sandboxes[0].id,
    model: prototypeSnapshot.models[0].id,
  });
  const [panels, setPanels] = useState({ left: true, right: false, terminal: false });
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [activeTerminal, setActiveTerminal] = useState(prototypeSnapshot.terminals[0].id);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(() =>
    seedThreads(prototypeSnapshot),
  );
  const [busy, setBusy] = useState(false);
  const [chatModelId, setChatModelId] = useState(prototypeSnapshot.inspector.modelId);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => setToast(message), []);

  useEffect(() => {
    // index.html sets this before first paint; repeat it here in case the IPC
    // bridge lands after the head script ran. Native mode turns the page
    // transparent and leaves room for the traffic lights.
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const togglePanel = useCallback((panel: "left" | "right" | "terminal") => {
    setPanels((current) => ({ ...current, [panel]: !current[panel] }));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (!meta) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (key === "b") {
        event.preventDefault();
        togglePanel("left");
      }
      if (key === "j") {
        event.preventDefault();
        togglePanel("terminal");
      }
      if (key === "i") {
        event.preventDefault();
        togglePanel("right");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  const select = useCallback((next: ViewId, patch?: Partial<Selection>) => {
    setView(next);
    if (patch) setSelection((current) => ({ ...current, ...patch }));
  }, []);

  const chatModel =
    snapshot.models.find((model) => model.id === chatModelId) ?? snapshot.models[0];
  const activeAgent = useMemo(
    () => snapshot.agents.find((agent) => agent.id === selection.chat) ?? null,
    [selection.chat, snapshot.agents],
  );

  const send = useCallback(
    async (text: string) => {
      const thread = selection.chat;
      const agent = snapshot.agents.find((item) => item.id === thread) ?? null;
      const stamp = Date.now();

      setThreads((current) => ({
        ...current,
        [thread]: [...(current[thread] ?? []), { id: `u${stamp}`, role: "user", text }],
      }));
      setBusy(true);

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
      setBusy(false);
    },
    [selection.chat, snapshot],
  );

  return (
    <div className="app">
      <TopBar
        snapshot={snapshot}
        source={source}
        chatModel={chatModel}
        onChatModel={setChatModelId}
        panels={panels}
        onTogglePanel={togglePanel}
        theme={theme.choice}
        onTheme={theme.setChoice}
        onPalette={() => setPaletteOpen(true)}
        onUsage={() => select("usage")}
        onAction={notify}
      />

      <div className="app__body">
        {panels.left && (
          <LeftRail
            snapshot={snapshot}
            view={view}
            selection={selection}
            onSelect={select}
            onOpenTerminal={(id) => {
              setActiveTerminal(id);
              setPanels((current) => ({ ...current, terminal: true }));
            }}
            onAction={notify}
          />
        )}

        <main className="workspace">
          <div className="workspace__view">
            {view === "chat" && (
              <ChatView
                snapshot={snapshot}
                agent={activeAgent}
                model={chatModel}
                messages={threads[selection.chat] ?? []}
                busy={busy}
                onSend={send}
                onOpenAgent={(id) => select("agent", { agent: id })}
                onAction={notify}
              />
            )}
            {view === "canvas" && <CanvasView snapshot={snapshot} onAction={notify} />}
            {view === "sandboxes" && (
              <SandboxView
                snapshot={snapshot}
                sandboxId={selection.sandbox}
                onSelect={(id) => select("sandboxes", { sandbox: id })}
                onOpenAgent={(id) => select("agent", { agent: id })}
                onAction={notify}
              />
            )}
            {view === "models" && (
              <ModelsView
                snapshot={snapshot}
                modelId={selection.model}
                onSelect={(id) => select("models", { model: id })}
                onAction={notify}
              />
            )}
            {view === "usage" && <UsageView snapshot={snapshot} />}
            {view === "agent" && (
              <AgentView
                snapshot={snapshot}
                agentId={selection.agent ?? snapshot.agents[0].id}
                onChat={(id) => select("chat", { chat: id, agent: id })}
                onSandbox={(id) => select("sandboxes", { sandbox: id })}
                onModel={(id) => select("models", { model: id })}
                onAction={notify}
              />
            )}
            {view === "settings" && (
              <SettingsView
                snapshot={snapshot}
                source={source}
                theme={theme.choice}
                onTheme={theme.setChoice}
                onAction={notify}
              />
            )}
          </div>

          {panels.terminal && (
            <TerminalDock
              snapshot={snapshot}
              activeId={activeTerminal}
              onActive={setActiveTerminal}
              height={terminalHeight}
              onHeight={setTerminalHeight}
              onClose={() => togglePanel("terminal")}
              onAction={notify}
            />
          )}
        </main>

        {panels.right && (
          <RightRail snapshot={snapshot} onClose={() => togglePanel("right")} onAction={notify} />
        )}
      </div>

      <StatusBar
        snapshot={snapshot}
        source={source}
        model={chatModel}
        sandboxId={selection.sandbox}
        onSelectUsage={() => select("usage")}
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
        onClose={() => setPaletteOpen(false)}
        onSelect={select}
        onAction={notify}
      />
    </div>
  );
}
