import { Icon } from "../components/Icon";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import type { ThemeChoice } from "../lib/theme";
import type { DesktopSnapshot } from "../lib/engine";

const themes: { id: ThemeChoice; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "Bright surfaces, same density" },
  { id: "dark", label: "Dark", hint: "Default for long sessions" },
  { id: "system", label: "System", hint: "Follow the operating system" },
];

function ThemePreview({ variant }: { variant: ThemeChoice }) {
  return (
    <span className={`theme-preview theme-preview--${variant}`} aria-hidden="true">
      <span className="theme-preview__side" />
      <span className="theme-preview__main">
        <span className="theme-preview__bar" />
        <span className="theme-preview__block" />
        <span className="theme-preview__block theme-preview__block--short" />
      </span>
    </span>
  );
}

export function SettingsView({
  snapshot,
  source,
  theme,
  onTheme,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  source: "engine" | "preview";
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
  onAction: (message: string) => void;
}) {
  return (
    <div className="stack">
      <SectionTitle>Appearance</SectionTitle>
      <div className="theme-grid">
        {themes.map((option) => (
          <button
            key={option.id}
            className={`theme-card ${theme === option.id ? "is-active" : ""}`}
            onClick={() => onTheme(option.id)}
            aria-pressed={theme === option.id}
          >
            <ThemePreview variant={option.id} />
            <span className="theme-card__meta">
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </span>
            {theme === option.id && (
              <span className="theme-card__check">
                <Icon name="check" size={14} />
              </span>
            )}
          </button>
        ))}
      </div>

      <SectionTitle count={snapshot.providers.length}>Providers</SectionTitle>
      <Card className="table table--providers">
        <div className="table__head">
          <span>Provider</span>
          <span>Detail</span>
          <span>State</span>
        </div>
        {snapshot.providers.map((provider) => (
          <div key={provider.id} className="table__row is-static">
            <span className="table__main">
              <Icon name="agent" size={15} />
              <strong>{provider.name}</strong>
            </span>
            <span className="row__meta">{provider.detail}</span>
            <span>
              <Badge tone={provider.connected ? "green" : "neutral"}>
                {provider.connected ? "connected" : "not connected"}
              </Badge>
            </span>
          </div>
        ))}
      </Card>

      <SectionTitle count={snapshot.inspector.scopes.length}>In-app model policy</SectionTitle>
      <Card className="pad">
        <div className="kv">
          <span>Inspector model</span>
          <strong className="mono">{snapshot.inspector.modelId}</strong>
        </div>
        <div className="kv">
          <span>Mode</span>
          <strong>{snapshot.inspector.mode}</strong>
        </div>
        <div className="kv">
          <span>Egress</span>
          <strong>{snapshot.inspector.egress}</strong>
        </div>
        <div className="kv">
          <span>Redacted terms</span>
          <strong className="mono">{snapshot.inspector.redactions.join(", ")}</strong>
        </div>
        <div className="scope-grid">
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
        </div>
      </Card>

      <SectionTitle>Security</SectionTitle>
      <Card className="pad">
        <div className="kv">
          <span>Execution boundary</span>
          <strong>Separate standard macOS user</strong>
        </div>
        <div className="kv">
          <span>Credentials</span>
          <strong>Stored by each provider tool, never by Open Cube</strong>
        </div>
        <div className="kv">
          <span>Telemetry</span>
          <strong>None</strong>
        </div>
        <div className="kv">
          <span>Network assets</span>
          <strong>None — system typefaces and inline icons only</strong>
        </div>
        <Button icon="shield" onClick={() => onAction("The security model is documented in docs/SECURITY.md.")}>
          Read the security model
        </Button>
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card className="pad">
        <div className="kv">
          <span>Desktop client</span>
          <strong className="mono">0.2.0-alpha.1</strong>
        </div>
        <div className="kv">
          <span>State source</span>
          <strong>{source === "engine" ? "Rust engine (Tauri)" : "Generated preview snapshot"}</strong>
        </div>
        <div className="kv">
          <span>Host</span>
          <strong>
            {snapshot.computer.deviceKind} · {snapshot.computer.operatingSystem}/
            {snapshot.computer.architecture}
          </strong>
        </div>
        <div className="kv">
          <span>Status</span>
          <strong>Alpha · not independently security-audited</strong>
        </div>
      </Card>
    </div>
  );
}
