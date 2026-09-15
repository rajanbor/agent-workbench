# Open Cube agent instructions

All AI-assisted planning, design, implementation and review work is governed by [`.ai/README.md`](.ai/README.md). Read it before changing code, tests, configuration, documentation, releases or GitHub issues.

Use `.ai/` as the only canonical location for AI-facing project knowledge:

- product decisions: `.ai/product/`
- technical architecture: `.ai/architecture/`
- irreversible decisions: `.ai/adr/`
- acceptance criteria: `.ai/specs/`
- delivery order: `.ai/roadmap/`
- repeatable work patterns: `.ai/templates/`

Do not create competing AI plans, ADRs, specifications or implementation notes elsewhere. User-facing installation, security and release documentation remains in `docs/`. When an implementation changes a decision or acceptance criterion, update the matching `.ai/` document in the same change.
