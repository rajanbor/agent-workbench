# Spec: project workspace

Acceptance: every folder this workbench works in is an object in the engine and
opens as its own tab, side by side with anything else; the tab names the path,
the branch, what is ahead, behind and uncommitted, the agents pointed at it and
the top of its tree; a project can be handed to an editor, given a terminal and
given a new chat with one of its agents; a new project is made from a template,
an existing folder or a repository, and every file it would write is named
before anything is written.

## The object

`domain::ProjectEntry`: id, name, path, branch, summary, kind (`git` or
`folder`), ahead, behind, dirty, `tracked`, last opened, the first level of the
tree and the ids of the agents pointed at it. An agent's `ProjectRef` names one
of these by path, and a test asserts the two sides agree in both directions: no
agent works in an unlisted project, and no project claims an agent that does
not exist.

`tracked` marks the one project that `version_control` in this snapshot
describes. The engine reads one working tree today, so exactly one project may
claim it — a test asserts that, and that its dirty count equals the number of
changes actually listed. A project that is not the tracked one counts its
changes and says why it cannot list them, rather than borrowing another
project's files.

## Open in editor

`domain::EditorApp` declares a name and the exact command, with `<path>` where
the folder goes. `installed` is `Option<bool>` and is `None` for every entry,
because nothing has looked: reading `/Applications`, resolving a binary on
`PATH` and launching it belong to `workbenchd`. A test asserts no editor claims
to be installed without a check.

The menu therefore shows the command it would run — `code ~/Projects/open-cube`
— and says that launching it is the daemon's work. It never pretends to open
anything, and it never spawns a process from this window.

## Making one

`domain::ProjectTemplate` names a shape and the files it creates. The panel
asks three things by clicking, not typing: where the project comes from (a
template, a folder already on disk, a repository), where it goes, and what
happens afterwards — version control, an editor, an agent. It then prints the
resulting path and every command and file involved, and the create button
states that writing to disk and launching an application both belong to the
daemon. Nothing is written.
