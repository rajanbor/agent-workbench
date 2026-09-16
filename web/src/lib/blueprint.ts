/** Local working copy of an agent blueprint.
 *
 *  The engine owns the shipped blueprint; edits here stay on this machine
 *  until `workbenchd` owns persistence, and the studio says so. Nothing in a
 *  draft grants a capability by itself: it records what the agent would be
 *  given, and the permission preview is derived from that.
 */
import type { AgentBlueprint, DesktopSnapshot, Library } from "./engine";

const STORAGE_KEY = "open-cube.blueprints";

export type Drafts = Record<string, AgentBlueprint>;

export function loadDrafts(): Drafts {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Drafts) : {};
  } catch {
    return {};
  }
}

export function saveDrafts(drafts: Drafts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    /* the draft still lives for this session */
  }
}

export function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export interface DerivedPermission {
  label: string;
  from: string;
  blocked: boolean;
}

/** What the chosen skills and servers would require of the sandbox.
 *  A requirement whose skill is not installed, or whose server is blocked, is
 *  reported as blocked rather than quietly dropped. */
export function derivePermissions(
  blueprint: AgentBlueprint,
  library: Library,
): DerivedPermission[] {
  const derived: DerivedPermission[] = [];

  for (const id of blueprint.skills) {
    const skill = library.skills.find((item) => item.id === id);
    if (!skill) continue;
    for (const requirement of skill.requires) {
      derived.push({ label: requirement, from: skill.name, blocked: !skill.installed });
    }
  }

  for (const id of blueprint.mcp) {
    const server = library.mcp.find((item) => item.id === id);
    if (!server) continue;
    for (const scope of server.scopes) {
      derived.push({
        label: scope,
        from: server.name,
        blocked: server.status === "blocked",
      });
    }
  }

  const seen = new Set<string>();
  return derived.filter((item) => {
    const key = `${item.label}·${item.from}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function blueprintOf(snapshot: DesktopSnapshot, agentId: string, drafts: Drafts) {
  const agent = snapshot.agents.find((item) => item.id === agentId);
  return drafts[agentId] ?? agent?.blueprint ?? emptyBlueprint();
}

export function emptyBlueprint(): AgentBlueprint {
  return { instructions: "", patterns: [], skills: [], mcp: [], tools: [] };
}

export function isDirty(snapshot: DesktopSnapshot, agentId: string, drafts: Drafts) {
  const agent = snapshot.agents.find((item) => item.id === agentId);
  const draft = drafts[agentId];
  if (!agent || !draft) return false;
  return JSON.stringify(agent.blueprint) !== JSON.stringify(draft);
}
