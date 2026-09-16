# Spec: usage and cost accounting

Acceptance: the shell shows total spend and tokens for the current window, a
per-model breakdown with version, calls, tokens, cost and share, a per-agent
breakdown, and a short daily history; the top bar carries a live tokens-and-cost
chip and the status bar repeats the totals; each chat answer reports its own
model, version, tokens and cost; models that cost nothing report zero rather
than being hidden.

The window also carries the local comparison described in
`LOCAL_RUN_ECONOMICS.md`: what the same tokens would cost on the device in
time, energy, battery and share of the machine, and what that saves against the
reference API model.

## Periods

Spend is reported over a chosen window — last hour, today, this week, this
month — and the cost chip in the top bar is where it is chosen. Picking a
window changes the tiles, the per-model rows and the chip together; each
window carries its own rows so the totals always match what is listed.

## Activity

A year of days is shown as a calendar of whole week columns, each day drawn at
one of five intensities by how much ran that day, with the month above the week
where it starts. Under it, the same activity split per model — runs, active
days, tokens, share and cost — the way a profile splits contributions between
organisations. The series is generated deterministically from the date and says
so; recorded runs arrive with the event log (#15).

## Rules

- Totals are derived from the rows, and a test asserts they match.
- Local models and the built-in inspector are billed at zero, not omitted.
- An API model's price per million tokens is shown on its catalogue entry when
  the provider publishes one; otherwise the entry says the cost is carried by
  the subscription.
- Accounting lives in `core::state` and `core::economics`, never in a view.
- Estimated numbers say so, and carry the formula that produced them.
