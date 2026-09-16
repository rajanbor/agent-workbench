import { useState } from "react";
import { Icon } from "./Icon";
import { RailSection } from "./RailSection";
import { Badge, IconButton } from "./primitives";
import { toneOf } from "../lib/identity";
import type { DesktopSnapshot } from "../lib/engine";

/** Values, functions and modules the engine exposes, plus the inspector policy. */
export function RightRail({
  snapshot,
  onClose,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  onClose: () => void;
  onAction: (message: string) => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const { values, functions, modules } = snapshot.capabilities;

  return (
    <aside className="rail rail--right">
      <header className="rail__head">
        <span>
          <Icon name="sliders" size={14} /> Workbench API
        </span>
        <IconButton icon="panelRight" label="Hide panel" onClick={onClose} />
      </header>

      <div className="rail__scroll">
        <RailSection title="Values" count={values.length} icon="tag">
          {values.map((entry) => (
            <div className="kv-row" key={entry.key}>
              <span className="kv-row__key mono">{entry.key}</span>
              <span className="kv-row__value">
                {entry.secret ? (
                  <button
                    className="secret"
                    onClick={() => {
                      setRevealed(revealed === entry.key ? null : entry.key);
                      onAction("Secrets stay with the provider tool; the shell never stores one.");
                    }}
                  >
                    <Icon name="lock" size={11} />
                    {revealed === entry.key ? entry.value : "••••••••"}
                  </button>
                ) : (
                  <span className="mono">{entry.value}</span>
                )}
              </span>
              <em className="kv-row__scope">{entry.scope}</em>
            </div>
          ))}
        </RailSection>

        <RailSection title="Functions" count={functions.length} icon="code" defaultOpen={false}>
          {functions.map((fn) => (
            <details className="fn" key={fn.name}>
              <summary>
                <Icon name="chevronRight" size={12} />
                <span className="mono">{fn.name}</span>
                <Badge tone={fn.permission === "read" ? "green" : "amber"}>{fn.permission}</Badge>
              </summary>
              <p className="fn__signature mono">{fn.signature}</p>
              <p className="fn__description">{fn.description}</p>
              <p className="fn__module mono">{fn.module}</p>
            </details>
          ))}
        </RailSection>

        <RailSection title="Modules" count={modules.length} icon="module" defaultOpen={false}>
          {modules.map((module) => (
            <div className="module-row" key={module.name}>
              <span className="module-row__main">
                <strong className="mono">{module.name}</strong>
                <small>{module.description}</small>
              </span>
              <span className="module-row__tail">
                <Badge tone={toneOf(module.status)}>{module.status}</Badge>
                <em className="mono">{module.version}</em>
              </span>
            </div>
          ))}
        </RailSection>

        <RailSection title="Inspector policy" icon="shield" defaultOpen={false}>
          <p className="rail-copy">
            Mode <strong>{snapshot.inspector.mode}</strong> · egress{" "}
            <strong>{snapshot.inspector.egress}</strong>
          </p>
          {snapshot.inspector.scopes.map((scope) => (
            <div className="scope-row" key={scope.name}>
              <Icon name={scope.granted ? "check" : "lock"} size={13} />
              <span>
                <strong>{scope.name}</strong>
                <small>{scope.detail}</small>
              </span>
              <Badge tone={scope.granted ? "green" : "neutral"}>
                {scope.granted ? "read" : "refused"}
              </Badge>
            </div>
          ))}
        </RailSection>
      </div>
    </aside>
  );
}
