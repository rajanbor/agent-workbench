import { Icon } from "../components/Icon";
import { Menu } from "../components/Menu";
import { AgentFace } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle } from "../components/primitives";
import { accentOf, toneOf } from "../lib/identity";
import type { DesktopSnapshot, EditorApp, ProjectEntry } from "../lib/engine";

/** A project as its own tab: the folder, the branch, what is uncommitted, the
 *  agents pointed at it, and the top of its tree. The editor button hands the
 *  same path to whatever is installed — and says exactly what it would run
 *  before it runs anything. */
export function ProjectView({
  snapshot,
  projectId,
  onOpenAgent,
  onNewChat,
  onOpenTerminal,
  onNewProject,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  projectId: string;
  onOpenAgent: (id: string) => void;
  onNewChat: (agentId: string) => void;
  onOpenTerminal: () => void;
  onNewProject: () => void;
  onAction: (message: string) => void;
}) {
  const project =
    snapshot.projects.find((item) => item.id === projectId) ?? snapshot.projects[0];
  if (!project) return null;

  const agents = snapshot.agents.filter((agent) => project.agents.includes(agent.id));
  const versioned = project.kind === "git";

  return (
    <div className="stack">
      <header className="project-head">
        <div className="project-head__identity">
          <span className="project-head__mark">
            <Icon name="folder" size={22} />
          </span>
          <div>
            <h1>{project.name}</h1>
            <p className="mono project-head__path">{project.path}</p>
            <p className="muted-copy">{project.summary}</p>
          </div>
        </div>

        <div className="project-head__actions">
          <OpenInEditor editors={snapshot.editors} project={project} onAction={onAction} />
          <Button icon="terminal" onClick={onOpenTerminal}>
            Terminal here
          </Button>
          <Button icon="plus" onClick={onNewProject}>
            New project
          </Button>
        </div>
      </header>

      <div className="project-facts">
        <Fact label="Version control" value={versioned ? `git · ${project.branch}` : "none"} />
        <Fact label="Ahead / behind" value={versioned ? `${project.ahead} / ${project.behind}` : "—"} />
        <Fact label="Uncommitted" value={versioned ? `${project.dirty} files` : "—"} />
        <Fact label="Working tree" value={project.tracked ? "read by the engine" : "counted only"} />
        <Fact label="Agents" value={`${agents.length}`} />
        <Fact label="Last opened" value={project.lastOpened} />
      </div>

      <div className="project-grid">
        <section>
          <SectionTitle count={project.entries.length}>Folder</SectionTitle>
          <Card className="pad list-card">
            {project.entries.map((entry) => (
              <p key={entry.name}>
                <Icon name={entry.kind === "dir" ? "folder" : "logs"} size={13} />
                <span className="mono">{entry.name}</span>
                <em className="permission-from">{entry.detail}</em>
              </p>
            ))}
            <p className="muted-copy">
              One level, as the engine declares it. Reading the rest of the tree needs the
              workbench daemon — this window never touches the file system itself.
            </p>
          </Card>

          {versioned && (
            <>
              <SectionTitle>Branch</SectionTitle>
              <Card className="pad list-card">
                <p>
                  <Icon name="git" size={13} />
                  <span className="mono">{project.branch}</span>
                  <em className="permission-from">
                    {project.ahead} ahead · {project.behind} behind
                  </em>
                </p>
                {/* Only the project version control actually reports on shows
                    its files; another project's changes are not this one's. */}
                {project.tracked &&
                  snapshot.versionControl.changes.map((change) => (
                    <p key={change.path}>
                      <Badge tone={change.state === "added" ? "green" : "amber"}>
                        {change.state[0].toUpperCase()}
                      </Badge>
                      <span className="mono">{change.path}</span>
                    </p>
                  ))}
                {!project.tracked && (
                  <p className="muted-copy">
                    {project.dirty} file{project.dirty === 1 ? "" : "s"} changed. The engine reads
                    one working tree today — the workbench&apos;s own — so the files are counted
                    here rather than listed. Per-project version control arrives with the daemon.
                  </p>
                )}
                <Button
                  size="sm"
                  icon="fork"
                  onClick={() => onAction("Switching a branch needs the workbench daemon.")}
                >
                  Switch branch…
                </Button>
              </Card>
            </>
          )}
        </section>

        <section>
          <SectionTitle count={agents.length}>Agents in this project</SectionTitle>
          {agents.length === 0 && (
            <Card className="pad list-card">
              <p className="muted-copy">
                No agent is pointed here yet. Design one from the agents area and choose this
                folder in the first step.
              </p>
            </Card>
          )}
          {agents.map((agent) => (
            <article key={agent.id} className="project-agent">
              <AgentFace accent={accentOf(agent.accent)} size={30} />
              <div className="project-agent__main">
                <strong>{agent.name}</strong>
                <small>
                  {agent.role} · {agent.project.branch} · {agent.status}
                </small>
                <p>{agent.task}</p>
              </div>
              <div className="project-agent__actions">
                <Badge tone={toneOf(agent.status)}>{agent.status}</Badge>
                <Button size="sm" icon="session" onClick={() => onNewChat(agent.id)}>
                  Chat
                </Button>
                <Button size="sm" icon="agent" onClick={() => onOpenAgent(agent.id)}>
                  Open
                </Button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="project-fact">
      <small>{label}</small>
      <strong className="mono">{value}</strong>
    </div>
  );
}

/** The editor menu. Nothing here claims an editor is installed, because
 *  nothing has looked: the engine reports `installed: null` until the daemon
 *  can read this machine, and the menu says so rather than guessing. */
export function OpenInEditor({
  editors,
  project,
  onAction,
  size = "md",
}: {
  editors: EditorApp[];
  project: ProjectEntry;
  onAction: (message: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <Menu
      className={`menu--editor ${size === "sm" ? "menu--editor-sm" : ""}`}
      align="right"
      title="Hand this folder to an editor"
      label={
        <>
          <Icon name="code" size={14} />
          <span>Open in editor</span>
        </>
      }
    >
      {(close) => (
        <>
          <p className="menu__label">Hand {project.name} to</p>
          {editors.map((editor) => (
            <button
              key={editor.id}
              className="menu__item"
              onClick={() => {
                onAction(
                  `Would run \`${editor.command.replace("<path>", project.path)}\` — launching an editor needs the workbench daemon, which resolves the app and starts it outside this window.`,
                );
                close();
              }}
            >
              <Icon name="external" size={14} />
              <span>
                <strong>{editor.name}</strong>
                <small className="mono">{editor.command.replace("<path>", project.path)}</small>
              </span>
            </button>
          ))}
          <div className="menu__note">
            Open Cube has not looked for these applications. Checking what is installed, and
            launching one, is the daemon&apos;s work — so each entry shows the command it would
            run rather than claiming to be ready.
          </div>
        </>
      )}
    </Menu>
  );
}
