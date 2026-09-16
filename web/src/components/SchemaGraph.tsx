import { useMemo } from "react";
import { Icon } from "./Icon";
import { accentOf } from "../lib/identity";
import { anchors, buildSchema, type SchemaTable } from "../lib/schema";
import type { DesktopSnapshot } from "../lib/engine";

const keyIcon: Record<string, string> = { pk: "tag", fk: "link", join: "layers" };

/** The workbench drawn as a relational schema: agents as objects with keys,
 *  sandboxes and models as the tables those keys point at, and a frame around
 *  the agents that share a sandbox. */
export function SchemaGraph({
  snapshot,
  selected,
  onSelect,
}: {
  snapshot: DesktopSnapshot;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const schema = useMemo(() => buildSchema(snapshot), [snapshot]);

  const groupBoxes = schema.groups.map((group) => {
    const members = group.tables
      .map((id) => schema.tables.find((table) => table.id === id))
      .filter((table): table is SchemaTable => Boolean(table));
    const x = Math.min(...members.map((table) => table.x));
    const y = Math.min(...members.map((table) => table.y));
    const right = Math.max(...members.map((table) => table.x + table.width));
    const bottom = Math.max(...members.map((table) => table.y + table.height));
    return { ...group, x: x - 14, y: y - 30, width: right - x + 28, height: bottom - y + 44 };
  });

  return (
    <>
      <svg className="canvas__edges">
        {schema.edges.map((edge) => {
          const point = anchors(schema, edge);
          if (!point) return null;
          const bend = Math.max(40, Math.abs(point.x2 - point.x1) / 2);
          const active = selected === edge.from || selected === edge.to;
          return (
            <g key={edge.id} className={active ? "is-active" : ""}>
              <path
                d={`M ${point.x1} ${point.y1} C ${point.x1 + bend} ${point.y1}, ${point.x2 - bend} ${point.y2}, ${point.x2} ${point.y2}`}
              />
              <circle cx={point.x2} cy={point.y2} r={3} />
            </g>
          );
        })}
      </svg>

      {groupBoxes.map((group) => (
        <div
          className="schema-group"
          key={group.id}
          style={{ left: group.x, top: group.y, width: group.width, height: group.height }}
        >
          <span className="schema-group__label">
            <Icon name="sandbox" size={12} />
            {group.label}
            <em>{group.detail}</em>
          </span>
        </div>
      ))}

      {schema.tables.map((table) => (
        <article
          key={table.id}
          className={`schema-table schema-table--${table.kind} ${
            selected === table.id ? "is-selected" : ""
          }`}
          style={{ left: table.x, top: table.y, width: table.width }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(selected === table.id ? null : table.id);
          }}
        >
          <header className={`schema-table__head schema-table__head--${accentOf(table.accent)}`}>
            <strong>{table.name}</strong>
            <em>{table.subtitle}</em>
          </header>
          {table.fields.map((field) => (
            <div className={`schema-field schema-field--${field.key}`} key={field.name}>
              <span className="schema-field__key">
                {keyIcon[field.key] && <Icon name={keyIcon[field.key]} size={11} />}
              </span>
              <span className="schema-field__name mono">{field.name}</span>
              <span className="schema-field__type mono">{field.value ?? field.type}</span>
            </div>
          ))}
        </article>
      ))}
    </>
  );
}
