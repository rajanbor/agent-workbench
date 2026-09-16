/** Bridge to the Rust engine.
 *
 * Under Tauri the shell reads `desktop_snapshot` and `inspector_ask`. In a
 * browser preview there is no IPC, so it falls back to
 * `src/data/prototype-snapshot.json` — generated from the same Rust code by
 * `pnpm fallback`, so the two can never drift — and to a preview inspector
 * that follows the same policy the engine enforces.
 */
import fallbackSnapshot from "../data/prototype-snapshot.json";

export type ModelLocation = "local" | "api";

export interface DeviceEnergy {
  powerBudgetW: number;
  memoryGb: number;
  batteryWh: number;
  pricePerKwh: number;
  basis: string;
}

export interface ComputerProfile {
  operatingSystem: string;
  architecture: string;
  deviceKind: string;
  runtimeStatus: string;
  energy: DeviceEnergy;
}

export interface Provider {
  id: string;
  name: string;
  detail: string;
  connected: boolean;
}

export interface ModelRevision {
  version: string;
  digest: string;
  published: string;
  note: string;
  pinned: boolean;
}

export interface Pricing {
  inputPerMtok: number;
  outputPerMtok: number;
}

export interface Reference {
  kind: string;
  label: string;
  url: string;
}

export interface LocalProfile {
  throughputTps: number;
  prefillFactor: number;
  powerDrawW: number;
  memoryGb: number;
  accelerator: string;
}

export interface ModelCard {
  id: string;
  name: string;
  vendor: string;
  task: string;
  icon: string;
  accent: string;
  parameters: string;
  context: string;
  updated: string;
  downloads: string | null;
  likes: number | null;
  location: ModelLocation;
  ready: boolean;
  version: string;
  digest: string;
  revisions: ModelRevision[];
  pricing: Pricing | null;
  summary: string;
  strengths: string[];
  requirements: string[];
  license: string;
  reference: Reference;
  localProfile: LocalProfile | null;
}

export interface Permission {
  label: string;
  value: string;
  level: string;
}

export interface ProjectRef {
  name: string;
  path: string;
  branch: string;
}

export interface ChatRef {
  id: string;
  title: string;
  updatedAt: string;
}

export interface AgentBlueprint {
  instructions: string;
  patterns: string[];
  skills: string[];
  mcp: string[];
  tools: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: string;
  modelId: string;
  sandboxId: string;
  machine: string;
  task: string;
  lastMessage: string;
  updatedAt: string;
  accent: string;
  revision: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  permissions: Permission[];
  project: ProjectRef;
  chats: ChatRef[];
  blueprint: AgentBlueprint;
}

export interface Mount {
  path: string;
  mode: string;
}

export interface NetworkPolicy {
  mode: string;
  allowlist: string[];
}

export interface SandboxProcess {
  pid: number;
  command: string;
  cpu: string;
  memory: string;
}

export interface Sandbox {
  id: string;
  name: string;
  isolation: string;
  /** The OS account this sandbox runs as — the boundary itself. */
  account: string | null;
  state: string;
  machine: string;
  disk: string;
  mounts: Mount[];
  network: NetworkPolicy;
  processes: SandboxProcess[];
  agents: string[];
}

export interface Session {
  id: string;
  title: string;
  provider: string;
  project: string;
  status: string;
  updatedAt: string;
}

export interface TerminalLine {
  stream: string;
  text: string;
}

export interface TerminalSession {
  id: string;
  title: string;
  sandboxId: string;
  shell: string;
  cwd: string;
  state: string;
  policy: string;
  lines: TerminalLine[];
}

