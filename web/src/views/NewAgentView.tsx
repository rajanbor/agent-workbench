import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentFace, ModelGlyph } from "../components/Glyph";
import { Badge, Button, Card, SectionTitle, StatusDot } from "../components/primitives";
import { accentOf, fineMoney, toneOf } from "../lib/identity";
import { derivePermissions } from "../lib/blueprint";
import type { AgentPurpose, DesktopSnapshot } from "../lib/engine";

type StepId = "purpose" | "project" | "model" | "sandbox" | "review";

const steps: { id: StepId; title: string; question: string }[] = [
  { id: "purpose", title: "Purpose", question: "What is this agent for?" },
  { id: "project", title: "Project", question: "Which folder does it work in?" },
  { id: "model", title: "Model", question: "What answers for it?" },
  { id: "sandbox", title: "Sandbox", question: "Where does it run?" },
  { id: "review", title: "Review", question: "What would it be allowed to do?" },
];

interface Draft {
  purposeId: string;
  projectId: string;
  path: string;
  modelId: string;
  sandboxId: string;
  name: string;
}

const STORAGE_KEY = "open-cube.new-agent";

/** Designing an agent, one question per step.
 *
 *  Every answer here is a choice from a set the engine already holds, so every
 *  answer is a card you click. A purpose fills the blueprint — instructions,
 *  patterns, skills, servers, tools — and the review step shows exactly what it
 *  filled and what the result would be allowed to do, before the button that
 *  cannot yet create anything says why. */
