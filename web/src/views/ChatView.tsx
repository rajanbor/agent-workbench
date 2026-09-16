import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { AgentFace, ModelGlyph } from "../components/Glyph";
import { Badge, Button, IconButton, StatusDot } from "../components/primitives";
import { accentOf, compactTokens, toneOf } from "../lib/identity";
import { AgentWorkspaceBar } from "../components/AgentWorkspaceBar";
import type { Agent, DesktopSnapshot, ModelCard } from "../lib/engine";
import type { ChatMessage } from "../lib/shell";

const suggestions: { icon: string; tone: string; label: string; ask: string }[] = [
  {
    icon: "agent",
    tone: "blue",
    label: "Look at what the agents are doing",
    ask: "What is each agent doing right now?",
  },
  {
    icon: "sandbox",
    tone: "violet",
    label: "Inspect a sandbox and its policy",
    ask: "What is running in each sandbox?",
  },
  {
    icon: "bolt",
    tone: "green",
    label: "See where the spend went",
    ask: "How much did I spend today, and on which model?",
  },
  {
    icon: "shield",
    tone: "amber",
    label: "Check what stays out of reach",
    ask: "What can you not read?",
  },
];

export function ChatView({
  snapshot,
  agent,
  model,
  workspace,
  source,
  branch,
  messages,
  busy,
  onSend,
  onOpenAgent,
  onAction,
}: {
  snapshot: DesktopSnapshot;
  agent: Agent | null;
  model: ModelCard;
  workspace: string;
  source: "engine" | "preview";
  branch: string;
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  onOpenAgent: (id: string) => void;
  onAction: (message: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy]);

  const send = (text: string) => {
    if (!text.trim()) return;
    onSend(text.trim());
    setDraft("");
  };

  const answering = agent ? accentOf(agent.accent) : accentOf(model.accent);

  return (
    <section className="chat">
      <header className="chat__head">
        <div className="chat__identity">
          {agent ? (
            <AgentFace accent={accentOf(agent.accent)} size={30} />
          ) : (
            <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={28} />
          )}
          <div>
            <h1>{agent ? agent.name : "Workbench chat"}</h1>
            <p>
              {agent ? (
                <>
                  <StatusDot tone={toneOf(agent.status)} pulse={agent.status === "running"} />
                  {agent.status} · {agent.role.toLowerCase()} · sandbox {agent.sandboxId}
                </>
              ) : (
                <>
                  {model.name} · {model.version} · {snapshot.inspector.mode} · no egress
                </>
              )}
            </p>
          </div>
        </div>
        <div className="chat__actions">
          {agent && (
            <>
              <Badge tone="neutral" icon="commit">
                {agent.revision}
              </Badge>
              <Button size="sm" icon="sliders" onClick={() => onOpenAgent(agent.id)}>
                Details
              </Button>
            </>
          )}
          <Button
            size="sm"
            icon="shield"
            onClick={() =>
              onAction(
                `Readable: ${snapshot.inspector.scopes
                  .filter((scope) => scope.granted)
                  .map((scope) => scope.name)
                  .join(", ")}.`,
              )
            }
          >
            Scope
          </Button>
        </div>
      </header>

      {agent && (
        <AgentWorkspaceBar snapshot={snapshot} agent={agent} onAction={onAction} />
      )}

      <div className="chat__scroll" ref={scroller}>
        <div className="chat__thread">
          {messages.length === 0 && (
            <div className="chat__intro">
              <span className="chat__mark">
                <Icon name="terminal" size={26} />
              </span>
              <h2>
                What should we look at in <u>{workspace}</u>?
              </h2>
              <div className="start-cards">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.ask} onClick={() => send(suggestion.ask)}>
                    <span className={`start-cards__icon start-cards__icon--${suggestion.tone}`}>
                      <Icon name={suggestion.icon} size={17} />
                    </span>
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => {
            if (message.role === "system") {
              return (
                <p className="chat__system" key={message.id}>
                  {message.text}
                </p>
              );
            }
            if (message.role === "user") {
              return (
                <div className="bubble bubble--user" key={message.id}>
                  {message.text}
                </div>
              );
            }
            const source = snapshot.models.find((item) => item.id === message.modelId);
            return (
              <div className="answer" key={message.id}>
                <div className="answer__avatar">
                  {agent ? (
                    <AgentFace accent={answering} size={26} />
                  ) : (
                    <ModelGlyph
                      icon={source?.icon ?? model.icon}
                      accent={accentOf(source?.accent ?? model.accent)}
                      size={26}
                    />
                  )}
                </div>
                <div className="answer__body">
                  <div className="bubble bubble--assistant">
                    {message.text.split("\n").map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                  <AnswerMeta message={message} modelName={source?.name} version={source?.version} />
                </div>
              </div>
            );
          })}

          {busy && (
            <div className="answer">
              <div className="answer__avatar">
                {agent ? (
                  <AgentFace accent={answering} size={26} />
                ) : (
                  <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={26} />
                )}
              </div>
              <div className="thinking">
                Thinking<i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="composer-shell">
        {/* What a message will run against, above the field that sends it. */}
        <div className="composer-context">
          <span>
            <Icon name="folder" size={13} /> {workspace}
          </span>
          <span>
            <Icon name="machine" size={13} /> {source === "engine" ? "Engine" : "Preview"}
          </span>
          <span className="mono">
            <Icon name="git" size={13} /> {branch}
          </span>
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              agent ? `Message ${agent.name}` : "Ask about agents, sandboxes, cost or policy"
            }
            aria-label="Message"
          />
          <div className="composer__row">
            <IconButton
              icon="plus"
              label="Attach context"
              onClick={() => onAction("Attachments arrive with the workbench daemon.")}
            />
            <button
              type="button"
              className="composer__scope"
              onClick={() =>
                onAction(
                  `Readable: ${snapshot.inspector.scopes
                    .filter((scope) => scope.granted)
                    .map((scope) => scope.name)
                    .join(", ")}.`,
                )
              }
            >
              <Icon name="shield" size={13} />
              {snapshot.inspector.mode} · no egress
            </button>
            <span className="composer__spacer" />
            <span className="composer__model">
              <ModelGlyph icon={model.icon} accent={accentOf(model.accent)} size={16} />
              {model.name}
              <em className="mono">{model.version}</em>
            </span>
            <button className="composer__send" type="submit" aria-label="Send">
              <Icon name="send" size={15} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

/** Provenance for one answer.
 *
 *  Which model, which version, what it cost: quiet until the message is
 *  hovered. Sources are a count you can open. Refusals and redactions are the
 *  exception — they stay visible, because a scope the model could not read is
 *  part of the answer, not a detail. */
function AnswerMeta({
  message,
  modelName,
  version,
}: {
  message: ChatMessage;
  modelName?: string;
  version?: string;
}) {
  const [open, setOpen] = useState(false);
  const sources = message.sources ?? [];
  const flags = [
    ...(message.refused ?? []).map((item) => ({ item, tone: "red" as const, label: item })),
    ...(message.redacted ?? []).map((item) => ({
      item,
      tone: "amber" as const,
      label: `redacted ${item}`,
    })),
  ];

  return (
    <>
      <footer className={`answer__meta ${open ? "is-open" : ""}`}>
        <span className="mono">
          {modelName ?? message.modelId} · {version ?? "—"}
        </span>
        <span>·</span>
        <span className="mono">{compactTokens(message.tokens ?? 0)} tokens</span>
        <span>·</span>
        <span className="mono">${(message.costUsd ?? 0).toFixed(2)}</span>
        {sources.length > 0 && (
          <button className="meta-toggle" onClick={() => setOpen((value) => !value)}>
            {open ? "hide sources" : `${sources.length} sources`}
          </button>
        )}
        {open && sources.map((item) => <Badge key={item}>{item}</Badge>)}
      </footer>
      {flags.length > 0 && (
        <div className="answer__flags">
          {flags.map((flag) => (
            <Badge key={flag.label} tone={flag.tone} icon="lock">
              {flag.label}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
