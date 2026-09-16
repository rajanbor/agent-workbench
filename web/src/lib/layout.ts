/** The work area: tabs held in groups that sit side by side.
 *
 *  A group is one pane. It owns an ordered list of tabs and knows which one is
 *  showing. Splitting to the right makes a second group holding a copy of the
 *  tab, so two surfaces — a chat and the sandbox it runs in, an agent and its
 *  model — can be read at once. This is VS Code's arrangement, and the reason
 *  for it is the same: nothing here is worth a whole window on its own.
 *
 *  A tab points at an object by id. Identity is the `key`, so opening the same
 *  sandbox twice focuses the tab that is already there. See
 *  `.ai/specs/DOCKING_LAYOUT.md`. */

import type { IconName } from "../components/Icon";
import type { Agent, ChatRef, DesktopSnapshot, ModelCard, ProjectEntry, Sandbox } from "./engine";
import type { ViewId } from "./shell";

/* ------------------------------------------------------------- activities */

export type ActivityId =
  | "projects"
  | "agents"
  | "search"
  | "vcs"
  | "sandboxes"
  | "models"
  | "workflows";

export interface Activity {
  id: ActivityId;
  title: string;
  icon: IconName;
  /** Shown in the strip's tooltip, with the shortcut where there is one. */
  hint: string;
}

export const activities: Activity[] = [
  { id: "projects", title: "Projects", icon: "folder", hint: "Folders this workbench works in · ⌘1" },
  { id: "agents", title: "Agents", icon: "agent", hint: "Agents and their chats · ⌘2" },
  { id: "search", title: "Search", icon: "search", hint: "Search this workspace · ⌘3" },
  { id: "vcs", title: "Source control", icon: "git", hint: "Branch and working tree · ⌘4" },
  { id: "sandboxes", title: "Sandboxes", icon: "sandbox", hint: "Isolation and terminals · ⌘5" },
  { id: "models", title: "Models", icon: "model", hint: "Catalogue, usage and cost · ⌘6" },
  { id: "workflows", title: "Workflows", icon: "canvas", hint: "Canvas and workflows · ⌘7" },
];

/* -------------------------------------------------------------------- tabs */

export interface TabSpec {
  /** Identity. Opening the same key again focuses instead of duplicating. */
  key: string;
  view: ViewId;
  title: string;
  icon: IconName;
  /** A short line under the title in the tab's tooltip. */
  hint?: string;
  /** The object this tab points at: a chat, agent, sandbox or model id. */
  target?: string;
  /** The agent a chat belongs to, so a chat tab can name its own context. */
  agentId?: string | null;
}

export interface Group {
  id: string;
  tabs: TabSpec[];
  activeKey: string;
}

export interface Layout {
  groups: Group[];
  activeGroupId: string;
}

/* --------------------------------------------------------- tab constructors
 *  Kept here so a title and an icon are decided once, wherever a view is
 *  opened from — the rail, the palette, a link inside another view. */

export function workbenchChatTab(): TabSpec {
  return {
    key: "chat:workbench",
    view: "chat",
    title: "Workbench chat",
    icon: "cube",
    hint: "The in-app inspector, reading this machine under a read-only policy",
    target: "workbench",
    agentId: null,
  };
}

export function chatTab(chat: ChatRef, agent: Agent): TabSpec {
  return {
    key: `chat:${chat.id}`,
    view: "chat",
    title: `${agent.name} · ${chat.title}`,
    icon: "session",
    hint: agent.task,
    target: chat.id,
    agentId: agent.id,
  };
}

export function agentTab(agent: Agent): TabSpec {
  return {
    key: `agent:${agent.id}`,
    view: "agent",
    title: agent.name,
    icon: "agent",
    hint: `${agent.role} · ${agent.project.name} · ${agent.project.branch}`,
    target: agent.id,
    agentId: agent.id,
  };
}

export function studioTab(agent: Agent | null): TabSpec {
  return agent
    ? {
        key: `studio:${agent.id}`,
        view: "studio",
        title: `${agent.name} · design`,
        icon: "sliders",
        hint: "Instructions, patterns, skills, MCP servers and tools",
        target: agent.id,
        agentId: agent.id,
      }
    : {
        key: "studio:new",
        view: "studio",
        title: "New agent",
        icon: "plus",
        hint: "Design an agent",
        target: undefined,
        agentId: null,
      };
}

