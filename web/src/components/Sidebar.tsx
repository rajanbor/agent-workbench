import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { RailSection } from "./RailSection";
import { AgentFace, ModelGlyph } from "./Glyph";
import { Badge, IconButton, StatusDot } from "./primitives";
import { accentOf, modelOf, toneOf } from "../lib/identity";
import {
  activities,
  agentTab,
  canvasTab,
  chatTab,
  modelTab,
  newProjectTab,
  projectTab,
  sandboxTab,
  studioTab,
  terminalsTab,
  usageTab,
  workbenchChatTab,
  type ActivityId,
  type TabSpec,
} from "../lib/layout";
import type { ChatRef, DesktopSnapshot } from "../lib/engine";

type Props = {
  snapshot: DesktopSnapshot;
  activity: ActivityId;
  /** Keys of every tab open anywhere, and the one with focus. */
  openKeys: Set<string>;
  focusedKey: string;
  onOpen: (spec: TabSpec) => void;
  onOpenTerminal: (terminalId: string) => void;
  onAction: (message: string) => void;
  /** Chats held against each agent: the engine's, plus this session's. */
  chatsOf: (agentId: string) => ChatRef[];
  onNewChat: (agentId: string) => void;
  onClose: () => void;
};

/** The panel between the activity strip and the work area. It shows one area
 *  at a time — whichever icon is lit — and never more, so the eye has one list
 *  to read instead of six stacked on each other. */
export function Sidebar(props: Props) {
  const area = activities.find((item) => item.id === props.activity);

  return (
    <aside className="sidebar" aria-label={`${area?.title ?? "Workbench"} sidebar`}>
      <header className="sidebar__head">
        <span>{area?.title}</span>
        <div className="sidebar__head-actions">
          {props.activity === "agents" && (
            <IconButton
              icon="plus"
              label="Design a new agent"
              size={13}
              onClick={() => props.onOpen(studioTab(null))}
            />
          )}
          {props.activity === "projects" && (
            <IconButton
              icon="plus"
              label="New project"
              size={13}
              onClick={() => props.onOpen(newProjectTab())}
            />
          )}
          <IconButton icon="close" label="Hide the sidebar" size={13} onClick={props.onClose} />
        </div>
      </header>

      <div className="sidebar__scroll">
        {props.activity === "projects" && <ProjectArea {...props} />}
        {props.activity === "agents" && <AgentsArea {...props} />}
        {props.activity === "search" && <SearchArea {...props} />}
        {props.activity === "vcs" && <SourceControlArea {...props} />}
        {props.activity === "sandboxes" && <SandboxArea {...props} />}
        {props.activity === "models" && <ModelArea {...props} />}
        {props.activity === "workflows" && <WorkflowArea {...props} />}
      </div>
    </aside>
  );
}

/* --------------------------------------------------------------- projects */

