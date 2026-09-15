# Information architecture

## Primary objects

`Machine → Runtime → Sandbox → Workspace → Session → Agent → Task → Run`.

Models and providers are capabilities used by an agent. A terminal is a view of a sandbox or agent run. Canvas is a graph view of those same objects.

## Desktop navigation

The narrow activity bar exposes Workspace, Agents, Machines, Canvas, Git, Search, Extensions and Settings. Selecting an activity changes the secondary sidebar; it does not replace the entire application shell.

The centre is a tabbed, dockable workspace. Supported panel kinds are Chat, Terminal, Canvas, Files, Editor, Runs, Logs, Diff and Browser. The right inspector is collapsible and shows the selected object. The status bar reports branch, sandbox, active agent, machine, running-agent count, token use and cost.

## Empty and onboarding states

Marketing copy belongs only in onboarding and an empty workspace. A configured installation opens the most recent workspace and its active panels.
