# Open Cube AI project system

This directory is the canonical operating system for AI-assisted work on Open Cube. Read in this order before starting a task:

1. `STATE.md` for what exists today.
2. `product/PRODUCT_VISION.md`, `DOMAIN_MODEL.md` and `INFORMATION_ARCHITECTURE.md` for product intent.
3. Relevant files in `architecture/`, `adr/` and `specs/`.
4. `roadmap/ROADMAP.md` and the linked GitHub issue.
5. The appropriate template in `templates/`.

## Rules

- Treat `.ai/` as authoritative for agent-facing planning. Do not create a parallel plan elsewhere.
- Do not implement a feature until its issue has a scope and acceptance criteria in a spec or issue body.
- Write an ADR before committing to an irreversible or cross-cutting choice: protocol, persistence model, security boundary, provider API, runtime or package boundary.
- Update the matching spec, ADR, roadmap and tests when a decision changes.
- Prefer the smallest complete phase. Mock UI state is allowed only when it follows the domain model and is labeled as mock.
- Preserve the local-first and explicit-permission principles. Never silently reduce isolation, send data to a service, collect passwords or make remote execution implicit.

## Delivery flow

`Issue → research → spec → ADR when needed → implementation plan → code → focused tests → documentation update → review → release note`.

Use templates in `templates/` for each stage. User-facing documents belong in `docs/`; they must describe actual shipped behavior only.
