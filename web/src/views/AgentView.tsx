import { useState } from "react";
import { Icon } from "../components/Icon";
import { AgentFace, ModelGlyph } from "../components/Glyph";
import { Badge, Button, Card, IconButton, StatusDot } from "../components/primitives";
import { Switch } from "../components/Switch";
import { CodeSnippet } from "../components/CodeSnippet";
import { accentOf, compactTokens, money, toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

type Tab = "work" | "activity" | "identity";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "work", label: "Background work", icon: "bolt" },
  { id: "activity", label: "Activity", icon: "clock" },
  { id: "identity", label: "Identity", icon: "sliders" },
];

export function AgentView({
  snapshot,
  agentId,
  onChat,
  onSandbox,
  onModel,
  onStudio,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  agentId: string;
  onChat: (id: string) => void;
  onSandbox: (id: string) => void;
  onModel: (id: string) => void;
  onStudio: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("work");
  const agent = snapshot.agents.find((item) => item.id === agentId) ?? snapshot.agents[0];
  const model = snapshot.models.find((item) => item.id === agent.modelId);
  const sandbox = snapshot.sandboxes.find((item) => item.id === agent.sandboxId);

  const patterns = snapshot.library.patterns.filter((pattern) =>
    agent.blueprint.patterns.includes(pattern.id),
  );
  const skills = snapshot.library.skills.filter((skill) => agent.blueprint.skills.includes(skill.id));

  return (
    <div className="profile">
      <header className="profile__head">
        <AgentFace accent={accentOf(agent.accent)} size={96} />
        <div className="profile__identity">
          <h1>{agent.name}</h1>
          <p className="profile__role">{agent.role}</p>
          <p className="profile__description">{agent.task}</p>
          <p className="profile__state">
            <StatusDot tone={toneOf(agent.status)} pulse={agent.status === "running"} />
            {agent.status} · updated {agent.updatedAt} · {compactTokens(agent.tokensIn + agent.tokensOut)} tokens ·{" "}
            {money(agent.costUsd)}
          </p>
        </div>
        <div className="profile__actions">
          <IconButton icon="session" label="Open chat" size={17} onClick={() => onChat(agent.id)} />
          <IconButton icon="sliders" label="Edit blueprint" size={17} onClick={() => onStudio(agent.id)} />
          <IconButton
            icon="play"
            label="Run agent"
            size={17}
            onClick={() => onAction("The desktop client cannot launch providers yet.")}
          />
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "is-active" : ""}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === "work" && (
        <div className="profile__grid">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className="work-card">
              <header>
                <span className="work-card__icon">
                  <Icon name="target" size={14} />
                </span>
                <strong>{pattern.name}</strong>
                <Switch
                  checked
                  label={`Disable ${pattern.name}`}
                  onChange={() => onStudio(agent.id)}
                />
              </header>
              <p>{pattern.summary}</p>
              <footer>
                <span>
                  <StatusDot tone="green" /> Active
                </span>
                <span className="work-card__meta">Pattern</span>
              </footer>
            </Card>
          ))}

          {skills.map((skill) => (
            <Card key={skill.id} className="work-card">
              <header>
                <span className="work-card__icon">
                  <Icon name="bolt" size={14} />
                </span>
                <strong>{skill.name}</strong>
                <Switch
                  checked={skill.installed}
                  label={`Toggle ${skill.name}`}
                  onChange={() => onStudio(agent.id)}
                />
              </header>
              <p>{skill.summary}</p>
              <footer>
                <span>
                  <StatusDot tone={skill.installed ? "green" : "amber"} />
                  {skill.installed ? "Active" : "Needs setup"}
                </span>
                <span className="work-card__meta">Skill · {skill.category}</span>
              </footer>
            </Card>
          ))}

          {patterns.length === 0 && skills.length === 0 && (
            <p className="muted-copy">
              Nothing configured yet.{" "}
              <button className="link" onClick={() => onStudio(agent.id)}>
                Open the studio
              </button>{" "}
              to give this agent patterns and skills.
            </p>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="activity">
          <header className="activity__head">
            <span>{agent.name}&rsquo;s activity</span>
            <span className="activity__live">
              <StatusDot tone={agent.status === "running" ? "green" : "neutral"} pulse={agent.status === "running"} />
              {agent.status === "running" ? "Live" : "Idle"}
            </span>
          </header>
          {agent.chats.map((chat) => (
            <button key={chat.id} className="activity__row" onClick={() => onChat(agent.id)}>
              <span className="activity__time mono">{chat.updatedAt}</span>
              <span className="activity__title">{chat.title}</span>
              <span className="activity__source">{model?.name}</span>
              <Badge tone="violet">Thread</Badge>
              <Icon name="check" size={14} className="activity__check" />
            </button>
          ))}
          <div className="activity__row activity__row--open">
            <span className="activity__time mono">{agent.updatedAt}</span>
            <span className="activity__title">{agent.task}</span>
            <span className="activity__source">{sandbox?.name}</span>
            <Badge tone="blue">Task</Badge>
            <Icon name="check" size={14} className="activity__check" />
          </div>
          <div className="activity__detail">
            <p className="activity__label">Response</p>
            <p className="activity__body">{agent.lastMessage}</p>
          </div>
        </div>
      )}

      {tab === "identity" && (
        <div className="profile__columns">
          <Card className="pad">
            <div className="kv">
              <span>Model</span>
              <button className="inline-link" onClick={() => onModel(agent.modelId)}>
                <ModelGlyph icon={model?.icon ?? "model"} accent={accentOf(model?.accent)} size={18} />
                {model?.name} · <span className="mono">{model?.version}</span>
              </button>
            </div>
            <div className="kv">
              <span>Sandbox</span>
              <button className="inline-link mono" onClick={() => onSandbox(agent.sandboxId)}>
                {sandbox?.name} · {sandbox?.state}
              </button>
            </div>
            <div className="kv">
              <span>Machine</span>
              <strong>{agent.machine}</strong>
            </div>
            <div className="kv">
              <span>Project</span>
              <strong className="mono">{agent.project.path}</strong>
            </div>
            <div className="kv">
              <span>Branch</span>
              <strong className="mono">{agent.project.branch}</strong>
            </div>
            <div className="kv">
              <span>Revision</span>
              <strong className="mono">{agent.revision}</strong>
            </div>
          </Card>

          <div>
            <div className="permissions">
              {agent.permissions.map((permission) => (
                <div className="permissions__item" key={permission.label}>
                  <span>{permission.label}</span>
                  <Badge tone={toneOf(permission.level)}>{permission.value}</Badge>
                </div>
              ))}
            </div>
            <Button
              className="profile__studio"
              icon="sliders"
              onClick={() => onStudio(agent.id)}
            >
              Edit blueprint
            </Button>
          </div>
        </div>
      )}

      <CodeSnippet
        title="Use from the terminal"
        onCopied={onAction}
        snippets={[
          {
            id: "shell",
            label: "agentctl",
            code: [
              "# Agents run as a separate standard macOS user.",
              "# Open Cube never stores a provider credential.",
              "",
              "agentctl status",
              `agentctl sessions ${agent.sandboxId}`,
              `agentctl ${(model?.vendor ?? "claude").split(" ")[0].toLowerCase()} ${agent.sandboxId}`,
              "",
              "# Stop every running session in this sandbox",
              `agentctl stop ${agent.sandboxId}`,
            ].join("\n"),
          },
          {
            id: "engine",
            label: "TypeScript",
            code: [
              "// The client reads the same state through the Rust core.",
              'import { invoke } from "@tauri-apps/api/core";',
              "",
              'const snapshot = await invoke<DesktopSnapshot>("desktop_snapshot");',
              `const agent = snapshot.agents.find((item) => item.id === "${agent.id}");`,
              "",
              "// Scoped, redacted summary — never files or credentials.",
              'const answer = await invoke<InspectorAnswer>("inspector_ask", {',
              '  question: "what is each agent doing?",',
              "});",
            ].join("\n"),
          },
        ]}
      />
    </div>
  );
}
