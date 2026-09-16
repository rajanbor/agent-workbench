import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Badge, Button, IconButton } from "../components/primitives";
import { SchemaGraph } from "../components/SchemaGraph";
import { toneOf } from "../lib/identity";
import { buildSchema } from "../lib/schema";
import type { DesktopSnapshot, Workflow, WorkflowEdge, WorkflowNode } from "../lib/engine";

const NODE_WIDTH = 176;
const NODE_HEIGHT = 64;
const STORAGE_KEY = "open-cube.workflow";

const kinds: { id: string; label: string; icon: string }[] = [
  { id: "trigger", label: "Trigger", icon: "clock" },
  { id: "agent", label: "Agent", icon: "agent" },
  { id: "sandbox", label: "Sandbox", icon: "sandbox" },
  { id: "output", label: "Output", icon: "logs" },
];

function load(workflow: Workflow): Workflow {
  if (typeof window === "undefined") return workflow;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Workflow;
      if (parsed.nodes?.length) return parsed;
    }
  } catch {
    /* ignore unreadable storage and start from the engine layout */
  }
  return workflow;
}

function edgePath(from: WorkflowNode, to: WorkflowNode) {
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_HEIGHT / 2;
  const bend = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

export function CanvasView({
  snapshot,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  onAction: (message: string) => void;
}) {
  // Stored layout is adopted after mount so the first render matches the
  // prerendered HTML.
  const [workflow, setWorkflow] = useState<Workflow>(snapshot.workflow);
  const [adopted, setAdopted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [mode, setMode] = useState<"workflow" | "schema">("workflow");
  const [table, setTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const surface = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkflow(load(snapshot.workflow));
    setAdopted(true);
  }, [snapshot.workflow]);

  useEffect(() => {
    if (!adopted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
    } catch {
      /* layout stays for this session only */
    }
  }, [adopted, workflow]);

  const node = useMemo(
    () => workflow.nodes.find((item) => item.id === selected) ?? null,
    [selected, workflow.nodes],
  );

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setWorkflow((current) => ({
      ...current,
      nodes: current.nodes.map((item) => (item.id === id ? { ...item, x, y } : item)),
    }));
  }, []);

  const dragNode = (event: React.PointerEvent, item: WorkflowNode) => {
    if (linkFrom) return;
    event.stopPropagation();
    setSelected(item.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = item.x;
    const originY = item.y;
    const move = (moveEvent: PointerEvent) => {
      moveNode(
        item.id,
        Math.round(originX + (moveEvent.clientX - startX) / zoom),
        Math.round(originY + (moveEvent.clientY - startY) / zoom),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const dragSurface = (event: React.PointerEvent) => {
    if (event.target !== surface.current) return;
    setSelected(null);
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...pan };
    const move = (moveEvent: PointerEvent) => {
      setPan({ x: origin.x + (moveEvent.clientX - startX), y: origin.y + (moveEvent.clientY - startY) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const connect = (targetId: string) => {
    if (!linkFrom || linkFrom === targetId) {
      setLinkFrom(null);
      return;
    }
    const edge: WorkflowEdge = {
      id: `e${Date.now()}`,
      from: linkFrom,
      to: targetId,
      label: "then",
    };
    setWorkflow((current) => ({ ...current, edges: [...current.edges, edge] }));
    setLinkFrom(null);
  };

  const addNode = (kind: string) => {
    const id = `${kind}-${Date.now().toString(36)}`;
    const item: WorkflowNode = {
      id,
      kind,
      label: kind === "agent" ? "New agent" : `New ${kind}`,
      detail: kind === "agent" ? "no model attached" : "unconfigured",
      status: "idle",
      x: Math.round(120 - pan.x / zoom + Math.random() * 80),
      y: Math.round(120 - pan.y / zoom + Math.random() * 80),
    };
    setWorkflow((current) => ({ ...current, nodes: [...current.nodes, item] }));
    setSelected(id);
  };

  const removeSelected = () => {
    if (!selected) return;
    setWorkflow((current) => ({
      nodes: current.nodes.filter((item) => item.id !== selected),
      edges: current.edges.filter((edge) => edge.from !== selected && edge.to !== selected),
      id: current.id,
      name: current.name,
    }));
    setSelected(null);
  };

  const rename = (value: string) => {
    if (!selected) return;
    setWorkflow((current) => ({
      ...current,
      nodes: current.nodes.map((item) => (item.id === selected ? { ...item, label: value } : item)),
    }));
  };

  return (
    <section className="canvas">
      <header className="canvas__bar">
        <div className="canvas__title">
          <Icon name={mode === "workflow" ? "canvas" : "layers"} size={16} />
          <strong>{mode === "workflow" ? workflow.name : "Workbench schema"}</strong>
          <div className="filter-row">
            <button
              className={`filter-row__item ${mode === "workflow" ? "is-active" : ""}`}
              onClick={() => setMode("workflow")}
            >
              Workflow
            </button>
            <button
              className={`filter-row__item ${mode === "schema" ? "is-active" : ""}`}
              onClick={() => setMode("schema")}
            >
              Schema
            </button>
          </div>
        </div>
        <div className="canvas__tools">
          {mode === "workflow" &&
            kinds.map((kind) => (
              <Button key={kind.id} size="sm" icon={kind.icon} onClick={() => addNode(kind.id)}>
                {kind.label}
              </Button>
            ))}
          {mode === "workflow" && (
            <>
              <span className="canvas__divider" />
              <Button
                size="sm"
                icon="link"
                variant={linkFrom ? "primary" : "secondary"}
                onClick={() => setLinkFrom(linkFrom ? null : (selected ?? null))}
              >
                {linkFrom ? "Pick target" : "Link"}
              </Button>
              <IconButton icon="trash" label="Delete node" onClick={removeSelected} />
            </>
          )}
          {mode === "schema" && (
            <Badge tone="neutral">
              {snapshot.agents.length} agents · {snapshot.sandboxes.length} sandboxes ·{" "}
              {snapshot.models.length} models
            </Badge>
          )}
          <span className="canvas__divider" />
          <IconButton icon="zoomOut" label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} />
          <span className="canvas__zoom mono">{Math.round(zoom * 100)}%</span>
          <IconButton icon="zoomIn" label="Zoom in" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} />
          <IconButton
            icon="refresh"
            label={mode === "workflow" ? "Reset to the engine layout" : "Recentre"}
            onClick={() => {
              if (mode === "workflow") {
                setWorkflow(snapshot.workflow);
                onAction("Canvas reset to the layout the engine ships.");
              }
              setPan({ x: 0, y: 0 });
              setZoom(1);
            }}
          />
        </div>
      </header>

      <div className="canvas__stage">
        <div className="canvas__surface" ref={surface} onPointerDown={dragSurface}>
          <div
            className="canvas__space"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {mode === "schema" && (
              <SchemaGraph snapshot={snapshot} selected={table} onSelect={setTable} />
            )}

            {mode === "workflow" && (
              <svg className="canvas__edges">
              {workflow.edges.map((edge) => {
                const from = workflow.nodes.find((item) => item.id === edge.from);
                const to = workflow.nodes.find((item) => item.id === edge.to);
                if (!from || !to) return null;
                return (
                  <g key={edge.id}>
                    <path d={edgePath(from, to)} />
                    <text>
                      <textPath href={`#${edge.id}`}>{edge.label}</textPath>
                    </text>
                  </g>
                );
              })}
              </svg>
            )}

            {mode === "workflow" &&
              workflow.nodes.map((item) => (
              <article
                key={item.id}
                className={`wf-node wf-node--${item.kind} ${selected === item.id ? "is-selected" : ""} ${
                  linkFrom && linkFrom !== item.id ? "is-target" : ""
                }`}
                style={{ left: item.x, top: item.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
                onPointerDown={(event) => dragNode(event, item)}
                onClick={() => (linkFrom ? connect(item.id) : setSelected(item.id))}
              >
                <span className={`wf-node__dot wf-node__dot--${toneOf(item.status)}`} />
                <span className="wf-node__body">
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <button
                  className="wf-node__port"
                  aria-label={`Link from ${item.label}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setLinkFrom(item.id);
                  }}
                >
                  <Icon name="link" size={11} />
                </button>
                </article>
              ))}
          </div>
        </div>

        <aside className="canvas__inspector">
          {mode === "schema" ? (
            <SchemaInspector snapshot={snapshot} selected={table} />
          ) : node ? (
            <>
              <p className="eyebrow">{node.kind}</p>
              <input
                className="canvas__name"
                value={node.label}
                onChange={(event) => rename(event.target.value)}
                aria-label="Node name"
              />
              <p className="muted-copy">{node.detail}</p>
              <div className="kv">
                <span>Status</span>
                <Badge tone={toneOf(node.status)}>{node.status}</Badge>
              </div>
              <div className="kv">
                <span>Position</span>
                <strong className="mono">
                  {Math.round(node.x)}, {Math.round(node.y)}
                </strong>
              </div>
              <div className="kv">
                <span>Links</span>
                <strong className="mono">
                  {workflow.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length}
                </strong>
              </div>
              <Button
                size="sm"
                icon="play"
                onClick={() => onAction("Running a workflow needs the agent runtime.")}
              >
                Run from here
              </Button>
            </>
          ) : (
            <>
              <p className="eyebrow">Canvas</p>
              <p className="muted-copy">
                Drag to move, link to connect, pan the background. Stored on this machine only.
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

/** What the selected table is, and how the schema hangs together. */
function SchemaInspector({
  snapshot,
  selected,
}: {
  snapshot: DesktopSnapshot;
  selected: string | null;
}) {
  const schema = buildSchema(snapshot);
  const table = schema.tables.find((item) => item.id === selected);

  if (!table) {
    return (
      <>
        <p className="eyebrow">Schema</p>
        <p className="muted-copy">
          Each agent is an object: its own key, foreign keys to the model and sandbox it runs on,
          and join rows for the skills, patterns and MCP servers it was given. Agents that share a
          sandbox are framed together. Pick a table to see what points at it.
        </p>
        <div className="kv">
          <span>Tables</span>
          <strong className="mono">{schema.tables.length}</strong>
        </div>
        <div className="kv">
          <span>Relations</span>
          <strong className="mono">{schema.edges.length}</strong>
        </div>
        <div className="kv">
          <span>Groups</span>
          <strong className="mono">{schema.groups.length}</strong>
        </div>
      </>
    );
  }

  const incoming = schema.edges.filter((edge) => edge.to === table.id);
  const outgoing = schema.edges.filter((edge) => edge.from === table.id);

  return (
    <>
      <p className="eyebrow">{table.subtitle}</p>
      <h3 className="schema-inspector__name">{table.name}</h3>
      <div className="kv">
        <span>Fields</span>
        <strong className="mono">{table.fields.length}</strong>
      </div>
      <div className="kv">
        <span>Points at</span>
        <strong className="mono">{outgoing.length}</strong>
      </div>
      <div className="kv">
        <span>Referenced by</span>
        <strong className="mono">{incoming.length}</strong>
      </div>
      {incoming.length > 0 && (
        <>
          <p className="eyebrow">References</p>
          {incoming.map((edge) => (
            <p className="muted-copy mono" key={edge.id}>
              {edge.id}
            </p>
          ))}
        </>
      )}
    </>
  );
}