export function projectTab(project: ProjectEntry): TabSpec {
  return {
    key: `project:${project.id}`,
    view: "project",
    title: project.name,
    icon: "folder",
    hint: `${project.path}${project.branch ? ` · ${project.branch}` : ""}`,
    target: project.id,
  };
}

export function newProjectTab(): TabSpec {
  return {
    key: "project:new",
    view: "new-project",
    title: "New project",
    icon: "plus",
    hint: "Create a folder, or point the workbench at one",
  };
}

export function sandboxTab(sandbox: Sandbox): TabSpec {
  return {
    key: `sandbox:${sandbox.id}`,
    view: "sandboxes",
    title: sandbox.name,
    icon: "sandbox",
    hint: `${sandbox.isolation} · network ${sandbox.network.mode}`,
    target: sandbox.id,
  };
}

export function modelTab(model: ModelCard): TabSpec {
  return {
    key: `model:${model.id}`,
    view: "models",
    title: model.name,
    icon: model.icon,
    hint: `${model.location} · ${model.version}`,
    target: model.id,
  };
}

export function canvasTab(name: string): TabSpec {
  return { key: "canvas", view: "canvas", title: name, icon: "canvas", hint: "Agent workflow" };
}

export function usageTab(): TabSpec {
  return { key: "usage", view: "usage", title: "Usage and cost", icon: "bolt", hint: "Tokens, cost and activity" };
}

export function settingsTab(): TabSpec {
  return { key: "settings", view: "settings", title: "Settings", icon: "settings", hint: "Appearance, engine and policy" };
}

/* --------------------------------------------------------------- operations
 *  Every one of these returns a new layout; none mutates its argument. */

let counter = 0;
const groupId = () => `group-${++counter}`;

export function defaultLayout(): Layout {
  const first = workbenchChatTab();
  const id = groupId();
  return { groups: [{ id, tabs: [first], activeKey: first.key }], activeGroupId: id };
}

function withGroups(layout: Layout, groups: Group[], activeGroupId?: string): Layout {
  const id = activeGroupId ?? layout.activeGroupId;
  return {
    groups,
    activeGroupId: groups.some((group) => group.id === id) ? id : (groups[0]?.id ?? ""),
  };
}

export function activeGroup(layout: Layout): Group | null {
  return layout.groups.find((group) => group.id === layout.activeGroupId) ?? layout.groups[0] ?? null;
}

export function activeTab(layout: Layout): TabSpec | null {
  const group = activeGroup(layout);
  if (!group) return null;
  return group.tabs.find((tab) => tab.key === group.activeKey) ?? null;
}

/** Open a tab, or focus it where it already is. A tab open in another group is
 *  focused there rather than duplicated, which is what a person means by
 *  "show me that" when it is already on screen. */
export function openTab(layout: Layout, spec: TabSpec, inGroupId?: string): Layout {
  const wanted = inGroupId ?? layout.activeGroupId;
  const holder =
    layout.groups.find((group) => group.id === wanted && group.tabs.some((tab) => tab.key === spec.key)) ??
    layout.groups.find((group) => group.tabs.some((tab) => tab.key === spec.key));

  if (holder) {
    return withGroups(
      layout,
      layout.groups.map((group) =>
        group.id === holder.id
          ? // Refresh the spec: a title can follow a renamed branch or status.
            { ...group, tabs: group.tabs.map((tab) => (tab.key === spec.key ? spec : tab)), activeKey: spec.key }
          : group,
      ),
      holder.id,
    );
  }

  if (layout.groups.length === 0) {
    const id = groupId();
    return { groups: [{ id, tabs: [spec], activeKey: spec.key }], activeGroupId: id };
  }

  const target = layout.groups.find((group) => group.id === wanted) ?? layout.groups[0];
  return withGroups(
    layout,
    layout.groups.map((group) =>
      group.id === target.id ? { ...group, tabs: [...group.tabs, spec], activeKey: spec.key } : group,
    ),
    target.id,
  );
}

export function focusTab(layout: Layout, gid: string, key: string): Layout {
  return withGroups(
    layout,
    layout.groups.map((group) => (group.id === gid ? { ...group, activeKey: key } : group)),
    gid,
  );
}

/** Close a tab. An emptied group folds away unless it is the last one, which
 *  stays and shows the watermark. */
