import { ModelGlyph, AgentFace } from "../components/Glyph";
import { Badge, Card, SectionTitle } from "../components/primitives";
import { accentOf, compactTokens, money } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

export function UsageView({ snapshot }: { snapshot: DesktopSnapshot }) {
  const usage = snapshot.usage;
  const total = usage.tokensIn + usage.tokensOut;
  const peak = Math.max(...usage.daily.map((day) => day.costUsd), 0.01);

  return (
    <div className="stack stack--wide">
      <SectionTitle
        action={<Badge tone="neutral" icon="clock">{usage.window}</Badge>}
      >
        Usage and cost
      </SectionTitle>

      <div className="metrics">
        <Card className="metric">
          <p className="metric__label">Cost</p>
          <p className="metric__value">{money(usage.costUsd)}</p>
          <p className="metric__hint">metered API calls only</p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Tokens</p>
          <p className="metric__value">{compactTokens(total)}</p>
          <p className="metric__hint">
            {compactTokens(usage.tokensIn)} in · {compactTokens(usage.tokensOut)} out
          </p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Models used</p>
          <p className="metric__value">{usage.byModel.length}</p>
          <p className="metric__hint">
            {usage.byModel.filter((model) => model.costUsd === 0).length} free of charge
          </p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Agents billed</p>
          <p className="metric__value">{usage.byAgent.filter((agent) => agent.costUsd > 0).length}</p>
          <p className="metric__hint">of {usage.byAgent.length} configured</p>
        </Card>
      </div>

      <SectionTitle count={usage.byModel.length}>By model</SectionTitle>
      <Card className="table table--usage">
        <div className="table__head">
          <span>Model</span>
          <span>Version</span>
          <span>Calls</span>
          <span>Tokens</span>
          <span>Cost</span>
          <span>Share</span>
        </div>
        {usage.byModel.map((row) => {
          const model = snapshot.models.find((item) => item.id === row.modelId);
          const share = usage.costUsd > 0 ? (row.costUsd / usage.costUsd) * 100 : 0;
          return (
            <div className="table__row is-static" key={row.modelId}>
              <span className="table__main">
                <ModelGlyph
                  icon={model?.icon ?? "model"}
                  accent={accentOf(model?.accent)}
                  size={22}
                />
                <span>
                  <strong>{row.name}</strong>
                  <small>{model?.vendor}</small>
                </span>
              </span>
              <span className="mono">{row.version}</span>
              <span className="mono">{row.calls}</span>
              <span className="mono">{compactTokens(row.tokensIn + row.tokensOut)}</span>
              <span className="mono">{money(row.costUsd)}</span>
              <span className="share">
                <i style={{ width: `${Math.max(share, 2)}%` }} />
                <em className="mono">{share.toFixed(0)}%</em>
              </span>
            </div>
          );
        })}
      </Card>

      <div className="columns">
        <div>
          <SectionTitle count={usage.byAgent.length}>By agent</SectionTitle>
          <div className="rows">
            {usage.byAgent.map((row) => {
              const agent = snapshot.agents.find((item) => item.id === row.agentId);
              const model = snapshot.models.find((item) => item.id === row.modelId);
              return (
                <div className="row row--static" key={row.agentId}>
                  <AgentFace accent={accentOf(agent?.accent)} size={24} />
                  <span className="row__main">
                    <strong>{row.name}</strong>
                    <small>
                      {model?.name} · {row.runs} runs
                    </small>
                  </span>
                  <span className="row__tail">
                    <span className="mono row__meta">{compactTokens(row.tokens)}</span>
                    <Badge tone={row.costUsd > 0 ? "amber" : "green"}>{money(row.costUsd)}</Badge>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SectionTitle>Last five days</SectionTitle>
          <Card className="pad chart">
            {usage.daily.map((day) => (
              <div className="chart__row" key={day.day}>
                <span className="chart__label">{day.day}</span>
                <span className="chart__bar">
                  <i style={{ width: `${(day.costUsd / peak) * 100}%` }} />
                </span>
                <span className="chart__value mono">{money(day.costUsd)}</span>
                <span className="chart__value chart__value--muted mono">
                  {compactTokens(day.tokens)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
