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

/** Minutes and seconds, the way a person reads a duration. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function percent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Cents when the amount is too small to read in dollars. */
export function fineMoney(value: number): string {
  if (value === 0) return "$0";
  if (Math.abs(value) < 0.01) return `${(value * 100).toFixed(2)}¢`;
  return `$${value.toFixed(2)}`;
}
