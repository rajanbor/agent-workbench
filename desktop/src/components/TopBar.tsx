import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { ModelGlyph } from "./Glyph";
import { Badge, IconButton, KeyHint } from "./primitives";
import { accentOf, compactTokens } from "../lib/identity";
import type { DesktopSnapshot, ModelCard } from "../lib/engine";
import type { ThemeChoice } from "../lib/theme";

function Menu({
  label,
  children,
  align = "left",
  className = "",
}: {
  label: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${className}`} ref={holder}>
      <button
        className={`menu__trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <Icon name="chevronDown" size={13} />
      </button>
      {open && <div className={`menu__panel menu__panel--${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function TopBar({
  snapshot,
  source,
  chatModel,
  onChatModel,
  panels,
  onTogglePanel,
  theme,
  onTheme,
  onPalette,
  onUsage,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  source: "engine" | "preview";
  chatModel: ModelCard;
  onChatModel: (id: string) => void;
  panels: { left: boolean; right: boolean; terminal: boolean };
  onTogglePanel: (panel: "left" | "right" | "terminal") => void;
  theme: ThemeChoice;
  onTheme: (theme: ThemeChoice) => void;
  onPalette: () => void;
  onUsage: () => void;
  onAction: (message: string) => void;
}) {
  const vcs = snapshot.versionControl;
  const usage = snapshot.usage;

  return (
    <header className="topbar" data-tauri-drag-region>
      <div className="topbar__left">
        <span className="brand-mark">
          <Icon name="cube" size={16} />
        </span>
        <Menu label={<span className="brand-name">Open Cube</span>}>
          {(close) => (
            <>
              <p className="menu__label">Workspace</p>
              <button className="menu__item is-checked" onClick={close}>
                <Icon name="folder" size={14} />
                <span>
                  <strong>Open Cube</strong>
                  <small className="mono">~/Projects/open-cube</small>
                </span>
                <Icon name="check" size={13} />
              </button>
              <button
                className="menu__item"
                onClick={() => {
                  onAction("Adding a workspace needs the workbench daemon.");
                  close();
                }}
              >
                <Icon name="plus" size={14} />
                <span>Add workspace…</span>
              </button>
              <p className="menu__label">Machine</p>
              <div className="menu__note">
                {snapshot.computer.deviceKind} · {snapshot.computer.operatingSystem}/
                {snapshot.computer.architecture} · {snapshot.computer.runtimeStatus}
              </div>
            </>
          )}
        </Menu>

        {/* Version control, always reachable from the top menu. */}
        <Menu
          className="menu--vcs"
          label={
            <>
              <Icon name="git" size={14} />
              <span className="mono">{vcs.branch}</span>
              {vcs.dirty > 0 && <i className="dirty-dot" title={`${vcs.dirty} uncommitted files`} />}
            </>
          }
        >
          {(close) => (
            <>
              <p className="menu__label">Version control</p>
              <div className="menu__head">
                <span className="mono">{vcs.head.hash}</span>
                <span>{vcs.head.title}</span>
                <small>
                  {vcs.head.author} · {vcs.head.when}
                </small>
              </div>
              <div className="menu__stats">
                <span>
                  <strong>{vcs.dirty}</strong> changed
                </span>
                <span>
                  <strong>{vcs.ahead}</strong> ahead
                </span>
                <span>
                  <strong>{vcs.behind}</strong> behind
                </span>
              </div>
              <p className="menu__label">Recent commits</p>
              {vcs.recent.map((commit) => (
                <button
                  key={commit.hash}
                  className="menu__item"
                  onClick={() => {
                    onAction(`Commit ${commit.hash} is read-only in this prototype.`);
                    close();
                  }}
                >
                  <Icon name="commit" size={14} />
                  <span>
                    <strong>{commit.title}</strong>
                    <small className="mono">
                      {commit.hash} · {commit.when}
                    </small>
                  </span>
                </button>
              ))}
              <p className="menu__label">Pinned model versions</p>
              {snapshot.models
                .filter((model) => model.revisions.some((revision) => revision.pinned))
                .map((model) => (
                  <div className="menu__pin" key={model.id}>
                    <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={18} />
                    <span>{model.name}</span>
                    <em className="mono">{model.version}</em>
                  </div>
                ))}
            </>
          )}
        </Menu>
      </div>

      <div className="topbar__right">
        {/* Which model answers in the chat, and what it costs. */}
        <Menu
          className="menu--model"
          align="right"
          label={
            <>
              <ModelGlyph icon={chatModel.icon} accent={accentOf(chatModel.accent)} size={18} />
              <span>{chatModel.name}</span>
            </>
          }
        >
          {(close) => (
            <>
              <p className="menu__label">Chat model</p>
              {snapshot.models.map((model) => (
                <button
                  key={model.id}
                  className={`menu__item ${model.id === chatModel.id ? "is-checked" : ""}`}
                  onClick={() => {
                    if (model.ready) onChatModel(model.id);
                    else
                      onAction(
                        `${model.name} is catalogued but not connected; the built-in inspector stays selected.`,
                      );
                    close();
                  }}
                >
                  <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={20} />
                  <span>
                    <strong>{model.name}</strong>
                    <small>
                      {model.vendor} · {model.location} · {model.version}
                    </small>
                  </span>
                  {model.ready ? (
                    <Badge tone="green">ready</Badge>
                  ) : (
                    <Badge tone="neutral">{model.location === "api" ? "not connected" : "not downloaded"}</Badge>
                  )}
                </button>
              ))}
              <div className="menu__note">
                Every answer reports the model, its version, tokens and cost. The inspector reads
                the snapshot only — never files, credentials or the network.
              </div>
            </>
          )}
        </Menu>

        <button
          className="usage-chip"
          title={`${compactTokens(usage.tokensIn + usage.tokensOut)} tokens ${usage.window} · state from the ${
            source === "engine" ? "Rust engine" : "preview snapshot"
          }`}
          onClick={onUsage}
        >
          <Icon name="bolt" size={13} />
          <span className="mono">${usage.costUsd.toFixed(2)}</span>
        </button>

        <div className="topbar__tools">
          <IconButton icon="search" label="Command palette (⌘K)" onClick={onPalette} />
          <IconButton
            icon="panelLeft"
            label="Toggle agents panel (⌘B)"
            className={panels.left ? "is-on" : ""}
            onClick={() => onTogglePanel("left")}
          />
          <IconButton
            icon="panelBottom"
            label="Toggle terminals (⌘J)"
            className={panels.terminal ? "is-on" : ""}
            onClick={() => onTogglePanel("terminal")}
          />
          <IconButton
            icon="panelRight"
            label="Toggle workbench API (⌘I)"
            className={panels.right ? "is-on" : ""}
            onClick={() => onTogglePanel("right")}
          />
          <Menu className="menu--theme" align="right" label={<Icon name={theme === "light" ? "sun" : theme === "dark" ? "moon" : "monitor"} size={15} />}>
            {(close) => (
              <>
                <p className="menu__label">Appearance</p>
                {(["light", "dark", "system"] as ThemeChoice[]).map((option) => (
                  <button
                    key={option}
                    className={`menu__item ${theme === option ? "is-checked" : ""}`}
                    onClick={() => {
                      onTheme(option);
                      close();
                    }}
                  >
                    <Icon name={option === "light" ? "sun" : option === "dark" ? "moon" : "monitor"} size={14} />
                    <span style={{ textTransform: "capitalize" }}>{option}</span>
                    {theme === option && <Icon name="check" size={13} />}
                  </button>
                ))}
                <div className="menu__note">
                  <KeyHint>⌘K</KeyHint> palette · <KeyHint>⌘B</KeyHint> agents ·{" "}
                  <KeyHint>⌘J</KeyHint> terminals · <KeyHint>⌘I</KeyHint> API
                </div>
              </>
            )}
          </Menu>
        </div>
      </div>
    </header>
  );
}