export interface WorkflowNode {
  id: string;
  kind: string;
  label: string;
  detail: string;
  status: string;
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ValueEntry {
  key: string;
  value: string;
  scope: string;
  secret: boolean;
}

export interface FunctionEntry {
  name: string;
  signature: string;
  module: string;
  permission: string;
  description: string;
}

export interface ModuleEntry {
  name: string;
  version: string;
  status: string;
  description: string;
  functions: number;
}

export interface Capabilities {
  values: ValueEntry[];
  functions: FunctionEntry[];
  modules: ModuleEntry[];
}

export interface SkillCard {
  id: string;
  name: string;
  category: string;
  summary: string;
  detail: string;
  requires: string[];
  installed: boolean;
}

export interface PatternCard {
  id: string;
  name: string;
  summary: string;
  effect: string;
}

export interface McpServer {
  id: string;
  name: string;
  transport: string;
  status: string;
  summary: string;
  scopes: string[];
  reference: Reference | null;
}

export interface Library {
  skills: SkillCard[];
  patterns: PatternCard[];
  mcp: McpServer[];
}

export interface ModelUsage {
  modelId: string;
  name: string;
  version: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface AgentUsage {
  agentId: string;
  name: string;
  modelId: string;
  runs: number;
  tokens: number;
  costUsd: number;
}

export interface DailyUsage {
  day: string;
  tokens: number;
  costUsd: number;
}

export interface Utilisation {
  powerShare: number;
  memoryShare: number;
  dutyCycle: number;
  score: number;
}

export interface LocalRunEconomics {
  modelId: string;
  name: string;
  tokensIn: number;
  tokensOut: number;
  seconds: number;
  energyWh: number;
  energyCostUsd: number;
  apiEquivalentUsd: number;
  savedUsd: number;
  savingsRatio: number;
  tokensPerWh: number;
  batteryPct: number;
  ready: boolean;
  utilisation: Utilisation;
}

export interface LocalEconomics {
  basis: string;
  window: string;
  pricePerKwh: number;
  referenceModelId: string;
  workloadTokensIn: number;
  workloadTokensOut: number;
  realisedTokens: number;
  bestModelId: string | null;
  bestSavedUsd: number;
  bestSavingsRatio: number;
  bestEnergyWh: number;
  bestBatteryPct: number;
  rows: LocalRunEconomics[];
}

export interface UsagePeriod {
  id: string;
  label: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  calls: number;
  byModel: ModelUsage[];
}

export interface ActivityDay {
  date: string;
  weekday: number;
  runs: number;
  tokens: number;
  costUsd: number;
  level: number;
}

export interface ActivityWeek {
  startDate: string;
  days: ActivityDay[];
}

export interface ModelActivity {
  modelId: string;
  name: string;
  runs: number;
  tokens: number;
  costUsd: number;
  share: number;
  daysActive: number;
}

export interface ActivityKind {
  name: string;
  count: number;
  share: number;
}

export interface ActivityCalendar {
  basis: string;
  from: string;
  to: string;
  weeks: ActivityWeek[];
  maxRuns: number;
  totalRuns: number;
  totalTokens: number;
  busiestDay: string;
  byModel: ModelActivity[];
  byKind: ActivityKind[];
}

export interface UsageSummary {
  window: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  byModel: ModelUsage[];
  byAgent: AgentUsage[];
  daily: DailyUsage[];
  local: LocalEconomics;
  periods: UsagePeriod[];
  activity: ActivityCalendar;
}

export interface Commit {
  hash: string;
  title: string;
  author: string;
  when: string;
}

export interface BranchRef {
  name: string;
  current: boolean;
  ahead: number;
  behind: number;
  updated: string;
}

export interface FileChange {
  path: string;
  state: string;
}

export interface VersionControl {
  branch: string;
  head: Commit;
  ahead: number;
  behind: number;
  dirty: number;
  recent: Commit[];
  branches: BranchRef[];
  changes: FileChange[];
}

export interface InspectorScope {
  name: string;
  granted: boolean;
  detail: string;
}

export interface InspectorPolicy {
  modelId: string;
  mode: string;
  egress: string;
  scopes: InspectorScope[];
  redactions: string[];
}

export interface InspectorAnswer {
  text: string;
  modelId: string;
  sources: string[];
  redacted: string[];
  refused: string[];
  tokens: number;
  costUsd: number;
}

export interface DesktopSnapshot {
  computer: ComputerProfile;
  providers: Provider[];
  models: ModelCard[];
  agents: Agent[];
  sandboxes: Sandbox[];
  sessions: Session[];
  terminals: TerminalSession[];
  workflow: Workflow;
  capabilities: Capabilities;
  library: Library;
  usage: UsageSummary;
  versionControl: VersionControl;
  inspector: InspectorPolicy;
}

export const prototypeSnapshot = fallbackSnapshot as unknown as DesktopSnapshot;

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type EngineSource = "engine" | "preview";

export async function loadSnapshot(): Promise<{ snapshot: DesktopSnapshot; source: EngineSource }> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return { snapshot: await invoke<DesktopSnapshot>("desktop_snapshot"), source: "engine" };
    } catch {
      /* fall through to the generated preview snapshot */
    }
  }
  return { snapshot: prototypeSnapshot, source: "preview" };
}

