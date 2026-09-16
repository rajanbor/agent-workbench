import { useState } from "react";
import { Icon } from "../components/Icon";
import { ModelGlyph } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import { accentOf } from "../lib/identity";
import { openExternal } from "../lib/external";
import type { DesktopSnapshot, ModelCard } from "../lib/engine";

type Filter = "all" | "local" | "api" | "ready";

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "local", label: "Local" },
  { id: "api", label: "API" },
  { id: "ready", label: "Ready to use" },
];

function matches(model: ModelCard, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "ready") return model.ready;
  return model.location === filter;
}

function referenceIcon(kind: string) {
  if (kind === "huggingface") return "model";
  if (kind === "api") return "link";
  return "code";
}

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
  const [filter, setFilter] = useState<Filter>("all");
  const model = snapshot.models.find((item) => item.id === modelId) ?? snapshot.models[0];
  const usage = snapshot.usage.byModel.find((item) => item.modelId === model.id);
  const visible = snapshot.models.filter((item) => matches(item, filter));

  const open = async (url: string, label: string) => {
    try {
      await openExternal(url);
      onAction(`Opened ${label} in your browser.`);
    } catch {
      onAction("The system refused to open that link.");
    }
  };

  return (
    <div className="split split--models">
      <div className="split__list">
        <SectionTitle count={visible.length}>Model library</SectionTitle>
        <div className="filter-row">
          {filters.map((item) => (
            <button
              key={item.id}
              className={`filter-row__item ${filter === item.id ? "is-active" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="model-list">
          {visible.map((item) => (
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
                <small>{item.summary}</small>
              </span>
              <span className="model-row__tail">
                <Badge tone={item.location === "local" ? "violet" : "blue"}>{item.location}</Badge>
                <Badge tone={item.ready ? "green" : "neutral"} icon="tag">
                  {item.version}
                </Badge>
              </span>
            </button>
          ))}
          {visible.length === 0 && <p className="muted-copy">No model matches this filter.</p>}
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
            <Button
              size="sm"
              icon={referenceIcon(model.reference.kind)}
              onClick={() => open(model.reference.url, model.reference.label)}
            >
              {model.reference.kind === "huggingface" ? "Hugging Face" : "Documentation"}
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
          <p className="muted-copy">{model.summary}</p>
          <div className="detail-summary__chips">
            <Badge tone="neutral">{model.vendor}</Badge>
            <Badge tone="neutral">{model.task}</Badge>
            <Badge tone="neutral">{model.parameters}</Badge>
            <Badge tone="neutral">{model.context} context</Badge>
            <Badge tone={model.pricing ? "amber" : "green"}>
              {model.pricing
                ? `$${model.pricing.inputPerMtok}/M in · $${model.pricing.outputPerMtok}/M out`
                : "no metered cost"}
            </Badge>
          </div>
        </div>

        <div className="columns">
          <div>
            <SectionTitle>Good for</SectionTitle>
            <Card className="pad list-card">
              {model.strengths.map((item) => (
                <p key={item}>
                  <Icon name="check" size={13} /> {item}
                </p>
              ))}
            </Card>
          </div>
          <div>
            <SectionTitle>Requirements</SectionTitle>
            <Card className="pad list-card">
              {model.requirements.map((item) => (
                <p key={item}>
                  <Icon name="cpu" size={13} /> {item}
                </p>
              ))}
              <div className="kv">
                <span>Licence</span>
                <strong>{model.license}</strong>
              </div>
            </Card>
          </div>
        </div>

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
            <strong className="mono">{(usage?.tokensIn ?? 0) + (usage?.tokensOut ?? 0)}</strong>
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

        <p className="muted-copy reference-note">
          <Icon name="external" size={13} /> {model.reference.label} —{" "}
          <button className="link mono" onClick={() => open(model.reference.url, model.reference.label)}>
            {model.reference.url}
          </button>
        </p>
      </div>
    </div>
  );
}
