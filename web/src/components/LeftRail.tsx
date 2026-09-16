import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { RailSection } from "./RailSection";
import { AgentFace, ModelGlyph } from "./Glyph";
import { Avatar, StatusDot } from "./primitives";
import { accentOf, modelOf, toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";
import type { ThemeChoice } from "../lib/theme";
import type { Selection, ViewId } from "../lib/shell";

type Props = {
  snapshot: DesktopSnapshot;
  view: ViewId;
  selection: Selection;
  onSelect: (view: ViewId, selection?: Partial<Selection>) => void;
  onOpenTerminal: (terminalId: string) => void;
  onAction: (message: string) => void;
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
};

export function LeftRail({
  snapshot,
  view,
  selection,
  onSelect,
  onOpenTerminal,
  onAction,
  theme,
  onTheme,
}: Props) {
  const isChat = (id: string) => view === "chat" && selection.chat === id;
  const isAgent = (id: string) => view === "chat" && selection.agent === id;

  return (
    <aside className="rail rail--left">
      <div className="rail__scroll">
        {/* Pinned above the sections: the window always has somewhere to start. */}
        <button
          className={`rail-row rail-row--pinned ${isChat("workbench") ? "is-active" : ""}`}
          onClick={() => onSelect("chat", { chat: "workbench", agent: null })}
        >
          <ModelGlyph icon="cube" accent="accent" size={22} />
          <span className="rail-row__main">
            <strong>Workbench chat</strong>
          </span>
        </button>

        <RailSection
          title="Agents"
          count={snapshot.agents.length}
          action={{
            icon: "plus",
            label: "Design a new agent",
            onClick: () => onSelect("studio", { agent: null }),
          }}
        >
          {snapshot.agents.map((agent) => (
            <button
              key={agent.id}
              className={`rail-row rail-row--agent ${isAgent(agent.id) ? "is-active" : ""}`}
              onClick={() =>
                onSelect("chat", { chat: agent.chats[0]?.id ?? agent.id, agent: agent.id })
              }
              title={agent.task}
            >
              <AgentFace accent={accentOf(agent.accent)} size={24} />
              <span className="rail-row__main">
                <strong>{agent.name}</strong>
                <small>
                  {modelOf(snapshot, agent.modelId)?.name ?? "no model"} · {agent.status} ·{" "}
                  {agent.project.branch}
                </small>
              </span>
              <span className="rail-row__tail">
                <StatusDot tone={toneOf(agent.status)} pulse={agent.status === "running"} />
                <em>{agent.updatedAt}</em>
              </span>
            </button>
          ))}
        </RailSection>

        <RailSection title="Sandboxes" count={snapshot.sandboxes.length}>
          {snapshot.sandboxes.map((sandbox) => (
            <button
              key={sandbox.id}
              className={`rail-row ${
                view === "sandboxes" && selection.sandbox === sandbox.id ? "is-active" : ""
              }`}
              onClick={() => onSelect("sandboxes", { sandbox: sandbox.id })}
            >
              <span className="rail-row__icon">
                <Icon name="sandbox" size={15} />
              </span>
              <span className="rail-row__main">
                <strong className="mono">{sandbox.name}</strong>
                <small>
                  {sandbox.agents.length} agents · network {sandbox.network.mode}
                </small>
              </span>
              <span className="rail-row__tail">
                <StatusDot tone={toneOf(sandbox.state)} pulse={sandbox.state === "active"} />
              </span>
            </button>
          ))}
        </RailSection>

        <RailSection title="Terminals" count={snapshot.terminals.length}>
          {snapshot.terminals.map((terminal) => (
            <button
              key={terminal.id}
              className="rail-row"
              onClick={() => onOpenTerminal(terminal.id)}
            >
              <span className="rail-row__icon">
                <Icon name="terminal" size={15} />
              </span>
              <span className="rail-row__main">
                <strong className="mono">{terminal.title}</strong>
                <small>
                  {terminal.shell} · {terminal.state}
                </small>
              </span>
            </button>
          ))}
        </RailSection>

        <RailSection title="Workflows" count={1}>
          <button
            className={`rail-row ${view === "canvas" ? "is-active" : ""}`}
            onClick={() => onSelect("canvas")}
          >
            <span className="rail-row__icon">
              <Icon name="canvas" size={15} />
            </span>
            <span className="rail-row__main">
              <strong>{snapshot.workflow.name}</strong>
              <small>
                {snapshot.workflow.nodes.length} nodes · {snapshot.workflow.edges.length} links
              </small>
            </span>
          </button>
        </RailSection>

        <RailSection title="Models" count={snapshot.models.length} defaultOpen={false}>
          {snapshot.models.map((model) => (
            <button
              key={model.id}
              className={`rail-row ${
                view === "models" && selection.model === model.id ? "is-active" : ""
              }`}
              onClick={() => onSelect("models", { model: model.id })}
            >
              <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={22} />
              <span className="rail-row__main">
                <strong>{model.name}</strong>
                <small className="mono">{model.version}</small>
              </span>
              <span className="rail-row__tail">
                <StatusDot tone={model.ready ? "green" : "neutral"} />
              </span>
            </button>
          ))}
        </RailSection>
      </div>


      <footer className="rail__account">
        <Menu
          className="menu--account"
          placement="above"
          title="Account and appearance"
          label={
            <>
              <Avatar name="Rajan Bor" tone="accent" />
              <span className="rail__account-name">
                <strong>Rajan Bor</strong>
                <small>Local account</small>
              </span>
            </>
          }
        >
          {(close) => (
            <>
              <p className="menu__label">Account</p>
              <div className="menu__note">
                Open Cube has no sign-in. This profile is local to the machine, and no
                provider credential is stored by the app.
              </div>
              <button
                className="menu__item"
                onClick={() => {
                  onSelect("settings");
                  close();
                }}
              >
                <Icon name="settings" size={14} />
                <span>Settings</span>
              </button>
              <button
                className="menu__item"
                onClick={() => {
                  onAction("⌘K palette · ⌘B agents · ⌘J terminals · ⌘I workbench API");
                  close();
                }}
              >
                <Icon name="code" size={14} />
                <span>Keyboard shortcuts</span>
              </button>
              <p className="menu__label">Appearance</p>
              {(["light", "dark", "system"] as ThemeChoice[]).map((option) => (
                <button
                  key={option}
                  className={`menu__item ${theme === option ? "is-checked" : ""}`}
                  onClick={() => {
                    onTheme(option);
                    close();
                  }}
                >
                  <Icon
                    name={option === "light" ? "sun" : option === "dark" ? "moon" : "monitor"}
                    size={14}
                  />
                  <span className="capitalize">{option}</span>
                  {theme === option && <Icon name="check" size={13} />}
                </button>
              ))}
            </>
          )}
        </Menu>
      </footer>
    </aside>
  );
}
