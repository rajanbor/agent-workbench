import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentFace } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import { accentOf, toneOf } from "../lib/identity";
import { openExternal } from "../lib/external";
import {
  blueprintOf,
  derivePermissions,
  emptyBlueprint,
  isDirty,
  loadDrafts,
  saveDrafts,
  toggle,
  type Drafts,
} from "../lib/blueprint";
import type { AgentBlueprint, DesktopSnapshot } from "../lib/engine";

type Tab = "patterns" | "skills" | "mcp" | "tools";

const tabs: { id: Tab; label: string; blurb: string }[] = [
  {
    id: "patterns",
    label: "Patterns",
    blurb: "Prepared behaviours. A pattern changes how a run is shaped, not what the agent knows.",
  },
  {
    id: "skills",
    label: "Skills",
    blurb: "Packaged abilities. A skill can need a permission; one that is not installed is shown as blocked.",
  },
  {
    id: "mcp",
    label: "MCP servers",
    blurb: "Tool servers the agent may call. Each server declares the scopes it needs.",
  },
  {
    id: "tools",
    label: "Engine tools",
    blurb: "Functions the workbench exposes. Read tools are safe; execute tools wait on the runtime.",
  },
];

export function AgentStudioView({
  snapshot,
  agentId,
  onSelectAgent,
  onOpenChat,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  agentId: string | null;
  onSelectAgent: (id: string) => void;
  onOpenChat: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Drafts>(loadDrafts);
  const [tab, setTab] = useState<Tab>("patterns");
  const [creating, setCreating] = useState(agentId === null);
  const [newAgent, setNewAgent] = useState({
    name: "",
    role: "Implementation",
    project: "~/Projects/open-cube",
    modelId: snapshot.models[0].id,
    sandboxId: snapshot.sandboxes[0].id,
  });

  const agent = snapshot.agents.find((item) => item.id === agentId) ?? null;
  const blueprint: AgentBlueprint = agent
    ? blueprintOf(snapshot, agent.id, drafts)
    : emptyBlueprint();
  const dirty = agent ? isDirty(snapshot, agent.id, drafts) : false;
  const permissions = useMemo(
    () => derivePermissions(blueprint, snapshot.library),
    [blueprint, snapshot.library],
  );

  useEffect(() => saveDrafts(drafts), [drafts]);

  const edit = (patch: Partial<AgentBlueprint>) => {
    if (!agent) return;
    setDrafts((current) => ({ ...current, [agent.id]: { ...blueprint, ...patch } }));
  };

  /* ------------------------------------------------------------ basic mode */
  if (creating) {
    const model = snapshot.models.find((item) => item.id === newAgent.modelId);
    const sandbox = snapshot.sandboxes.find((item) => item.id === newAgent.sandboxId);
    return (
      <div className="stack">
        <header className="studio-head">
          <div>
            <p className="eyebrow">Agent studio</p>
            <h1>New agent</h1>
            <p className="muted-copy">
              Name it, point it at a project and give it a model. Everything else — instructions,
              patterns, skills, MCP servers — is added in the editor afterwards.
            </p>
          </div>
          {snapshot.agents.length > 0 && (
            <Button icon="close" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          )}
        </header>

        <Card className="pad form">
          <label className="field">
            <span>Name</span>
            <input
              value={newAgent.name}
              placeholder="release_notes"
              onChange={(event) => setNewAgent({ ...newAgent, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <input
              value={newAgent.role}
              onChange={(event) => setNewAgent({ ...newAgent, role: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Project folder</span>
            <span className="field__row">
              <input
                className="mono"
                value={newAgent.project}
                onChange={(event) => setNewAgent({ ...newAgent, project: event.target.value })}
              />
              <Button
                size="sm"
                icon="folder"
                onClick={() => onAction("Choosing a folder needs the workbench daemon.")}
              >
                Choose…
              </Button>
            </span>
          </label>
          <label className="field">
            <span>Model</span>
            <select
              value={newAgent.modelId}
              onChange={(event) => setNewAgent({ ...newAgent, modelId: event.target.value })}
            >
              {snapshot.models.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.location} · {item.version}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sandbox</span>
            <select
              value={newAgent.sandboxId}
              onChange={(event) => setNewAgent({ ...newAgent, sandboxId: event.target.value })}
            >
              {snapshot.sandboxes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.isolation}
                </option>
              ))}
            </select>
          </label>
        </Card>

        <SectionTitle>What this agent would be allowed to do</SectionTitle>
        <Card className="pad list-card">
          <p>
            <Icon name="folder" size={13} /> Read and write inside {newAgent.project}, nothing above
            it.
          </p>
          <p>
            <Icon name="network" size={13} /> Network {sandbox?.network.mode ?? "off"}
            {sandbox && sandbox.network.allowlist.length > 0
              ? ` · ${sandbox.network.allowlist.join(", ")}`
              : ""}
          </p>
          <p>
            <Icon name="terminal" size={13} /> Shell commands wait for approval until the runtime
            lands.
          </p>
          <p>
            <Icon name="model" size={13} /> Runs on {model?.name}
            {model?.ready ? "" : " — which is not connected yet"}.
          </p>
        </Card>

        <div className="studio-actions">
          <Button
            variant="primary"
            icon="plus"
            onClick={() => onAction("Creating an agent needs the workbench daemon; the form is a draft.")}
          >
            Create agent
          </Button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="stack">
        <Button icon="plus" variant="primary" onClick={() => setCreating(true)}>
          Design an agent
        </Button>
      </div>
    );
  }

  /* ----------------------------------------------------------- editor mode */
  const model = snapshot.models.find((item) => item.id === agent.modelId);

  return (
    <div className="studio">
      <header className="studio-head">
        <div className="studio-head__identity">
          <AgentFace accent={accentOf(agent.accent)} size={38} />
          <div>
            <p className="eyebrow">Agent studio</p>
            <h1>{agent.name}</h1>
            <p className="muted-copy">
              {agent.role} · {model?.name} · sandbox {agent.sandboxId} · {agent.project.path}
            </p>
          </div>
        </div>
        <div className="studio-head__actions">
          <select
            className="studio-picker"
            value={agent.id}
            onChange={(event) => onSelectAgent(event.target.value)}
            aria-label="Agent"
          >
            {snapshot.agents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button icon="plus" onClick={() => setCreating(true)}>
            New
          </Button>
          <Button icon="session" onClick={() => onOpenChat(agent.id)}>
            Chat
          </Button>
          <Button
            variant="primary"
            icon="check"
            onClick={() =>
              onAction("Saving a blueprint needs the workbench daemon; the draft stays on this machine.")
            }
          >
            Save
          </Button>
        </div>
      </header>

      {dirty && (
        <p className="studio-dirty">
          <Icon name="alert" size={13} /> Draft differs from the blueprint the engine ships.
          <button
            className="link"
            onClick={() =>
              setDrafts((current) => {
                const next = { ...current };
                delete next[agent.id];
                return next;
              })
            }
          >
            Reset
          </button>
        </p>
      )}

      <div className="studio-grid">
        <section className="studio-blueprint">
          <SectionTitle>Instructions</SectionTitle>
          <textarea
            className="studio-instructions"
            value={blueprint.instructions}
            rows={5}
            onChange={(event) => edit({ instructions: event.target.value })}
            placeholder="What is this agent for, and what must it never do?"
          />

          <SectionTitle count={blueprint.patterns.length}>Patterns</SectionTitle>
          <Chips
            ids={blueprint.patterns}
            names={snapshot.library.patterns}
            onRemove={(id) => edit({ patterns: toggle(blueprint.patterns, id) })}
          />

          <SectionTitle count={blueprint.skills.length}>Skills</SectionTitle>
          <Chips
            ids={blueprint.skills}
            names={snapshot.library.skills}
            onRemove={(id) => edit({ skills: toggle(blueprint.skills, id) })}
          />

          <SectionTitle count={blueprint.mcp.length}>MCP servers</SectionTitle>
          <Chips
            ids={blueprint.mcp}
            names={snapshot.library.mcp}
            onRemove={(id) => edit({ mcp: toggle(blueprint.mcp, id) })}
          />

          <SectionTitle count={blueprint.tools.length}>Engine tools</SectionTitle>
          <div className="chip-row">
            {blueprint.tools.map((name) => (
              <button
                key={name}
                className="chip-remove mono"
                onClick={() => edit({ tools: toggle(blueprint.tools, name) })}
              >
                {name}
                <Icon name="close" size={11} />
              </button>
            ))}
            {blueprint.tools.length === 0 && <p className="muted-copy">No tool selected.</p>}
          </div>

          <SectionTitle count={permissions.length}>Required of the sandbox</SectionTitle>
          <Card className="pad list-card">
            {permissions.length === 0 && (
              <p className="muted-copy">Nothing beyond reading the workspace.</p>
            )}
            {permissions.map((permission) => (
              <p key={`${permission.label}-${permission.from}`}>
                <Icon name={permission.blocked ? "lock" : "check"} size={13} />
                <span className="mono">{permission.label}</span>
                <em className="permission-from">from {permission.from}</em>
                {permission.blocked && <Badge tone="red">blocked</Badge>}
              </p>
            ))}
          </Card>
        </section>

        <section className="studio-library">
          <div className="studio-tabs">
            {tabs.map((item) => (
              <button
                key={item.id}
                className={tab === item.id ? "is-active" : ""}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="studio-blurb">{tabs.find((item) => item.id === tab)?.blurb}</p>

          {tab === "patterns" &&
            snapshot.library.patterns.map((pattern) => (
              <LibraryCard
                key={pattern.id}
                title={pattern.name}
                summary={pattern.summary}
                detail={pattern.effect}
                selected={blueprint.patterns.includes(pattern.id)}
                onToggle={() => edit({ patterns: toggle(blueprint.patterns, pattern.id) })}
              />
            ))}

          {tab === "skills" &&
            snapshot.library.skills.map((skill) => (
              <LibraryCard
                key={skill.id}
                title={skill.name}
                badge={<Badge tone={skill.installed ? "green" : "amber"}>{skill.installed ? skill.category : "needs setup"}</Badge>}
                summary={skill.summary}
                detail={skill.detail}
                requires={skill.requires}
                selected={blueprint.skills.includes(skill.id)}
                onToggle={() => edit({ skills: toggle(blueprint.skills, skill.id) })}
              />
            ))}

          {tab === "mcp" &&
            snapshot.library.mcp.map((server) => (
              <LibraryCard
                key={server.id}
                title={server.name}
                badge={<Badge tone={toneOf(server.status)}>{server.status}</Badge>}
                summary={server.summary}
                detail={`${server.transport} transport`}
                requires={server.scopes}
                selected={blueprint.mcp.includes(server.id)}
                onToggle={() => edit({ mcp: toggle(blueprint.mcp, server.id) })}
                onReference={
                  server.reference
                    ? () => {
                        void openExternal(server.reference!.url);
                        onAction(`Opened ${server.reference!.label} in your browser.`);
                      }
                    : undefined
                }
              />
            ))}

          {tab === "tools" &&
            snapshot.capabilities.functions.map((fn) => (
              <LibraryCard
                key={fn.name}
                title={fn.name}
                mono
                badge={<Badge tone={fn.permission === "read" ? "green" : "amber"}>{fn.permission}</Badge>}
                summary={fn.description}
                detail={fn.signature}
                selected={blueprint.tools.includes(fn.name)}
                onToggle={() => edit({ tools: toggle(blueprint.tools, fn.name) })}
              />
            ))}
        </section>
      </div>
    </div>
  );
}

function Chips({
  ids,
  names,
  onRemove,
}: {
  ids: string[];
  names: { id: string; name: string }[];
  onRemove: (id: string) => void;
}) {
  if (ids.length === 0) return <p className="muted-copy">Nothing selected yet.</p>;
  return (
    <div className="chip-row">
      {ids.map((id) => (
        <button key={id} className="chip-remove" onClick={() => onRemove(id)}>
          {names.find((item) => item.id === id)?.name ?? id}
          <Icon name="close" size={11} />
        </button>
      ))}
    </div>
  );
}

function LibraryCard({
  title,
  summary,
  detail,
  requires,
  badge,
  selected,
  mono,
  onToggle,
  onReference,
}: {
  title: string;
  summary: string;
  detail: string;
  requires?: string[];
  badge?: React.ReactNode;
  selected: boolean;
  mono?: boolean;
  onToggle: () => void;
  onReference?: () => void;
}) {
  return (
    <article className={`library-card ${selected ? "is-selected" : ""}`}>
      <header>
        <strong className={mono ? "mono" : ""}>{title}</strong>
        {badge}
        <button className="library-card__toggle" onClick={onToggle}>
          <Icon name={selected ? "check" : "plus"} size={13} />
          {selected ? "Added" : "Add"}
        </button>
      </header>
      <p className="library-card__summary">{summary}</p>
      <p className={`library-card__detail ${mono ? "mono" : ""}`}>{detail}</p>
      {requires && requires.length > 0 && (
        <p className="library-card__requires">
          {requires.map((item) => (
            <span key={item} className="mono">
              {item}
            </span>
          ))}
        </p>
      )}
      {onReference && (
        <button className="link library-card__reference" onClick={onReference}>
          <Icon name="external" size={12} /> Reference
        </button>
      )}
    </article>
  );
}
