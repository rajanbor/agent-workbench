import { ModelGlyph, AgentFace } from "../components/Glyph";
import { Badge, Card, SectionTitle } from "../components/primitives";
import { accentOf, compactTokens, duration, fineMoney, money, percent } from "../lib/identity";
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

      <LocalExecution snapshot={snapshot} />

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

/** What the same workload would cost on the device instead of the API:
 *  time, energy, battery, and what it saves. Estimated from declared
 *  coefficients — see .ai/specs/LOCAL_RUN_ECONOMICS.md. */
function LocalExecution({ snapshot }: { snapshot: DesktopSnapshot }) {
  const local = snapshot.usage.local;
  const reference = snapshot.models.find((model) => model.id === local.referenceModelId);
  const best = local.rows.find((row) => row.modelId === local.bestModelId);
  const device = snapshot.computer.energy;

  if (local.rows.length === 0) return null;

  return (
    <>
      <SectionTitle
        action={
          <Badge tone="amber" icon="alert">
            estimate
          </Badge>
        }
      >
        Local execution
      </SectionTitle>

      <p className="muted-copy local-note">
        Today&rsquo;s {compactTokens(local.workloadTokensIn + local.workloadTokensOut)} tokens ran on
        the API. Had they run on this {snapshot.computer.deviceKind}, against{" "}
        {reference?.name ?? local.referenceModelId} at ${device.pricePerKwh.toFixed(2)}/kWh:
        {local.realisedTokens === 0 && " nothing ran locally in this window."}
      </p>

      <div className="metrics">
        <Card className="metric">
          <p className="metric__label">Saved</p>
          <p className="metric__value">{money(local.bestSavedUsd)}</p>
          <p className="metric__hint">
            {percent(local.bestSavingsRatio, 1)} of the API price · {best?.name}
          </p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Energy</p>
          <p className="metric__value">{local.bestEnergyWh.toFixed(2)} Wh</p>
          <p className="metric__hint">{fineMoney(best?.energyCostUsd ?? 0)} of electricity</p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Battery</p>
          <p className="metric__value">{local.bestBatteryPct.toFixed(1)}%</p>
          <p className="metric__hint">of {device.batteryWh} Wh capacity</p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Exploitation</p>
          <p className="metric__value">{percent(best?.utilisation.score ?? 0)}</p>
          <p className="metric__hint">power, memory and duty cycle</p>
        </Card>
      </div>

      <Card className="table table--local">
        <div className="table__head">
          <span>Model</span>
          <span>Time</span>
          <span>Energy</span>
          <span>Battery</span>
          <span>Electricity</span>
          <span>API price</span>
          <span>Saved</span>
          <span>Exploitation</span>
        </div>
        {local.rows.map((row) => {
          const model = snapshot.models.find((item) => item.id === row.modelId);
          return (
            <div className="table__row is-static" key={row.modelId}>
              <span className="table__main">
                <ModelGlyph icon={model?.icon ?? "model"} accent={accentOf(model?.accent)} size={22} />
                <span>
                  <strong>{row.name}</strong>
                  <small>
                    {model?.localProfile?.throughputTps} tok/s · {model?.localProfile?.powerDrawW} W ·{" "}
                    {row.tokensPerWh.toFixed(0)} tok/Wh
                  </small>
                </span>
              </span>
              <span className="mono">{duration(row.seconds)}</span>
              <span className="mono">{row.energyWh.toFixed(2)} Wh</span>
              <span className="mono">{row.batteryPct.toFixed(1)}%</span>
              <span className="mono">{fineMoney(row.energyCostUsd)}</span>
              <span className="mono">{money(row.apiEquivalentUsd)}</span>
              <span className="mono saved">{money(row.savedUsd)}</span>
              <span className="share" title={`power ${percent(row.utilisation.powerShare)} · memory ${percent(row.utilisation.memoryShare)} · duty ${percent(row.utilisation.dutyCycle, 1)}`}>
                <i style={{ width: `${Math.max(row.utilisation.score * 100, 2)}%` }} />
                <em className="mono">{percent(row.utilisation.score)}</em>
              </span>
            </div>
          );
        })}
      </Card>

      <p className="muted-copy formula">
        time = out ÷ tok/s + in ÷ (tok/s × prefill) · energy = watts × time ÷ 3600 · saved = API
        price − energy price · exploitation = 0.5 power + 0.3 memory + 0.2 duty cycle. Declared
        coefficients, not measurements: {device.basis}.
      </p>
    </>
  );
}
