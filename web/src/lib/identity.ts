/** Visual identity for models, agents and object states.
 *
 * Every model owns an accent and an icon in the engine snapshot, so the same
 * model looks the same in the chat, the model catalogue, the usage table and
 * the canvas. Accents resolve to theme tokens — never to raw colour values.
 */
import type { Agent, DesktopSnapshot, ModelCard } from "./engine";

export type Accent = "accent" | "green" | "amber" | "red" | "violet" | "blue" | "neutral";

export function accentOf(value: string | undefined): Accent {
  switch (value) {
    case "green":
    case "amber":
    case "red":
    case "violet":
    case "blue":
    case "accent":
      return value;
    default:
      return "neutral";
  }
}

export const statusTone: Record<string, Accent> = {
  running: "green",
  active: "green",
  ready: "green",
  online: "green",
  passed: "green",
  waiting: "amber",
  approval: "amber",
  queued: "amber",
  review: "amber",
  idle: "neutral",
  detached: "neutral",
  stopped: "neutral",
  offline: "neutral",
  planned: "violet",
  prototype: "violet",
  failed: "red",
  blocked: "red",
  off: "neutral",
  scoped: "accent",
  stable: "green",
};

export function toneOf(state: string): Accent {
  return statusTone[state] ?? "neutral";
}

export function modelOf(snapshot: DesktopSnapshot, id: string): ModelCard | undefined {
  return snapshot.models.find((model) => model.id === id);
}

export function agentsOfSandbox(snapshot: DesktopSnapshot, sandboxId: string): Agent[] {
  return snapshot.agents.filter((agent) => agent.sandboxId === sandboxId);
}

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function compactTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}