export async function ask(question: string, snapshot: DesktopSnapshot): Promise<InspectorAnswer> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<InspectorAnswer>("inspector_ask", { question });
    } catch {
      /* fall through to the preview inspector */
    }
  }
  return previewInspect(question, snapshot);
}

/* ------------------------------------------------------------------------ */
/* Preview inspector: mirrors engine/src/inspector.rs for the browser build.  */
/* It answers from the snapshot only, refuses the same scopes and applies the */
/* same redactions, so the preview cannot show something the engine would not.*/

type Topic =
  | "agents"
  | "sandboxes"
  | "models"
  | "cost"
  | "security"
  | "terminals"
  | "versions"
  | "overview";

function topicOf(question: string): Topic {
  const q = question.toLowerCase();
  const has = (needles: string[]) => needles.some((needle) => q.includes(needle));
  if (has(["cost", "spend", "token", "budget", "price", "koszt"])) return "cost";
  if (has(["sandbox", "isolation", "mount", "network", "piaskowni"])) return "sandboxes";
  if (has(["model", "version", "digest", "pinned"]) && !has(["agent"])) return "models";
  if (has(["permission", "secure", "security", "safe", "leak", "credential", "policy"]))
    return "security";
  if (has(["terminal", "shell", "pty", "command"])) return "terminals";
  if (has(["branch", "commit", "git", "revision"])) return "versions";
  if (has(["agent", "who", "doing", "status", "run"])) return "agents";
  return "overview";
}

function refusalsFor(question: string, policy: InspectorPolicy): string[] {
  const q = question.toLowerCase();
  const denied = (name: string) =>
    policy.scopes.some((scope) => scope.name === name && !scope.granted);
  const refused: string[] = [];
  if (
    (q.includes("file") || q.includes("code") || q.includes("read the") || q.includes("content")) &&
    denied("workspace files")
  ) {
    refused.push("workspace files");
  }
  if (
    (q.includes("key") || q.includes("credential") || q.includes("password")) &&
    denied("provider credentials")
  ) {
    refused.push("provider credentials");
  }
  if (q.includes("typed") && denied("terminal input")) refused.push("terminal input");
  return refused;
}

