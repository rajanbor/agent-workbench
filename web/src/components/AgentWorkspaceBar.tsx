import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { Badge } from "./primitives";
import type { Agent, DesktopSnapshot } from "../lib/engine";

/** What an open agent is working on: its project, its branch and its chats. */
export function AgentWorkspaceBar({
  snapshot,
  agent,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  agent: Agent;
  onAction: (message: string) => void;
}) {
  const vcs = snapshot.versionControl;
  const onBranch = agent.project.branch;

  return (
    <div className="workbar">
      <button
        className="workbar__project"
        title={agent.project.path}
        onClick={() => onAction(`${agent.project.name} · ${agent.project.path}`)}
      >
        <Icon name="folder" size={14} />
        <span>{agent.project.name}</span>
        <em className="mono">{agent.project.path}</em>
      </button>

      <Menu
        className="menu--branch"
        title="Branch and working tree"
        label={
          <>
            <Icon name="git" size={13} />
            <span className="mono">{onBranch}</span>
            {vcs.changes.length > 0 && onBranch === vcs.branch && (
              <em className="mono">{vcs.changes.length}</em>
            )}
          </>
        }
      >
        {(close) => (
          <>
            <p className="menu__label">Branches</p>
            {vcs.branches.map((branch) => (
              <button
                key={branch.name}
                className={`menu__item ${branch.name === onBranch ? "is-checked" : ""}`}
                onClick={() => {
                  onAction(
                    branch.name === onBranch
                      ? `${agent.name} already works on ${branch.name}.`
                      : `Switching to ${branch.name} needs the workbench daemon.`,
                  );
                  close();
                }}
              >
                <Icon name="git" size={14} />
                <span>
                  <strong className="mono">{branch.name}</strong>
                  <small>
                    {branch.ahead} ahead · {branch.behind} behind · {branch.updated}
                  </small>
                </span>
                {branch.name === onBranch && <Icon name="check" size={13} />}
              </button>
            ))}

            <p className="menu__label">Working tree</p>
            {vcs.changes.length === 0 && <div className="menu__note">Nothing changed.</div>}
            {vcs.changes.map((change) => (
              <button
                key={change.path}
                className="menu__item"
                onClick={() => {
                  onAction("Diffs open with the workbench daemon.");
                  close();
                }}
              >
                <Badge tone={change.state === "added" ? "green" : "amber"}>
                  {change.state[0].toUpperCase()}
                </Badge>
                <span>
                  <strong className="mono">{change.path.split("/").pop()}</strong>
                  <small className="mono">{change.path}</small>
                </span>
              </button>
            ))}

            <p className="menu__label">Head</p>
            <div className="menu__head">
              <span className="mono">{vcs.head.hash}</span>
              <span>{vcs.head.title}</span>
              <small>
                {vcs.head.author} · {vcs.head.when}
              </small>
            </div>
          </>
        )}
      </Menu>

    </div>
  );
}
