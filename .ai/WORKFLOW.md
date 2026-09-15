# Decision, design and coding workflow

## 1. Classify the request

Classify as bug, feature, security change, refactor, release, documentation or research. Find the existing GitHub issue; create one if no issue describes the deliverable.

## 2. Establish the contract

Use `templates/RESEARCH.md` for uncertainty. Create or update a spec with user outcome, non-goals, state transitions, permissions, acceptance criteria and tests. Add an ADR for a long-lived decision.

## 3. Design before code

Identify affected domain objects, API/event changes, storage migrations, UI states, failure behavior, security boundary and rollout/rollback. Keep changes compatible with local-first operation.

## 4. Implement in vertical slices

Start with a narrow end-to-end path. Use interfaces at provider, sandbox, machine and terminal boundaries. Avoid UI-only state that duplicates daemon authority.

## 5. Verify and close

Run focused tests, then relevant build/package checks. Update specs, ADRs, roadmap and user docs to reflect actual behavior. A GitHub issue closes only when every acceptance criterion has evidence.
