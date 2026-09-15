import { AgentFace, ModelGlyph } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle, StatusDot } from "../components/primitives";
import { CodeSnippet } from "../components/CodeSnippet";
import { accentOf, compactTokens, money, toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

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
  const agent = snapshot.agents.find((item) => item.id === agentId) ?? snapshot.agents[0];
  const model = snapshot.models.find((item) => item.id === agent.modelId);
  const sandbox = snapshot.sandboxes.find((item) => item.id === agent.sandboxId);

  return (
    <div className="stack">
      <header className="agent-head">
        <AgentFace accent={accentOf(agent.accent)} size={44} />
        <div className="agent-head__main">
          <h1>{agent.name}</h1>
          <p>
            <StatusDot tone={toneOf(agent.status)} pulse={agent.status === "running"} />
            {agent.status} · {agent.role} · updated {agent.updatedAt}
          </p>
        </div>
        <div className="agent-head__actions">
          <Button size="sm" icon="session" onClick={() => onChat(agent.id)}>
            Open chat
          </Button>
          <Button size="sm" icon="sliders" onClick={() => onStudio(agent.id)}>
            Edit blueprint
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon="play"
            onClick={() => onAction("The desktop client cannot launch providers yet.")}
          >
            Run
          </Button>
        </div>
      </header>

      <Card className="pad">
        <div className="kv">
          <span>Task</span>
          <strong>{agent.task}</strong>
        </div>
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
          <span>Revision</span>
          <strong className="mono">{agent.revision}</strong>
        </div>
        <div className="kv">
          <span>Spend</span>
          <strong className="mono">
            {compactTokens(agent.tokensIn + agent.tokensOut)} tokens · {money(agent.costUsd)}
          </strong>
        </div>
      </Card>

      <SectionTitle count={agent.permissions.length}>Permissions</SectionTitle>
      <div className="permissions">
        {agent.permissions.map((permission) => (
          <div className="permissions__item" key={permission.label}>
            <span>{permission.label}</span>
            <Badge tone={toneOf(permission.level)}>{permission.value}</Badge>
          </div>
        ))}
      </div>

      <SectionTitle>Launch</SectionTitle>
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
              '// The shell reads the same state through the Rust engine.',
              'import { invoke } from "@tauri-apps/api/core";',
              "",
              'const snapshot = await invoke<DesktopSnapshot>("desktop_snapshot");',
              `const agent = snapshot.agents.find((item) => item.id === "${agent.id}");`,
              "",
              '// Scoped, redacted summary — never files or credentials.',
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
