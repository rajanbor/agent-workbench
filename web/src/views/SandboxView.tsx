import { Icon } from "../components/Icon";
import { AgentFace } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import { accentOf, agentsOfSandbox, toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

const modeTone: Record<string, "green" | "amber" | "red" | "neutral" | "violet"> = {
  "read-write": "amber",
  "read-only": "green",
  denied: "red",
  planned: "violet",
};

export function SandboxView({
  snapshot,
  sandboxId,
  onSelect,
  onOpenAgent,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  sandboxId: string;
  onSelect: (id: string) => void;
  onOpenAgent: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const sandbox = snapshot.sandboxes.find((item) => item.id === sandboxId) ?? snapshot.sandboxes[0];
  const agents = agentsOfSandbox(snapshot, sandbox.id);

  return (
    <div className="stack stack--wide">
      <div className="switch-row">
        {snapshot.sandboxes.map((item) => (
          <button
            key={item.id}
            className={`switch-row__item ${item.id === sandbox.id ? "is-active" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <Icon name="sandbox" size={14} />
            <span className="mono">{item.name}</span>
            <Badge tone={toneOf(item.state)}>{item.state}</Badge>
          </button>
        ))}
      </div>

      <SectionTitle
        action={
          <div className="section-title__actions">
            <Button
              size="sm"
              icon="terminal"
              onClick={() => onAction("Open the terminal dock with ⌘J for this sandbox.")}
            >
              Terminal
            </Button>
            <Button
              size="sm"
              icon="shield"
              onClick={() => onAction("Editing sandbox policy needs the workbench daemon.")}
            >
              Edit policy
            </Button>
          </div>
        }
      >
        Sandbox {sandbox.name}
      </SectionTitle>

      {/* Isolation drawn as nested boundaries: machine, user account, sandbox. */}
      <Card className="boundary">
        <header className="boundary__label">
          <Icon name="machine" size={14} /> Machine · {sandbox.machine}
        </header>
        <div className="boundary__inner">
          <header className="boundary__label">
            <Icon name="lock" size={14} /> Standard user account · {sandbox.isolation}
          </header>

          <div className="boundary__grid">
            <aside className="boundary__side">
              <p className="eyebrow">Mounts</p>
              {sandbox.mounts.map((mount) => (
                <div className="mount" key={mount.path} title={`${mount.path} · ${mount.mode}`}>
                  <Icon name="folder" size={13} />
                  <span className="mono">{mount.path}</span>
                  <Badge tone={modeTone[mount.mode] ?? "neutral"}>{mount.mode}</Badge>
                </div>
              ))}
            </aside>

            <div className="boundary__core">
              <header>
                <span className="mono">{sandbox.name}</span>
                <Badge tone={toneOf(sandbox.state)}>{sandbox.state}</Badge>
              </header>

              <div className="boundary__agents">
                {agents.length === 0 && <p className="muted-copy">No agent attached.</p>}
                {agents.map((agent) => (
                  <button key={agent.id} className="boundary__agent" onClick={() => onOpenAgent(agent.id)}>
                    <AgentFace accent={accentOf(agent.accent)} size={26} />
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.status}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="boundary__processes">
                <p className="eyebrow">Processes</p>
                {sandbox.processes.length === 0 && <p className="muted-copy">Nothing running.</p>}
                {sandbox.processes.map((process) => (
                  <div className="process" key={process.pid}>
                    <span className="mono process__pid">{process.pid}</span>
                    <span className="mono process__cmd">{process.command}</span>
                    <span className="process__meta mono">{process.cpu}</span>
                    <span className="process__meta mono">{process.memory}</span>
                  </div>
                ))}
              </div>

              <footer className="boundary__disk">
                <span>Disk</span>
                <strong className="mono">{sandbox.disk}</strong>
              </footer>
            </div>

            <aside className="boundary__side">
              <p className="eyebrow">Network</p>
              <div className={`network network--${sandbox.network.mode === "off" ? "off" : "on"}`}>
                <Icon name={sandbox.network.mode === "off" ? "lock" : "network"} size={15} />
                <strong>{sandbox.network.mode}</strong>
              </div>
              {sandbox.network.allowlist.length === 0 ? (
                <p className="muted-copy">No host is reachable from this sandbox.</p>
              ) : (
                sandbox.network.allowlist.map((host) => (
                  <div className="mount" key={host}>
                    <Icon name="link" size={13} />
                    <span className="mono">{host}</span>
                  </div>
                ))
              )}
              <p className="eyebrow">Inspector</p>
              <p className="muted-copy">
                The in-app model reads this policy, never the files behind it.
              </p>
            </aside>
          </div>
        </div>
      </Card>
    </div>
  );
}