export function previewInspect(question: string, snapshot: DesktopSnapshot): InspectorAnswer {
  const policy = snapshot.inspector;
  const refused = refusalsFor(question, policy);
  const sources: string[] = [];
  let body: string;

  switch (topicOf(question)) {
    case "agents": {
      sources.push(...snapshot.agents.map((agent) => `agent:${agent.id}`));
      body = [
        `${snapshot.agents.length} agents are configured.`,
        ...snapshot.agents.map((agent) => {
          const model = snapshot.models.find((item) => item.id === agent.modelId);
          return `· ${agent.name} (${agent.role.toLowerCase()}) is ${agent.status} on “${agent.task}” using ${
            model?.name ?? "no model"
          } in sandbox ${agent.sandboxId} · ${agent.tokensIn + agent.tokensOut} tokens · $${agent.costUsd.toFixed(2)}`;
        }),
      ].join("\n");
      break;
    }
    case "sandboxes": {
      sources.push(...snapshot.sandboxes.map((sandbox) => `sandbox:${sandbox.id}`));
      body = [
        `${snapshot.sandboxes.length} sandboxes are defined.`,
        ...snapshot.sandboxes.map(
          (sandbox) =>
            `· ${sandbox.name} is ${sandbox.state} on ${sandbox.machine} · ${sandbox.isolation} · network ${sandbox.network.mode} · ${sandbox.mounts.length} mounts · ${sandbox.processes.length} processes`,
        ),
        "I can read the policy of each sandbox, never the files inside it.",
      ].join("\n");
      break;
    }
    case "models": {
      sources.push(...snapshot.models.map((model) => `model:${model.id}`));
      body = [
        `${snapshot.models.length} models are catalogued; every attached version is pinned by digest.`,
        ...snapshot.models.map(
          (model) =>
            `· ${model.name} · ${model.vendor} · ${model.location} · version ${model.version} (${model.digest}) · ${
              model.ready ? "ready" : "not ready"
            }`,
        ),
      ].join("\n");
      break;
    }
    case "cost": {
      sources.push("usage:today");
      const usage = snapshot.usage;
      body = [
        `Spend ${usage.window}: $${usage.costUsd.toFixed(2)} across ${usage.tokensIn} in and ${usage.tokensOut} out tokens.`,
        ...usage.byModel.map(
          (model) =>
            `· ${model.name} (${model.version}) · ${model.calls} calls · ${
              model.tokensIn + model.tokensOut
            } tokens · $${model.costUsd.toFixed(2)}`,
        ),
        "Local models and the inspector cost nothing to run.",
      ].join("\n");
      break;
    }
    case "security": {
      sources.push("policy:inspector");
      const granted = policy.scopes.filter((scope) => scope.granted).map((scope) => scope.name);
      const denied = policy.scopes.filter((scope) => !scope.granted).map((scope) => scope.name);
      body = `I run ${policy.mode} with egress ${policy.egress}.\nReadable: ${granted.join(
        ", ",
      )}.\nRefused: ${denied.join(", ")}.\nRedacted before any answer: ${policy.redactions.join(", ")}.`;
      break;
    }
    case "terminals": {
      sources.push(...snapshot.terminals.map((terminal) => `terminal:${terminal.id}`));
      body = [
        `${snapshot.terminals.length} terminal panes are open, all ${
          snapshot.terminals[0]?.state ?? "detached"
        } from a live pty.`,
        ...snapshot.terminals.map(
          (terminal) => `· ${terminal.title} · ${terminal.shell} · ${terminal.cwd} · ${terminal.policy}`,
        ),
      ].join("\n");
      break;
    }
    case "versions": {
      sources.push("vcs:head");
      const vcs = snapshot.versionControl;
      body = `Branch ${vcs.branch} at ${vcs.head.hash} — “${vcs.head.title}” by ${vcs.head.author} (${vcs.head.when}). ${vcs.dirty} uncommitted files, ${vcs.ahead} ahead, ${vcs.behind} behind.`;
      break;
    }
    default: {
      sources.push("snapshot");
      const running = snapshot.agents.filter((agent) => agent.status === "running").length;
      const waiting = snapshot.agents.filter(
        (agent) => agent.status === "waiting" || agent.status === "approval",
      ).length;
      body = `${snapshot.agents.length} agents (${running} running, ${waiting} waiting on you) across ${
        snapshot.sandboxes.length
      } sandboxes on ${snapshot.computer.deviceKind}.\nSpend ${snapshot.usage.window} is $${snapshot.usage.costUsd.toFixed(
        2,
      )}; ${snapshot.models.length} models catalogued, ${
        snapshot.models.filter((model) => model.ready).length
      } ready.\nAsk me about agents, sandboxes, models, cost, security, terminals or version control.`;
    }
  }

  let text = body;
  if (refused.length > 0) {
    text += `\n\nRefused by policy: ${refused.join(", ")}. That scope is not readable by any model.`;
  }

  const redacted: string[] = [];
  for (const term of policy.redactions) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      text = text.split(term).join("[redacted]");
      redacted.push(term);
    }
  }

  return {
    text,
    modelId: policy.modelId,
    sources,
    redacted,
    refused,
    tokens: text.split(/\s+/).length,
    costUsd: 0,
  };
}