export function NewAgentView({
  snapshot,
  onOpenEditor,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  /** Continue into the full editor for an agent that already exists. */
  onOpenEditor: (agentId: string) => void;
  onAction: (message: string) => void;
}) {
  const [step, setStep] = useState<StepId>("purpose");
  const [draft, setDraft] = useState<Draft>({
    purposeId: "",
    projectId: "",
    path: "",
    modelId: "",
    sandboxId: "",
    name: "",
  });

  const [restored, setRestored] = useState(false);

  // Read after mount so the first render matches the prerendered HTML.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setDraft((current) => ({ ...current, ...(JSON.parse(stored) as Draft) }));
    } catch {
      /* a draft is a convenience, not state */
    }
    setRestored(true);
  }, []);

  // Only after the restore: writing the empty default first would erase the
  // draft this panel was opened to continue.
  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* the draft still lives for this session */
    }
  }, [draft, restored]);

  // Come back to the step that is still unanswered, not to the first one.
  useEffect(() => {
    if (!restored) return;
    setStep((current) => {
      if (current !== "purpose") return current;
      const stored = draft;
      if (!stored.purposeId) return "purpose";
      if (!stored.projectId && !stored.path) return "project";
      if (!stored.modelId) return "model";
      if (!stored.sandboxId) return "sandbox";
      return "review";
    });
    // Only when the restore lands; later edits move the step themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored]);

  const purpose = snapshot.purposes.find((item) => item.id === draft.purposeId) ?? null;
  const project = snapshot.projects.find((item) => item.id === draft.projectId) ?? null;
  const model = snapshot.models.find((item) => item.id === draft.modelId) ?? null;
  const sandbox = snapshot.sandboxes.find((item) => item.id === draft.sandboxId) ?? null;
  const path = project?.path ?? draft.path;

  const answered: Record<StepId, boolean> = {
    purpose: purpose !== null,
    project: path.trim().length > 0,
    model: model !== null,
    sandbox: sandbox !== null,
    review: false,
  };

  /** A step is reachable when every step before it is answered: the order is
   *  the point, and a locked chip says what is missing rather than nothing. */
  const reachable = (id: StepId) => {
    const index = steps.findIndex((item) => item.id === id);
    return steps.slice(0, index).every((item) => answered[item.id]);
  };

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const advance = () => {
    const index = steps.findIndex((item) => item.id === step);
    const next = steps[index + 1];
    if (next) setStep(next.id);
  };

  const pickPurpose = (item: AgentPurpose) => {
    set({
      purposeId: item.id,
      name: draft.name.trim() ? draft.name : item.suggestedName,
    });
    advance();
  };

  const blueprint = useMemo(
    () => ({
      instructions: purpose?.instructions ?? "",
      patterns: purpose?.patterns ?? [],
      skills: purpose?.skills ?? [],
      mcp: purpose?.mcp ?? [],
      tools: purpose?.tools ?? [],
    }),
    [purpose],
  );
  const permissions = useMemo(
    () => derivePermissions(blueprint, snapshot.library),
    [blueprint, snapshot.library],
  );

  const current = steps.find((item) => item.id === step)!;

  return (
    <div className="stack wizard">
      <header className="studio-head">
        <div>
          <p className="eyebrow">Agent studio</p>
          <h1>New agent</h1>
          <p className="muted-copy">
            Five questions, each answered by clicking. Nothing here needs a path typed or a role
            invented; the editor is where an agent is refined afterwards.
          </p>
        </div>
        {draft.purposeId && (
          <Button
            icon="restore"
            onClick={() => {
              setDraft({ purposeId: "", projectId: "", path: "", modelId: "", sandboxId: "", name: "" });
              setStep("purpose");
            }}
          >
            Start again
          </Button>
        )}
      </header>

      <ol className="wizard-steps">
        {steps.map((item, index) => {
          const open = reachable(item.id);
          return (
            <li key={item.id}>
              <button
                className={`wizard-step ${step === item.id ? "is-current" : ""} ${
                  answered[item.id] ? "is-done" : ""
                }`}
                disabled={!open}
                title={open ? item.question : `Answer ${steps[index - 1]?.title.toLowerCase()} first`}
                onClick={() => setStep(item.id)}
              >
                <span className="wizard-step__mark">
                  {answered[item.id] ? <Icon name="check" size={12} /> : index + 1}
                </span>
                <span className="wizard-step__main">
                  <strong>{item.title}</strong>
                  <small>
                    {item.id === "purpose" && (purpose?.name ?? "not chosen")}
                    {item.id === "project" && (project?.name ?? (path || "not chosen"))}
                    {item.id === "model" && (model?.name ?? "not chosen")}
                    {item.id === "sandbox" && (sandbox?.name ?? "not chosen")}
                    {item.id === "review" && (draft.name || "unnamed")}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <SectionTitle>{current.question}</SectionTitle>

      {step === "purpose" && (
        <div className="pick-row pick-row--wrap">
          {snapshot.purposes.map((item) => (
            <button
              key={item.id}
              className={`pick ${draft.purposeId === item.id ? "is-selected" : ""}`}
              aria-pressed={draft.purposeId === item.id}
              onClick={() => pickPurpose(item)}
            >
              <span className="pick__head">
                <AgentFace accent={accentOf(item.accent)} size={26} />
                <strong>{item.name}</strong>
              </span>
              <small>{item.summary}</small>
              <span className="pick__tags">
                <em className="mono">{item.role}</em>
                {item.patterns.map((id) => (
                  <em key={id} className="mono">
                    {snapshot.library.patterns.find((pattern) => pattern.id === id)?.name ?? id}
                  </em>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "project" && (
        <>
          <div className="pick-row pick-row--wrap">
            {snapshot.projects.map((item) => (
              <button
                key={item.id}
                className={`pick ${draft.projectId === item.id ? "is-selected" : ""}`}
                aria-pressed={draft.projectId === item.id}
                onClick={() => {
                  set({ projectId: item.id, path: item.path });
                  advance();
                }}
              >
                <span className="pick__head">
                  <Icon name="folder" size={18} />
                  <strong>{item.name}</strong>
                </span>
                <small className="mono">{item.path}</small>
                <small>{item.summary}</small>
                <span className="pick__tags">
                  <em className="mono">{item.kind === "git" ? item.branch : "no version control"}</em>
                  <em className="mono">{item.agents.length} agents</em>
                </span>
              </button>
            ))}
          </div>
          <Card className="pad form">
            <label className="field">
              <span>Somewhere else</span>
              <span className="field__row">
                <input
                  className="mono"
                  value={draft.projectId ? "" : draft.path}
                  placeholder="~/Projects/something-else"
                  onChange={(event) => set({ projectId: "", path: event.target.value })}
                />
                <Button
                  size="sm"
                  icon="folder"
                  onClick={() =>
                    onAction("The system folder picker opens through the workbench daemon.")
                  }
                >
                  Choose…
                </Button>
              </span>
            </label>
          </Card>
        </>
      )}

      {step === "model" && (
        <>
          {purpose && (
            <p className="wizard-note">
              <Icon name="alert" size={13} /> {purpose.modelNote}
            </p>
          )}
          <div className="pick-row pick-row--wrap">
            {snapshot.models.map((item) => (
              <button
                key={item.id}
                className={`pick ${draft.modelId === item.id ? "is-selected" : ""}`}
                aria-pressed={draft.modelId === item.id}
                onClick={() => {
                  set({ modelId: item.id });
                  advance();
                }}
              >
                <span className="pick__head">
                  <ModelGlyph icon={item.icon} accent={accentOf(item.accent)} size={26} />
                  <strong>{item.name}</strong>
                  <StatusDot tone={item.ready ? "green" : "neutral"} />
                </span>
                <small>{item.summary}</small>
                <span className="pick__tags">
                  <em className="mono">{item.location === "local" ? "on this device" : item.vendor}</em>
                  <em className="mono">
                    {item.pricing
                      ? `${fineMoney(item.pricing.inputPerMtok)}/M in · ${fineMoney(item.pricing.outputPerMtok)}/M out`
                      : item.subscription
                        ? `${item.subscription.plan} · $${item.subscription.monthlyUsd}/month`
                        : "costs electricity only"}
                  </em>
                  {!item.ready && <em className="mono">not connected</em>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "sandbox" && (
        <div className="pick-row pick-row--wrap">
          {snapshot.sandboxes.map((item) => (
            <button
              key={item.id}
              className={`pick ${draft.sandboxId === item.id ? "is-selected" : ""}`}
              aria-pressed={draft.sandboxId === item.id}
              onClick={() => {
                set({ sandboxId: item.id });
                advance();
              }}
            >
              <span className="pick__head">
                <Icon name="sandbox" size={18} />
                <strong className="mono">{item.name}</strong>
                <Badge tone={toneOf(item.state)}>{item.state}</Badge>
              </span>
              <small>
                {item.isolation} · network {item.network.mode}
                {item.network.allowlist.length > 0 ? ` · ${item.network.allowlist.join(", ")}` : ""}
              </small>
              <span className="pick__tags">
                <em className="mono">{item.account ? `runs as ${item.account}` : "no account of its own"}</em>
                <em className="mono">{item.agents.length} agents</em>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === "review" && purpose && (
        <>
          <Card className="pad form">
            <label className="field">
              <span>Name</span>
              <input
                value={draft.name}
                placeholder={purpose.suggestedName}
                onChange={(event) => set({ name: event.target.value })}
              />
            </label>
            <div className="field">
              <span>Role</span>
              <p className="wizard-from">
                <strong>{purpose.role}</strong>
                <em>from the purpose</em>
              </p>
            </div>
          </Card>

          <SectionTitle>What the purpose filled in</SectionTitle>
          <Card className="pad list-card">
            <p>
              <Icon name="logs" size={13} />
              <span>{purpose.instructions}</span>
              <em className="permission-from">instructions</em>
            </p>
            <Filled label="Patterns" names={purpose.patterns.map((id) => nameOf(snapshot, "pattern", id))} />
            <Filled label="Skills" names={purpose.skills.map((id) => nameOf(snapshot, "skill", id))} />
            <Filled label="MCP servers" names={purpose.mcp.map((id) => nameOf(snapshot, "mcp", id))} />
            <Filled label="Engine tools" names={purpose.tools} />
            <p className="muted-copy">
              Every one of these is editable afterwards in the agent editor, one by one.
            </p>
          </Card>

          <SectionTitle count={permissions.length}>What it would be allowed to do</SectionTitle>
          <Card className="pad list-card">
            <p>
              <Icon name="folder" size={13} />
              <span className="mono">{path}</span>
              <em className="permission-from">read and write inside, nothing above</em>
            </p>
            <p>
              <Icon name="network" size={13} />
              <span>
                Network {sandbox?.network.mode ?? "off"}
                {sandbox && sandbox.network.allowlist.length > 0
                  ? ` · ${sandbox.network.allowlist.join(", ")}`
                  : ""}
              </span>
              <em className="permission-from">from the sandbox</em>
            </p>
            <p>
              <Icon name="terminal" size={13} />
              <span>Shell commands wait for approval until the runtime lands.</span>
            </p>
            <p>
              <Icon name="model" size={13} />
              <span>
                Runs on {model?.name}
                {model?.ready ? "" : " — which is not connected yet"}
              </span>
            </p>
            {permissions.map((permission) => (
              <p key={`${permission.label}-${permission.from}`}>
                <Icon name={permission.blocked ? "lock" : "check"} size={13} />
                <span className="mono">{permission.label}</span>
                <em className="permission-from">from {permission.from}</em>
                {permission.blocked && <Badge tone="red">blocked</Badge>}
              </p>
            ))}
          </Card>

          <div className="studio-actions">
            <Button
              variant="primary"
              icon="plus"
              disabled={!draft.name.trim()}
              onClick={() =>
                onAction(
                  "An agent is written by the workbench daemon, which owns the sandbox account it would run as. This design is kept on this machine until then.",
                )
              }
            >
              Create {draft.name.trim() || purpose.suggestedName}
            </Button>
            <Button
              icon="sliders"
              onClick={() =>
                snapshot.agents[0]
                  ? onOpenEditor(snapshot.agents[0].id)
                  : onAction("There is no agent to edit yet.")
              }
            >
              See the editor on an existing agent
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Filled({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null;
  return (
    <p>
      <Icon name="check" size={13} />
      <span>{names.join(", ")}</span>
      <em className="permission-from">{label.toLowerCase()}</em>
    </p>
  );
}

function nameOf(snapshot: DesktopSnapshot, kind: "pattern" | "skill" | "mcp", id: string): string {
  const list =
    kind === "pattern"
      ? snapshot.library.patterns
      : kind === "skill"
        ? snapshot.library.skills
        : snapshot.library.mcp;
  return list.find((item) => item.id === id)?.name ?? id;
}
