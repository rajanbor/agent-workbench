import { Icon } from "./Icon";
import { StatusDot } from "./primitives";
import { toneOf } from "../lib/identity";
import type { DesktopSnapshot, ModelCard } from "../lib/engine";

/** The quiet line: what is running, where, and what it costs. Detail lives in
 *  the views — the bar never grows to eight items again. */
export function StatusBar({
  snapshot,
  source,
  model,
  sandboxId,
  onSelectUsage,
}: {
  snapshot: DesktopSnapshot;
  source: "engine" | "preview";
  model: ModelCard;
  sandboxId: string;
  onSelectUsage: () => void;
}) {
  const running = snapshot.agents.filter((agent) => agent.status === "running").length;
  const waiting = snapshot.agents.filter(
    (agent) => agent.status === "waiting" || agent.status === "approval",
  ).length;
  const sandbox = snapshot.sandboxes.find((item) => item.id === sandboxId);

  return (
    <footer className="statusbar">
      <span title={`${snapshot.versionControl.dirty} uncommitted files`}>
        <Icon name="git" size={12} /> {snapshot.versionControl.branch}
        {snapshot.versionControl.dirty > 0 && <i className="dirty-dot" />}
      </span>
      <span title={sandbox?.isolation}>
        <StatusDot tone={toneOf(sandbox?.state ?? "idle")} />
        {sandbox?.name ?? "—"}
      </span>
      <span title={`${waiting} waiting for you`}>
        <StatusDot tone={running > 0 ? "green" : "neutral"} pulse={running > 0} />
        {running} running
      </span>
      <span className="statusbar__push" title={`${model.name} · ${model.version}`}>
        {source === "engine" ? "rust engine" : "preview snapshot"}
      </span>
      <button className="statusbar__button" onClick={onSelectUsage} title="Tokens and cost today">
        ${snapshot.usage.costUsd.toFixed(2)}
      </button>
    </footer>
  );
}
