# Spec: in-app inspector model

Acceptance: the main window opens a chat backed by a model that runs inside the
app; it answers about agents, sandboxes, models, spend, terminals, version
control and its own policy; every answer names the model, its version, the
tokens used and the cost; every answer lists the objects it read; a question
that touches a refused scope is answered with an explicit refusal rather than a
guess; redacted terms never appear in an answer; no request leaves the machine.

## Policy

`InspectorPolicy` in `desktop/engine/src/domain.rs` is the contract:

- `mode` — `read-only` while no write capability exists.
- `egress` — `none`; the shipped inspector performs no network call.
- `scopes` — granted: agents, sandboxes, models, usage. Refused: workspace
  files, provider credentials, terminal input.
- `redactions` — terms stripped from any answer before it is returned.

Granting a scope is a product decision, recorded here and in the policy value,
never a local change in a view.

## Attaching another model

A local or API model may replace the answer generator. It must be handed only
the material the granted scopes allow, its output must pass the same redaction
pass, and its identity, version, token count and cost must be reported on every
message. A model that cannot be metered is shown with a zero cost and its own
version string, never with an invented number.

## Refusals

A refusal is a feature. The answer says which scope was refused and that no
model can read it. The shell shows the refusal as a badge on the message.
