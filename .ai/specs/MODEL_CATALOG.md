# Spec: model catalogue and model version control

Acceptance: every model is listed with its own icon and accent, its vendor,
task, parameter size, context, update time and location (local or api); each
model shows a pinned version and digest, its revision history and whether it is
ready; the pinned versions are reachable from the top-bar version-control menu
next to the branch; the model identity used in the catalogue is the same one
shown in chat, usage and the rails; spend for a model names the version that
produced it.

## Version control

A model is versioned state. `ModelCard.version` and `ModelCard.digest` are the
pinned pair; `revisions` records what else exists and which entry is pinned. An
API model whose version the provider controls says so instead of inventing a
number. Usage rows carry the version used, so a cost can always be attributed to
a specific model build.

## Identity

`icon` and `accent` live in the engine so a model looks identical everywhere in
the shell. Accents resolve to theme tokens; a view never hardcodes a colour.
