/** What is wrong with this workspace, read from the snapshot.
 *
 *  A Problems tab that is permanently empty is furniture. Everything here is a
 *  fact the engine already states somewhere — a model that is not connected, a
 *  skill whose permission is missing, a server that is blocked, a module that
 *  is planned rather than built. Collecting them in one list is the whole
 *  feature; none of it is invented, and each row says where it came from. */

import type { DesktopSnapshot } from "./engine";

export type Severity = "error" | "warning" | "info";

export interface Problem {
  id: string;
  severity: Severity;
  /** Where it was read from, in the shape of a source path. */
  source: string;
  title: string;
  detail: string;
}

export function problemsOf(snapshot: DesktopSnapshot): Problem[] {
  const found: Problem[] = [];

  for (const model of snapshot.models) {
    if (model.ready) continue;
    found.push({
      id: `model:${model.id}`,
      severity: model.location === "api" ? "warning" : "info",
      source: `models/${model.id}`,
      title: `${model.name} is not ready to answer`,
      detail:
        model.location === "api"
          ? `${model.vendor} is not connected, so nothing routes to this model. ${model.requirements[0] ?? ""}`.trim()
          : `Not downloaded to this machine. ${model.requirements[0] ?? ""}`.trim(),
    });
  }

  for (const provider of snapshot.providers) {
    if (provider.connected) continue;
    found.push({
      id: `provider:${provider.id}`,
      severity: "info",
      source: `providers/${provider.id}`,
      title: `${provider.name} is not connected`,
      detail: provider.detail,
    });
  }

  for (const skill of snapshot.library.skills) {
    if (skill.installed) continue;
    found.push({
      id: `skill:${skill.id}`,
      severity: "warning",
      source: `library/skills/${skill.id}`,
      title: `${skill.name} needs a permission it does not have`,
      detail: `Requires ${skill.requires.join(", ")}. An agent given this skill is refused at the point it would use it.`,
    });
  }

  for (const server of snapshot.library.mcp) {
    if (server.status === "connected" || server.status === "available") continue;
    found.push({
      id: `mcp:${server.id}`,
      severity: server.status === "blocked" ? "error" : "warning",
      source: `library/mcp/${server.id}`,
      title: `${server.name} is ${server.status}`,
      detail: `${server.summary} Scopes: ${server.scopes.join(", ")}.`,
    });
  }

  for (const sandbox of snapshot.sandboxes) {
    if (sandbox.account !== null) continue;
    found.push({
      id: `sandbox:${sandbox.id}`,
      severity: "error",
      source: `sandboxes/${sandbox.id}`,
      title: `${sandbox.name} has no account of its own`,
      detail:
        "Work would run as the desktop user, which the account boundary refuses. The sandbox stays unusable until its own account exists.",
    });
  }

  for (const module of snapshot.capabilities.modules) {
    if (module.status !== "planned") continue;
    found.push({
      id: `module:${module.name}`,
      severity: "info",
      source: `capabilities/modules/${module.name}`,
      title: `${module.name} is planned, not built`,
      detail: `${module.description} Every control that would call it reports the reason instead.`,
    });
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return found.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function countBySeverity(problems: Problem[]): Record<Severity, number> {
  return problems.reduce(
    (totals, problem) => ({ ...totals, [problem.severity]: totals[problem.severity] + 1 }),
    { error: 0, warning: 0, info: 0 } as Record<Severity, number>,
  );
}