function ProjectArea({ snapshot, focusedKey, onOpen }: Props) {
  const create = newProjectTab();
  return (
    <>
      <RailSection title="Projects" count={snapshot.projects.length}>
        {snapshot.projects.map((project) => {
          const tab = projectTab(project);
          return (
            <div key={project.id} className="rail-project">
              <button
                className={`rail-row ${focusedKey === tab.key ? "is-active" : ""}`}
                onClick={() => onOpen(tab)}
                title={project.summary}
              >
                <span className="rail-row__icon">
                  <Icon name="folder" size={15} />
                </span>
                <span className="rail-row__main">
                  <strong>{project.name}</strong>
                  <small className="mono">{project.path}</small>
                </span>
                <span className="rail-row__tail">
                  {project.dirty > 0 && <em>{project.dirty}</em>}
                  <StatusDot tone={project.kind === "git" ? "green" : "neutral"} />
                </span>
              </button>

              {/* The top of the tree, so a project is a place and not a name. */}
              {focusedKey === tab.key && (
                <div className="rail-tree">
                  {project.entries.map((entry) => (
                    <p key={entry.name} title={entry.detail}>
                      <Icon name={entry.kind === "dir" ? "folder" : "logs"} size={12} />
                      <span className="mono">{entry.name}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </RailSection>

      <button
        className={`rail-row ${focusedKey === create.key ? "is-active" : ""}`}
        onClick={() => onOpen(create)}
      >
        <span className="rail-row__icon">
          <Icon name="plus" size={15} />
        </span>
        <span className="rail-row__main">
          <strong>New project</strong>
          <small>from a template, a folder or a repository</small>
        </span>
      </button>
    </>
  );
}

/* ----------------------------------------------------------------- agents */

function AgentsArea({ snapshot, openKeys, focusedKey, onOpen, chatsOf, onNewChat }: Props) {
  const workbench = workbenchChatTab();

  return (
    <>
      {/* Pinned above the sections: the window always has somewhere to start. */}
      <button
        className={`rail-row rail-row--pinned ${focusedKey === workbench.key ? "is-active" : ""}`}
        onClick={() => onOpen(workbench)}
      >
        <ModelGlyph icon="cube" accent="accent" size={22} />
        <span className="rail-row__main">
          <strong>Workbench chat</strong>
        </span>
      </button>

      <RailSection title="Agents" count={snapshot.agents.length}>
        {snapshot.agents.map((agent) => {
          const chats = chatsOf(agent.id);
          const tab = agentTab(agent);
          const mine = chats.some((chat) => openKeys.has(`chat:${chat.id}`));
          const expanded = mine || focusedKey === tab.key;
          return (
            <div key={agent.id} className="rail-agent">
              <div className={`rail-row rail-row--agent ${focusedKey === tab.key ? "is-active" : ""}`}>
                <button
                  className="rail-row__open"
                  onClick={() => onOpen(tab)}
                  title={`${agent.name} — ${agent.task}`}
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
                <IconButton
                  icon="sliders"
                  label={`Design ${agent.name}`}
                  size={13}
                  className="rail-row__side"
                  onClick={() => onOpen(studioTab(agent))}
                />
              </div>

              {/* Chats sit under their own agent, not in a strip of their own. */}
              {expanded && (
                <div className="rail-chats">
                  <div className="rail-chats__head">
                    <span>Chats</span>
                    <button
                      title={`New chat with ${agent.name}`}
                      aria-label="New chat"
                      onClick={() => onNewChat(agent.id)}
                    >
                      <Icon name="plus" size={13} />
                    </button>
                  </div>
                  {chats.map((chat) => {
                    const key = `chat:${chat.id}`;
                    return (
                      <button
                        key={chat.id}
                        className={`rail-chat ${focusedKey === key ? "is-active" : ""} ${
                          openKeys.has(key) ? "is-open" : ""
                        }`}
                        onClick={() => onOpen(chatTab(chat, agent))}
                      >
                        <Icon name={focusedKey === key ? "git" : "dot"} size={13} />
                        <span>{chat.title}</span>
                        <em>{chat.updatedAt}</em>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </RailSection>
    </>
  );
}

/* ----------------------------------------------------------------- search */

function SearchArea({ snapshot, onOpen, chatsOf }: Props) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const hits = useMemo(() => {
    if (!needle) return [];
    const found: { key: string; title: string; hint: string; icon: string; spec: TabSpec }[] = [];
    const add = (title: string, hint: string, icon: string, spec: TabSpec) => {
      if (!title.toLowerCase().includes(needle) && !hint.toLowerCase().includes(needle)) return;
      found.push({ key: spec.key, title, hint, icon, spec });
    };

    for (const agent of snapshot.agents) {
      add(agent.name, `${agent.role} · ${agent.task}`, "agent", agentTab(agent));
      for (const chat of chatsOf(agent.id)) add(chat.title, `chat · ${agent.name}`, "session", chatTab(chat, agent));
    }
    for (const project of snapshot.projects) {
      add(project.name, `project · ${project.path}`, "folder", projectTab(project));
    }
    for (const sandbox of snapshot.sandboxes) {
      add(sandbox.name, `sandbox · ${sandbox.isolation}`, "sandbox", sandboxTab(sandbox));
    }
    for (const model of snapshot.models) {
      add(model.name, `model · ${model.vendor} · ${model.version}`, model.icon, modelTab(model));
    }
    add("Usage and cost", "tokens, cost and activity", "bolt", usageTab());
    add(snapshot.workflow.name, "workflow · canvas", "canvas", canvasTab(snapshot.workflow.name));
    return found.slice(0, 30);
  }, [chatsOf, needle, snapshot]);

  return (
    <div className="sidebar__search">
      <label className="search-field">
        <Icon name="search" size={14} />
        <input
          value={query}
          placeholder="Agents, chats, sandboxes, models"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search this workspace"
        />
        {query && (
          <button aria-label="Clear" onClick={() => setQuery("")}>
            <Icon name="close" size={12} />
          </button>
        )}
      </label>

      {!needle && (
        <p className="sidebar__hint">
          Search reads the snapshot this window already holds — agents, their chats, sandboxes,
          models and workflows. File contents need the workbench daemon.
        </p>
      )}
      {needle && hits.length === 0 && <p className="sidebar__hint">Nothing matches “{query}”.</p>}

      {hits.map((hit) => (
        <button key={hit.key} className="rail-row" onClick={() => onOpen(hit.spec)}>
          <span className="rail-row__icon">
            <Icon name={hit.icon} size={15} />
          </span>
          <span className="rail-row__main">
            <strong>{hit.title}</strong>
            <small>{hit.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------- source control */

function SourceControlArea({ snapshot, onAction }: Props) {
  const vcs = snapshot.versionControl;

  return (
    <>
      <div className="scm-head">
        <span className="scm-head__branch">
          <Icon name="git" size={14} />
          <strong className="mono">{vcs.branch}</strong>
        </span>
        <span className="scm-head__counts mono">
          ↑{vcs.ahead} ↓{vcs.behind}
        </span>
      </div>

      <RailSection title="Changes" count={vcs.changes.length}>
        {vcs.changes.length === 0 && <p className="sidebar__hint">The working tree is clean.</p>}
        {vcs.changes.map((change) => (
          <button
            key={change.path}
            className="rail-row rail-row--tight"
            onClick={() => onAction("Diffs open with the workbench daemon.")}
            title={change.path}
          >
            <span className="rail-row__icon">
              <Icon name="logs" size={14} />
            </span>
            <span className="rail-row__main">
              <strong className="mono">{change.path.split("/").pop()}</strong>
              <small className="mono">{change.path}</small>
            </span>
            <Badge tone={change.state === "added" ? "green" : "amber"}>
              {change.state[0].toUpperCase()}
            </Badge>
          </button>
        ))}
      </RailSection>

      <RailSection title="Branches" count={vcs.branches.length}>
        {vcs.branches.map((branch) => (
          <button
            key={branch.name}
            className={`rail-row rail-row--tight ${branch.current ? "is-active" : ""}`}
            onClick={() =>
              onAction(
                branch.current
                  ? `Already on ${branch.name}.`
                  : `Switching to ${branch.name} needs the workbench daemon.`,
              )
            }
          >
            <span className="rail-row__icon">
              <Icon name={branch.current ? "check" : "fork"} size={14} />
            </span>
            <span className="rail-row__main">
              <strong className="mono">{branch.name}</strong>
              <small>
                {branch.ahead} ahead · {branch.behind} behind · {branch.updated}
              </small>
            </span>
          </button>
        ))}
      </RailSection>

      <RailSection title="Recent commits" count={vcs.recent.length} defaultOpen={false}>
        {vcs.recent.map((commit) => (
          <button
            key={commit.hash}
            className="rail-row rail-row--tight"
            onClick={() => onAction(`${commit.hash} · ${commit.title}`)}
          >
            <span className="rail-row__icon">
              <Icon name="commit" size={14} />
            </span>
            <span className="rail-row__main">
              <strong>{commit.title}</strong>
              <small className="mono">
                {commit.hash} · {commit.author} · {commit.when}
              </small>
            </span>
          </button>
        ))}
      </RailSection>
    </>
  );
}

/* -------------------------------------------------------------- sandboxes */

function SandboxArea({ snapshot, focusedKey, onOpen, onOpenTerminal }: Props) {
  return (
    <>
      <RailSection title="Sandboxes" count={snapshot.sandboxes.length}>
        {snapshot.sandboxes.map((sandbox) => {
          const tab = sandboxTab(sandbox);
          return (
            <button
              key={sandbox.id}
              className={`rail-row ${focusedKey === tab.key ? "is-active" : ""}`}
              onClick={() => onOpen(tab)}
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
          );
        })}
      </RailSection>

      <RailSection title="Terminals" count={snapshot.terminals.length}>
        <button
          className={`rail-row ${focusedKey === terminalsTab().key ? "is-active" : ""}`}
          onClick={() => onOpen(terminalsTab())}
        >
          <span className="rail-row__icon">
            <Icon name="canvas" size={15} />
          </span>
          <span className="rail-row__main">
            <strong>Terminal board</strong>
            <small>many at once, with agent sessions in them</small>
          </span>
        </button>
        {snapshot.terminals.map((terminal) => (
          <button key={terminal.id} className="rail-row" onClick={() => onOpenTerminal(terminal.id)}>
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
    </>
  );
}

/* ----------------------------------------------------------------- models */

function ModelArea({ snapshot, focusedKey, onOpen }: Props) {
  const usage = usageTab();
  return (
    <>
      <RailSection title="Models" count={snapshot.models.length}>
        {snapshot.models.map((model) => {
          const tab = modelTab(model);
          return (
            <button
              key={model.id}
              className={`rail-row ${focusedKey === tab.key ? "is-active" : ""}`}
              onClick={() => onOpen(tab)}
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
          );
        })}
      </RailSection>

      <button
        className={`rail-row ${focusedKey === usage.key ? "is-active" : ""}`}
        onClick={() => onOpen(usage)}
      >
        <span className="rail-row__icon">
          <Icon name="bolt" size={15} />
        </span>
        <span className="rail-row__main">
          <strong>Usage and cost</strong>
          <small>every period, per model and per agent</small>
        </span>
      </button>
    </>
  );
}

/* -------------------------------------------------------------- workflows */

function WorkflowArea({ snapshot, focusedKey, onOpen }: Props) {
  const tab = canvasTab(snapshot.workflow.name);
  return (
    <RailSection title="Workflows" count={1}>
      <button
        className={`rail-row ${focusedKey === tab.key ? "is-active" : ""}`}
        onClick={() => onOpen(tab)}
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
  );
}
