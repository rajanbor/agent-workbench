import { ModelGlyph, AgentFace } from "../components/Glyph";
import { Badge, Card, SectionTitle } from "../components/primitives";
import { accentOf, compactTokens, duration, fineMoney, money, percent } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

export function UsageView({
  snapshot,
  period,
}: {
  snapshot: DesktopSnapshot;
  period: string;
}) {
  const usage = snapshot.usage;
  const periods = usage.periods;
  const peak = Math.max(...usage.daily.map((day) => day.costUsd), 0.01);
  const longest = periods[periods.length - 1];

  /** Cost of one model in one period, for the cell in the matrix below. */
  const cell = (modelId: string, windowId: string) =>
    periods
      .find((item) => item.id === windowId)
      ?.byModel.find((row) => row.modelId === modelId);

  return (
    <div className="stack stack--wide">
      <SectionTitle
        action={
          <Badge tone="neutral" icon="clock">
            every period
          </Badge>
        }
      >
        Usage and cost
      </SectionTitle>

      {/* The panel does not filter: every window is here, side by side. The
          chip's choice is only marked, so the two surfaces agree. */}
      <div className="metrics">
        {periods.map((item) => (
          <Card
            key={item.id}
            className={`metric ${item.id === period ? "is-current" : ""}`}
          >
            <p className="metric__label">{item.label}</p>
            <p className="metric__value">{money(item.costUsd)}</p>
            <p className="metric__hint">
              {compactTokens(item.tokensIn + item.tokensOut)} tokens · {item.calls} calls
            </p>
            <p className="metric__split">
              <span title="Billed per token">{money(item.meteredUsd)} metered</span>
              <span title="A share of the monthly plan">{money(item.subscriptionUsd)} plan</span>
              <span title={`${item.energyWh.toFixed(0)} Wh of electricity`}>
                {fineMoney(item.electricityUsd)} power
              </span>
            </p>
          </Card>
        ))}
      </div>

      <SectionTitle count={longest.byModel.length}>By model, across periods</SectionTitle>
      <Card className="table table--matrix">
        <div className="table__head">
          <span>Model</span>
          {periods.map((item) => (
            <span key={item.id}>{item.label}</span>
          ))}
          <span>Tokens, {longest.label.toLowerCase()}</span>
        </div>
        {longest.byModel.map((row) => {
          const model = snapshot.models.find((item) => item.id === row.modelId);
          // Share of tokens, not of cost: a model on a subscription meters
          // nothing and would otherwise look idle.
          const tokens = longest.tokensIn + longest.tokensOut;
          const share = tokens > 0 ? ((row.tokensIn + row.tokensOut) / tokens) * 100 : 0;
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
                  <small>
                    {row.costKind === "metered" && "metered per token"}
                    {row.costKind === "subscription" &&
                      `${model?.subscription?.plan ?? "plan"} · $${model?.subscription?.monthlyUsd.toFixed(0)}/month`}
                    {row.costKind === "electricity" &&
                      `on this device · ${model?.localProfile?.powerDrawW ?? 0} W while generating`}
                    {row.costKind === "none" && "costs nothing to run"}
                  </small>
                </span>
              </span>
              {periods.map((item) => {
                const value = cell(row.modelId, item.id);
                return (
                  <span
                    key={item.id}
                    className={`mono ${item.id === period ? "is-current" : ""}`}
                    title={`${compactTokens((value?.tokensIn ?? 0) + (value?.tokensOut ?? 0))} tokens · ${
                      value?.calls ?? 0
                    } calls`}
                  >
                    {money(value?.costUsd ?? 0)}
                  </span>
                );
              })}
              <span className="share">
                <i style={{ width: `${Math.max(share, 2)}%` }} />
                <em className="mono">{share.toFixed(0)}%</em>
              </span>
            </div>
          );
        })}
        <div className="table__row is-static table__row--total">
          <span className="table__main">
            <strong>Total</strong>
          </span>
          {periods.map((item) => (
            <span key={item.id} className="mono">
              {money(item.costUsd)}
            </span>
          ))}
          <span />
        </div>
      </Card>

      <ActivityCalendarView snapshot={snapshot} />

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
        the API and were metered at {money(snapshot.usage.costUsd)} — part of them on a
        subscription, which meters nothing. The comparison below asks a different question: what the
        same workload would cost on this {snapshot.computer.deviceKind} against{" "}
        {reference?.name ?? local.referenceModelId} at ${device.pricePerKwh.toFixed(2)}/kWh.
        {local.realisedTokens === 0 && " Nothing ran locally in this window."}
      </p>

      <div className="metrics">
        <Card className="metric">
          <p className="metric__label">Saved against the API</p>
          <p className="metric__value">{money(local.bestSavedUsd)}</p>
          <p className="metric__hint">
            {percent(local.bestSavingsRatio, 1)} of what {reference?.name ?? "the reference"} would
            charge · {best?.name}
          </p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Energy</p>
          <p className="metric__value">{local.bestEnergyWh.toFixed(2)} Wh</p>
          <p className="metric__hint">{fineMoney(best?.energyCostUsd ?? 0)} of electricity</p>
        </Card>
        <Card className="metric">
          <p className="metric__label">Battery</p>
          <p className="metric__value">{local.bestBatteryPct.toFixed(0)}%</p>
          <p className="metric__hint">
            {local.bestBatteryPct > 100
              ? `${(local.bestBatteryPct / 100).toFixed(1)} full charges of ${device.batteryWh} Wh`
              : `of ${device.batteryWh} Wh capacity`}
          </p>
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

/** A year of days, the way a contribution calendar reads, and the same
 *  activity split per model — which model did how much, and when. */
function ActivityCalendarView({ snapshot }: { snapshot: DesktopSnapshot }) {
  const activity = snapshot.usage.activity;
  const months = monthLabels(activity.weeks);

  return (
    <>
      <SectionTitle
        action={
          <Badge tone="neutral" icon="clock">
            {activity.from} → {activity.to}
          </Badge>
        }
      >
        Activity
      </SectionTitle>

      <Card className="pad calendar-card">
        <p className="calendar-summary">
          <strong>{activity.totalRuns}</strong> runs in the last year ·{" "}
          {compactTokens(activity.totalTokens)} tokens · busiest day {activity.busiestDay}
        </p>

        <div className="calendar">
          <div className="calendar__months">
            {months.map((month) => (
              <span key={`${month.label}-${month.index}`} style={{ gridColumn: month.index + 1 }}>
                {month.label}
              </span>
            ))}
          </div>
          <div className="calendar__grid">
            <div className="calendar__days">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div className="calendar__weeks">
              {activity.weeks.map((week) => (
                <div className="calendar__week" key={week.startDate}>
                  {week.days.map((day) => (
                    <i
                      key={day.date}
                      className={`calendar__day calendar__day--${day.level}`}
                      title={`${day.date}: ${day.runs} runs · ${compactTokens(day.tokens)} tokens`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="calendar__legend">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <i key={level} className={`calendar__day calendar__day--${level}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <p className="formula">{activity.basis}</p>
      </Card>

      {/* Which models the work ran on, then what the work was. */}
      <div className="activity-chips">
        {activity.byModel
          .filter((row) => row.runs > 0)
          .map((row) => {
            const model = snapshot.models.find((item) => item.id === row.modelId);
            return (
              <span className="activity-chip" key={row.modelId}>
                <ModelGlyph
                  icon={model?.icon ?? "model"}
                  accent={accentOf(model?.accent)}
                  size={18}
                />
                {row.name}
              </span>
            );
          })}
      </div>

      <Card className="pad overview">
        <div className="overview__text">
          <h3>Activity overview</h3>
          <p className="muted-copy">
            Worked across{" "}
            <strong>
              {snapshot.sandboxes.filter((sandbox) => sandbox.agents.length > 0).length} sandboxes
            </strong>{" "}
            with <strong>{snapshot.agents.length} agents</strong>, on{" "}
            <strong>{snapshot.workflow.name}</strong> and{" "}
            {snapshot.terminals.length} terminal panes.
          </p>
          <ul className="overview__list">
            {activity.byKind.map((kind) => (
              <li key={kind.name}>
                <span>{kind.name}</span>
                <em className="mono">
                  {kind.count} · {percent(kind.share)}
                </em>
              </li>
            ))}
          </ul>
        </div>
        <Quadrant kinds={activity.byKind} />
      </Card>

      <SectionTitle count={activity.byModel.length}>Activity per model</SectionTitle>
      <div className="rows">
        {activity.byModel.map((row) => {
          const model = snapshot.models.find((item) => item.id === row.modelId);
          return (
            <div className="row row--static" key={row.modelId}>
              <ModelGlyph icon={model?.icon ?? "model"} accent={accentOf(model?.accent)} size={24} />
              <span className="row__main">
                <strong>{row.name}</strong>
                <small>
                  {row.runs} runs · {row.daysActive} active days · {compactTokens(row.tokens)} tokens
                </small>
              </span>
              <span className="activity-bar" title={`${percent(row.share, 1)} of all runs`}>
                <i style={{ width: `${Math.max(row.share * 100, 2)}%` }} />
              </span>
              <span className="row__tail">
                <span className="mono row__meta">{percent(row.share)}</span>
                <Badge tone={row.costUsd > 0 ? "amber" : "green"}>{money(row.costUsd)}</Badge>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Month names above the first week column that starts in each month. */
function monthLabels(weeks: DesktopSnapshot["usage"]["activity"]["weeks"]) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels: { label: string; index: number }[] = [];
  let previous = "";
  weeks.forEach((week, index) => {
    const month = week.startDate.slice(5, 7);
    if (month !== previous) {
      labels.push({ label: names[Number(month) - 1], index });
      previous = month;
    }
  });
  return labels;
}

/** The four kinds of work on two axes, the way a profile shows its split. */
function Quadrant({ kinds }: { kinds: DesktopSnapshot["usage"]["activity"]["byKind"] }) {
  // Room for the labels: the axes stop well short of the edge.
  const size = 260;
  const centre = size / 2;
  const reach = centre - 56;
  const max = Math.max(...kinds.map((kind) => kind.share), 0.01);

  // up, right, down, left — in the order the engine lists them.
  const axes: { dx: number; dy: number; anchor: "start" | "middle" | "end"; dyText: number }[] = [
    { dx: 0, dy: -1, anchor: "middle", dyText: -12 },
    { dx: 1, dy: 0, anchor: "start", dyText: 4 },
    { dx: 0, dy: 1, anchor: "middle", dyText: 18 },
    { dx: -1, dy: 0, anchor: "end", dyText: 4 },
  ];

  const points = kinds.map((kind, index) => {
    const axis = axes[index % axes.length];
    const length = (kind.share / max) * reach;
    return { x: centre + axis.dx * length, y: centre + axis.dy * length };
  });

  return (
    <svg className="quadrant" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Activity split">
      <line x1={centre} y1={centre - reach} x2={centre} y2={centre + reach} />
      <line x1={centre - reach} y1={centre} x2={centre + reach} y2={centre} />
      <polygon points={points.map((point) => `${point.x},${point.y}`).join(" ")} />
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r={3.5} />
      ))}
      {kinds.map((kind, index) => {
        const axis = axes[index % axes.length];
        return (
          <text
            key={kind.name}
            x={centre + axis.dx * (reach + 6)}
            y={centre + axis.dy * (reach + 6) + axis.dyText}
            textAnchor={axis.anchor}
          >
            <tspan className="quadrant__value">{percent(kind.share)}</tspan>
            <tspan x={centre + axis.dx * (reach + 6)} dy="13">
              {/* Short here; the full names are in the list beside the chart. */}
              {kind.name.split(" ")[0]}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
