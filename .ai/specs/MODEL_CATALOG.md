# Spec: model library and model version control

Acceptance: every model is listed with its own icon and accent, its vendor,
task, parameter size, context, update time and location (local or api); each
model shows a pinned version and digest, its revision history and whether it is
ready; the pinned versions are reachable from the top-bar version-control menu
next to the branch; the model identity used in the catalogue is the same one
shown in chat, usage and the rails; spend for a model names the version that
produced it.

## Knowledge base

A catalogue entry must answer "should I use this, and can I?" without leaving
the app: a summary of what the model is for, what it is good at, what it
requires (memory, disk, account, network), its licence, and its price per
million tokens when the provider publishes one. Entries are filtered by
location and by readiness, so the list can answer "what can I run right now?".

Every entry carries one reference: the Hugging Face repository for an
open-weight model, the provider's API documentation for a hosted one. The
reference opens in the system browser through the opener plugin — never in the
app window, which holds the workbench state. An engine test enforces that every
model has a summary, requirements, a licence and an `https` reference of the
right kind.

A model that can run on the device also declares a `LocalProfile` — throughput,
prefill factor, power draw, resident memory and accelerator — which feeds the
economics in `LOCAL_RUN_ECONOMICS.md`. A hosted model has none.

## Version control

A model is versioned state. `ModelCard.version` and `ModelCard.digest` are the
pinned pair; `revisions` records what else exists and which entry is pinned. An
API model whose version the provider controls says so instead of inventing a
number. Usage rows carry the version used, so a cost can always be attributed to
a specific model build.

## Identity

`icon` and `accent` live in the engine so a model looks identical everywhere in
the shell. Accents resolve to theme tokens; a view never hardcodes a colour.