export function closeTab(layout: Layout, gid: string, key: string): Layout {
  const groups: Group[] = [];
  for (const group of layout.groups) {
    if (group.id !== gid) {
      groups.push(group);
      continue;
    }
    const index = group.tabs.findIndex((tab) => tab.key === key);
    const tabs = group.tabs.filter((tab) => tab.key !== key);
    if (tabs.length === 0 && layout.groups.length > 1) continue;
    const next = tabs[Math.min(index, tabs.length - 1)];
    groups.push({ ...group, tabs, activeKey: next?.key ?? "" });
  }
  const stillThere = groups.some((group) => group.id === gid);
  return withGroups(layout, groups, stillThere ? gid : groups[groups.length - 1]?.id);
}

/** Split a tab into a new group to its right. Two groups is the limit that
 *  still leaves each pane readable at this window size. */
export const maxGroups = 3;

export function splitRight(layout: Layout, gid: string, key: string): Layout {
  if (layout.groups.length >= maxGroups) return layout;
  const source = layout.groups.find((group) => group.id === gid);
  const tab = source?.tabs.find((item) => item.key === key);
  if (!source || !tab) return layout;

  const id = groupId();
  const at = layout.groups.findIndex((group) => group.id === gid);
  const groups = [...layout.groups];
  groups.splice(at + 1, 0, { id, tabs: [tab], activeKey: tab.key });
  return withGroups(layout, groups, id);
}

export function closeGroup(layout: Layout, gid: string): Layout {
  if (layout.groups.length <= 1) {
    return withGroups(layout, [{ ...layout.groups[0], tabs: [], activeKey: "" }]);
  }
  return withGroups(
    layout,
    layout.groups.filter((group) => group.id !== gid),
  );
}

/** Move a tab to a neighbouring group, which is how a pane is rearranged
 *  without a drag target on every edge. */
export function moveTab(layout: Layout, gid: string, key: string, toGroupId: string): Layout {
  if (gid === toGroupId) return layout;
  const tab = layout.groups.find((group) => group.id === gid)?.tabs.find((item) => item.key === key);
  if (!tab) return layout;
  const detached = closeTab(layout, gid, key);
  return openTab(detached, tab, toGroupId);
}

/* ------------------------------------------------------------- persistence
 *  Written to this machine's browser storage, read back after mount so the
 *  first render matches the prerendered HTML. */

const STORAGE_KEY = "open-cube.layout.v1";

export interface StoredShell {
  layout: Layout;
  activity: ActivityId;
  sidebar: boolean;
  sidebarWidth: number;
}

export function saveShell(state: StoredShell) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage can be unavailable; the layout is a convenience, not state */
  }
}

export function loadShell(): StoredShell | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredShell;
    if (!parsed?.layout?.groups?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Drop tabs whose object is gone — an agent removed from the engine, a
 *  sandbox that no longer exists — so a restored layout cannot point at
 *  nothing. A group left empty by the pruning folds away. */
export function pruneLayout(layout: Layout, snapshot: DesktopSnapshot, chatIds: Set<string>): Layout {
  const alive = (tab: TabSpec): boolean => {
    switch (tab.view) {
      case "chat":
        return tab.target === "workbench" || chatIds.has(tab.target ?? "");
      case "agent":
      case "studio":
        return !tab.target || snapshot.agents.some((agent) => agent.id === tab.target);
      case "sandboxes":
        return !tab.target || snapshot.sandboxes.some((sandbox) => sandbox.id === tab.target);
      case "models":
        return !tab.target || snapshot.models.some((model) => model.id === tab.target);
      case "project":
        return !tab.target || snapshot.projects.some((project) => project.id === tab.target);
      default:
        return true;
    }
  };

  const groups = layout.groups
    .map((group) => {
      const tabs = group.tabs.filter(alive);
      return {
        ...group,
        tabs,
        activeKey: tabs.some((tab) => tab.key === group.activeKey) ? group.activeKey : (tabs[0]?.key ?? ""),
      };
    })
    .filter((group, index) => group.tabs.length > 0 || index === 0);

  // Ids are regenerated per session; keep the restored ones unique either way.
  for (const group of groups) counter = Math.max(counter, Number(group.id.split("-")[1]) || 0);

  if (groups.length === 0) return defaultLayout();
  return withGroups(layout, groups);
}
