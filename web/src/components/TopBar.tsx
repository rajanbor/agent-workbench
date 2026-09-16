import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { ModelGlyph } from "./Glyph";
import { Badge, IconButton } from "./primitives";
import { accentOf, compactTokens } from "../lib/identity";
import type { DesktopSnapshot, ModelCard } from "../lib/engine";

export function TopBar({
  snapshot,
  source,
  chatModel,
  onChatModel,
  panels,
  onTogglePanel,
  onPalette,
  onUsage,
  period,
  onPeriod,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  source: "engine" | "preview";
  chatModel: ModelCard;
  onChatModel: (id: string) => void;
  panels: { left: boolean; right: boolean; terminal: boolean };
  onTogglePanel: (panel: "left" | "right" | "terminal") => void;
  onPalette: () => void;
  onUsage: () => void;
  period: string;
  onPeriod: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const vcs = snapshot.versionControl;
  const usage = snapshot.usage;
  const active = usage.periods.find((item) => item.id === period);

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

        <Menu
          className="menu--usage"
          align="right"
          title="Spend over a period"
          label={
            <>
              <Icon name="bolt" size={13} />
              <span className="mono">${(active?.costUsd ?? usage.costUsd).toFixed(2)}</span>
              <em>{active?.label ?? usage.window}</em>
            </>
          }
        >
          {(close) => (
            <>
              <p className="menu__label">Period</p>
              {usage.periods.map((item) => (
                <button
                  key={item.id}
                  className={`menu__item ${item.id === period ? "is-checked" : ""}`}
                  onClick={() => {
                    onPeriod(item.id);
                    close();
                  }}
                >
                  <Icon name="clock" size={14} />
                  <span>
                    <strong>{item.label}</strong>
                    <small className="mono">
                      {compactTokens(item.tokensIn + item.tokensOut)} tokens · {item.calls} calls
                    </small>
                  </span>
                  <em className="mono">${item.costUsd.toFixed(2)}</em>
                </button>
              ))}
              <button
                className="menu__item"
                onClick={() => {
                  onUsage();
                  close();
                }}
              >
                <Icon name="run" size={14} />
                <span>Open the usage panel</span>
              </button>
              <div className="menu__note">
                State from the {source === "engine" ? "Rust engine" : "preview snapshot"}.
              </div>
            </>
          )}
        </Menu>

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
        </div>
      </div>
    </header>
  );
}
