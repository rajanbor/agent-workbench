/** The workbench read as a relational schema.
 *
 *  An agent is an object with typed fields: its own key, the foreign keys that
 *  point at its model, sandbox and project, and join rows for the skills,
 *  patterns and MCP servers it was given. Sandboxes, models and the library are
 *  the tables those keys point at. Everything here is derived from the engine
 *  snapshot — nothing is hand-written.
 */
import type { DesktopSnapshot } from "./engine";

export type FieldKey = "pk" | "fk" | "join" | "value";

export interface SchemaField {
  name: string;
  type: string;
  value?: string;
  key: FieldKey;
  /** Table id this field points at, when it is a key. */
  references?: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  kind: "agent" | "sandbox" | "model" | "library";
  subtitle: string;
  accent: string;
  fields: SchemaField[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SchemaEdge {
  id: string;
  from: string;
  fromField: number;
  to: string;
  label: string;
}

export interface SchemaGroup {
  id: string;
  label: string;
  detail: string;
  tables: string[];
}

export interface Schema {
  tables: SchemaTable[];
  edges: SchemaEdge[];
  groups: SchemaGroup[];
}

const HEADER = 34;
const ROW = 22;
const PADDING = 10;
const WIDTH = 230;
const GAP_Y = 34;

function height(fields: number) {
  return HEADER + fields * ROW + PADDING;
}

export function buildSchema(snapshot: DesktopSnapshot): Schema {
  const tables: SchemaTable[] = [];
  const edges: SchemaEdge[] = [];

  /* --- sandboxes: the left column, one table each --------------------- */
  let y = 0;
  for (const sandbox of snapshot.sandboxes) {
    const fields: SchemaField[] = [
      { name: "id", type: "text", value: sandbox.id, key: "pk" },
      { name: "isolation", type: "text", value: sandbox.isolation.split(" · ")[0], key: "value" },
      { name: "state", type: "enum", value: sandbox.state, key: "value" },
      { name: "network", type: "policy", value: sandbox.network.mode, key: "value" },
      { name: "mounts", type: `mount[${sandbox.mounts.length}]`, key: "value" },
      { name: "machine", type: "text", value: sandbox.machine, key: "value" },
    ];
    tables.push({
      id: `sandbox:${sandbox.id}`,
      name: sandbox.name,
      kind: "sandbox",
      subtitle: "sandbox",
      accent: "violet",
      fields,
      x: 0,
      y,
      width: WIDTH,
      height: height(fields.length),
    });
    y += height(fields.length) + GAP_Y;
  }

  /* --- agents: the middle column, keys pointing outward ---------------- */
  y = 0;
  for (const agent of snapshot.agents) {
    const fields: SchemaField[] = [
      { name: "id", type: "text", value: agent.id, key: "pk" },
      { name: "role", type: "text", value: agent.role, key: "value" },
      { name: "status", type: "enum", value: agent.status, key: "value" },
      {
        name: "model_id",
        type: "→ model",
        value: agent.modelId,
        key: "fk",
        references: `model:${agent.modelId}`,
      },
      {
        name: "sandbox_id",
        type: "→ sandbox",
        value: agent.sandboxId,
        key: "fk",
        references: `sandbox:${agent.sandboxId}`,
      },
      { name: "project", type: "text", value: agent.project.name, key: "value" },
      { name: "branch", type: "text", value: agent.project.branch, key: "value" },
      { name: "revision", type: "hash", value: agent.revision, key: "value" },
      {
        name: "skills",
        type: `join[${agent.blueprint.skills.length}]`,
        key: "join",
        references: "library:skills",
      },
      {
        name: "patterns",
        type: `join[${agent.blueprint.patterns.length}]`,
        key: "join",
        references: "library:patterns",
      },
      {
        name: "mcp",
        type: `join[${agent.blueprint.mcp.length}]`,
        key: "join",
        references: "library:mcp",
      },
      { name: "chats", type: `has[${agent.chats.length}]`, key: "value" },
    ];

    const id = `agent:${agent.id}`;
    tables.push({
      id,
      name: agent.name,
      kind: "agent",
      subtitle: "agent",
      accent: agent.accent,
      fields,
      x: WIDTH + 150,
      y,
      width: WIDTH + 30,
      height: height(fields.length),
    });

    fields.forEach((field, index) => {
      if (!field.references) return;
      edges.push({
        id: `${id}.${field.name}`,
        from: id,
        fromField: index,
        to: field.references,
        label: field.key === "fk" ? "1" : "n",
      });
    });

    y += height(fields.length) + GAP_Y;
  }

  /* --- models: the right column ---------------------------------------- */
  y = 0;
  for (const model of snapshot.models) {
    const fields: SchemaField[] = [
      { name: "id", type: "text", value: model.id, key: "pk" },
      { name: "vendor", type: "text", value: model.vendor, key: "value" },
      { name: "location", type: "enum", value: model.location, key: "value" },
      { name: "version", type: "text", value: model.version, key: "value" },
      { name: "ready", type: "bool", value: model.ready ? "true" : "false", key: "value" },
    ];
    tables.push({
      id: `model:${model.id}`,
      name: model.name,
      kind: "model",
      subtitle: "model",
      accent: model.accent,
      fields,
      x: (WIDTH + 150) * 2 + 40,
      y,
      width: WIDTH,
      height: height(fields.length),
    });
    y += height(fields.length) + GAP_Y;
  }

  /* --- the library: join targets --------------------------------------- */
  const libraries: { id: string; name: string; rows: string[] }[] = [
    { id: "library:skills", name: "skills", rows: snapshot.library.skills.map((s) => s.id) },
    { id: "library:patterns", name: "patterns", rows: snapshot.library.patterns.map((p) => p.id) },
    { id: "library:mcp", name: "mcp_servers", rows: snapshot.library.mcp.map((m) => m.id) },
  ];
  y = 0;
  for (const library of libraries) {
    const fields: SchemaField[] = library.rows.map((row) => ({
      name: row,
      type: "row",
      key: "value" as const,
    }));
    tables.push({
      id: library.id,
      name: library.name,
      kind: "library",
      subtitle: "library",
      accent: "neutral",
      fields,
      x: (WIDTH + 150) * 3 + 60,
      y,
      width: WIDTH,
      height: height(fields.length),
    });
    y += height(fields.length) + GAP_Y;
  }

  /* --- groups: agents that work in the same sandbox --------------------- */
  const groups: SchemaGroup[] = snapshot.sandboxes
    .map((sandbox) => {
      const members = snapshot.agents.filter((agent) => agent.sandboxId === sandbox.id);
      return {
        id: `group:${sandbox.id}`,
        label: sandbox.name,
        detail: `${members.length} agents · ${sandbox.isolation.split(" · ")[0]}`,
        tables: members.map((agent) => `agent:${agent.id}`),
      };
    })
    .filter((group) => group.tables.length > 1);

  return { tables, edges, groups };
}

/** Anchor points for an edge: the right edge of the source field row, and the
 *  left edge of the target header. */
export function anchors(schema: Schema, edge: SchemaEdge) {
  const from = schema.tables.find((table) => table.id === edge.from);
  const to = schema.tables.find((table) => table.id === edge.to);
  if (!from || !to) return null;
  return {
    x1: from.x + from.width,
    y1: from.y + HEADER + edge.fromField * ROW + ROW / 2,
    x2: to.x,
    y2: to.y + HEADER / 2,
  };
}

export const SCHEMA_METRICS = { HEADER, ROW, PADDING };
