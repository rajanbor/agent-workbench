import { Icon } from "../components/Icon";
import { ModelGlyph } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import { accentOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

export function ModelsView({
  snapshot,
  modelId,
  onSelect,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  modelId: string;
  onSelect: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const model = snapshot.models.find((item) => item.id === modelId) ?? snapshot.models[0];
  const usage = snapshot.usage.byModel.find((item) => item.modelId === model.id);

  return (
    <div className="split split--models">
      <div className="split__list">
        <SectionTitle count={snapshot.models.length}>Model catalogue</SectionTitle>
        <div className="model-list">
          {snapshot.models.map((item) => (
            <button
              key={item.id}
              className={`model-row ${item.id === model.id ? "is-active" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <ModelGlyph icon={item.icon} accent={accentOf(item.accent)} size={26} />
              <span className="model-row__main">
                <strong className="mono">
                  {item.vendor.toLowerCase().replace(/\s+/g, "-")}/{item.name}
                </strong>
                <small>
                  {item.task} · {item.parameters} · {item.context} context · updated {item.updated}
                </small>
              </span>
              <span className="model-row__tail">
                <Badge tone={item.location === "local" ? "violet" : "blue"}>{item.location}</Badge>
                <Badge tone={item.ready ? "green" : "neutral"} icon="tag">
                  {item.version}
                </Badge>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="split__detail">
        <header className="detail-head">
          <div className="detail-head__id">
            <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={30} />
            <span className="detail-head__hash">{model.name}</span>
            <Badge tone={model.ready ? "green" : "neutral"}>
              {model.ready ? "ready" : model.location === "api" ? "not connected" : "not downloaded"}
            </Badge>
          </div>
          <div className="detail-head__actions">
            <Button size="sm" icon="tag" onClick={() => onAction("Version pinning needs the workbench daemon.")}>
              Pin version
            </Button>
            <Button
              size="sm"
              icon={model.location === "local" ? "bolt" : "link"}
              onClick={() =>
                onAction(
                  model.location === "local"
                    ? "Downloading local models is not implemented yet."
                    : "Provider connections are handled by the Swift app for now.",
                )
              }
            >
              {model.location === "local" ? "Download" : "Connect"}
            </Button>
          </div>
        </header>

        <div className="detail-summary">
          <p className="muted-copy">
            {model.vendor} · {model.task} · {model.parameters} · {model.context} context
          </p>
          <div className="detail-summary__chips">
            <Badge tone="neutral" icon="history">
              updated {model.updated}
            </Badge>
            {model.downloads && <Badge tone="neutral">{model.downloads}</Badge>}
            {model.pricing ? (
              <Badge tone="amber">
                ${model.pricing.inputPerMtok}/M in · ${model.pricing.outputPerMtok}/M out
              </Badge>
            ) : (
              <Badge tone="green">no metered cost</Badge>
            )}
          </div>
        </div>

        {/* Version control for models: pinned version, digest and history. */}
        <SectionTitle count={model.revisions.length}>Versions</SectionTitle>
        <div className="rows">
          {model.revisions.map((revision) => (
            <div key={revision.version} className="row row--static">
              <Icon name="commit" size={15} />
              <span className="row__main">
                <strong className="mono">{revision.version}</strong>
                <small className="mono">{revision.digest}</small>
              </span>
              <span className="row__tail">
                <span className="row__meta">{revision.note}</span>
                {revision.pinned && <Badge tone="accent">pinned</Badge>}
              </span>
            </div>
          ))}
        </div>

        <SectionTitle>Spend</SectionTitle>
        <Card className="pad">
          <div className="kv">
            <span>Calls today</span>
            <strong className="mono">{usage?.calls ?? 0}</strong>
          </div>
          <div className="kv">
            <span>Tokens</span>
            <strong className="mono">
              {(usage?.tokensIn ?? 0) + (usage?.tokensOut ?? 0)}
            </strong>
          </div>
          <div className="kv">
            <span>Cost</span>
            <strong className="mono">${(usage?.costUsd ?? 0).toFixed(2)}</strong>
          </div>
          <div className="kv">
            <span>Version used</span>
            <strong className="mono">{usage?.version ?? model.version}</strong>
          </div>
        </Card>
      </div>
    </div>
  );
}
