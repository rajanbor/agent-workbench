import { Icon } from "./Icon";
import { RailSection } from "./RailSection";
import { AgentFace, ModelGlyph } from "./Glyph";
import { StatusDot } from "./primitives";
import { accentOf, toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";
import type { Selection, ViewId } from "../lib/shell";

type Props = {
  snapshot: DesktopSnapshot;
  view: ViewId;
  selection: Selection;
  onSelect: (view: ViewId, selection?: Partial<Selection>) => void;
  onOpenTerminal: (terminalId: string) => void;
  onAction: (message: string) => void;
};

export function LeftRail({ snapshot, view, selection, onSelect, onOpenTerminal, onAction }: Props) {
  const isChat = (id: string) => view === "chat" && selection.chat === id;

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
            label: "New agent",
            onClick: () => onAction("Creating agents needs the workbench daemon."),
          }}
        >
          {snapshot.agents.map((agent) => (
            <button
              key={agent.id}
              className={`rail-row ${isChat(agent.id) ? "is-active" : ""}`}
              onClick={() => onSelect("chat", { chat: agent.id, agent: agent.id })}
            >
              <AgentFace accent={accentOf(agent.accent)} size={24} />
              <span className="rail-row__main">
                <strong>{agent.name}</strong>
                <small>{agent.task}</small>
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

    </aside>
  );
}
