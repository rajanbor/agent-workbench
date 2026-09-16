import { useState } from "react";
import { Icon } from "../components/Icon";
import { Button, Card, SectionTitle } from "../components/primitives";
import { Switch } from "../components/Switch";
import type { DesktopSnapshot } from "../lib/engine";

type Shape = "template" | "existing" | "clone";

const shapes: { id: Shape; icon: string; title: string; blurb: string }[] = [
  {
    id: "template",
    icon: "layers",
    title: "From a template",
    blurb: "A folder with a known starting shape. Every file it writes is named first.",
  },
  {
    id: "existing",
    icon: "folder",
    title: "A folder already on disk",
    blurb: "Point the workbench at work that exists. Nothing is written.",
  },
  {
    id: "clone",
    icon: "git",
    title: "Clone a repository",
    blurb: "Fetch a remote into a new folder, then open it.",
  },
];

/** Making a project: a few cards rather than a form. Every choice is a thing
 *  you click, the resulting path and the exact file list are shown before
 *  anything is created, and the last step states plainly that writing to disk
 *  is the daemon's work. */
export function NewProjectView({
  snapshot,
  onOpenProject,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  onOpenProject: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const [shape, setShape] = useState<Shape>("template");
  const [templateId, setTemplateId] = useState(snapshot.templates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [parent, setParent] = useState("~/Projects");
  const [remote, setRemote] = useState("");
  const [existing, setExisting] = useState("");
  const [git, setGit] = useState(true);
  const [openAfter, setOpenAfter] = useState(true);
  const [editorId, setEditorId] = useState(snapshot.editors[0]?.id ?? "");
  const [withAgent, setWithAgent] = useState(false);

  const template = snapshot.templates.find((item) => item.id === templateId);
  const editor = snapshot.editors.find((item) => item.id === editorId);
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path =
    shape === "existing" ? existing || "…" : `${parent}/${slug || "new-project"}`;

  const files =
    shape === "template" ? (template?.creates ?? []) : shape === "clone" ? ["(whatever the remote holds)"] : [];

  const ready =
    shape === "existing" ? existing.trim().length > 0 : shape === "clone" ? remote.trim().length > 0 && slug.length > 0 : slug.length > 0;

  return (
    <div className="stack">
      <header className="studio-head">
        <div>
          <p className="eyebrow">Projects</p>
          <h1>New project</h1>
          <p className="muted-copy">
            A project is a folder this workbench works in: agents are pointed at it, terminals
            open in it, and your editor is handed the same path.
          </p>
        </div>
      </header>

      <SectionTitle>Where it comes from</SectionTitle>
      <div className="pick-row">
        {shapes.map((item) => (
          <button
            key={item.id}
            className={`pick ${shape === item.id ? "is-selected" : ""}`}
            aria-pressed={shape === item.id}
            onClick={() => setShape(item.id)}
          >
            <Icon name={item.icon} size={18} />
            <strong>{item.title}</strong>
            <small>{item.blurb}</small>
          </button>
        ))}
      </div>

      {shape === "template" && (
        <>
          <SectionTitle count={snapshot.templates.length}>Template</SectionTitle>
          <div className="pick-row pick-row--wrap">
            {snapshot.templates.map((item) => (
              <button
                key={item.id}
                className={`pick ${templateId === item.id ? "is-selected" : ""}`}
                aria-pressed={templateId === item.id}
                onClick={() => setTemplateId(item.id)}
              >
                <strong>{item.name}</strong>
                <small>{item.summary}</small>
                {item.stack.length > 0 && (
                  <span className="pick__tags">
                    {item.stack.map((tag) => (
                      <em key={tag} className="mono">
                        {tag}
                      </em>
                    ))}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Where it goes</SectionTitle>
      <Card className="pad form">
        {shape !== "existing" && (
          <>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                placeholder="release-notes"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Parent folder</span>
              <span className="field__row">
                <input
                  className="mono"
                  value={parent}
                  onChange={(event) => setParent(event.target.value)}
                />
                <Button
                  size="sm"
                  icon="folder"
                  onClick={() => onAction("Choosing a folder opens the system picker, which needs the workbench daemon.")}
                >
                  Choose…
                </Button>
              </span>
            </label>
          </>
        )}

        {shape === "existing" && (
          <label className="field">
            <span>Folder on this machine</span>
            <span className="field__row">
              <input
                className="mono"
                value={existing}
                placeholder="~/Projects/something-that-exists"
                onChange={(event) => setExisting(event.target.value)}
              />
              <Button
                size="sm"
                icon="folder"
                onClick={() => onAction("Choosing a folder opens the system picker, which needs the workbench daemon.")}
              >
                Choose…
              </Button>
            </span>
          </label>
        )}

        {shape === "clone" && (
          <label className="field">
            <span>Repository</span>
            <input
              className="mono"
              value={remote}
              placeholder="https://github.com/owner/repo.git"
              onChange={(event) => setRemote(event.target.value)}
            />
          </label>
        )}

        {shape !== "clone" && (
          <label className="field field--switch">
            <span>
              <strong>Start version control</strong>
              <small>Runs `git init` in the new folder.</small>
            </span>
            <Switch checked={git} label="Start version control" onChange={() => setGit(!git)} />
          </label>
        )}

        <label className="field field--switch">
          <span>
            <strong>Open in an editor afterwards</strong>
            <small>{editor ? editor.command.replace("<path>", path) : "no editor chosen"}</small>
          </span>
          <Switch
            checked={openAfter}
            label="Open in an editor afterwards"
            onChange={() => setOpenAfter(!openAfter)}
          />
        </label>

        {openAfter && (
          <div className="pick-row pick-row--tight">
            {snapshot.editors.map((item) => (
              <button
                key={item.id}
                className={`pick pick--small ${editorId === item.id ? "is-selected" : ""}`}
                aria-pressed={editorId === item.id}
                onClick={() => setEditorId(item.id)}
              >
                <strong>{item.name}</strong>
                <small className="mono">{item.command}</small>
              </button>
            ))}
          </div>
        )}

        <label className="field field--switch">
          <span>
            <strong>Design an agent for it straight away</strong>
            <small>Opens the agent studio with this folder already chosen.</small>
          </span>
          <Switch
            checked={withAgent}
            label="Design an agent for it"
            onChange={() => setWithAgent(!withAgent)}
          />
        </label>
      </Card>

      <SectionTitle>What this would do</SectionTitle>
      <Card className="pad list-card">
        <p>
          <Icon name="folder" size={13} />
          <span className="mono">{path}</span>
          <em className="permission-from">the folder itself</em>
        </p>
        {files.map((file) => (
          <p key={file}>
            <Icon name="plus" size={13} />
            <span className="mono">{file}</span>
          </p>
        ))}
        {shape === "existing" && (
          <p className="muted-copy">Nothing is written. The folder is only registered here.</p>
        )}
        {git && shape !== "clone" && (
          <p>
            <Icon name="git" size={13} />
            <span className="mono">git init</span>
          </p>
        )}
        {shape === "clone" && remote && (
          <p>
            <Icon name="git" size={13} />
            <span className="mono">git clone {remote} {path}</span>
          </p>
        )}
        {openAfter && editor && (
          <p>
            <Icon name="code" size={13} />
            <span className="mono">{editor.command.replace("<path>", path)}</span>
          </p>
        )}
      </Card>

      <div className="studio-actions">
        <Button
          variant="primary"
          icon="check"
          disabled={!ready}
          onClick={() =>
            onAction(
              "Creating a project writes to disk and launches an application, both of which belong to the workbench daemon. Everything this panel would do is listed above, and none of it has run.",
            )
          }
        >
          Create project
        </Button>
        {snapshot.projects.length > 0 && (
          <Button icon="folder" onClick={() => onOpenProject(snapshot.projects[0].id)}>
            Open {snapshot.projects[0].name} instead
          </Button>
        )}
      </div>
    </div>
  );
}
