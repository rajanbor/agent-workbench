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

## Two surfaces, two jobs

The **cost chip** is a small usage view of its own. Picking a period changes
the numbers inside it — cost, tokens, calls and the per-model rows — and it
stays open. It never navigates.

The **panel** is the whole picture, and there the periods are not a filter:
last hour, today, this week and this month are all present, with a model table
carrying a column per period and a total row. The chip's current choice is
marked there, so the two surfaces agree without one driving the other.

Each window carries its own rows, so a total always matches what is listed
beneath it.

## Activity

A year of days is shown as a calendar of whole week columns, each day drawn at
one of five intensities by how much ran that day, with the month above the week
where it starts. Under it: the models the work ran on as chips, an activity overview naming
where the work happened, and the split by kind of work — chat answers, agent
runs, terminal commands, workflow steps — as a list and a four-axis chart.
Then the same activity per model: runs, active days, tokens, share and cost.
Every kind is counted from the objects that hold it, never estimated. The series is generated deterministically from the date and says
so; recorded runs arrive with the event log (#15).

## Rules

- Totals are derived from the rows, and a test asserts they match.
- Local models and the built-in inspector are billed at zero, not omitted.
- An API model's price per million tokens is shown on its catalogue entry when
  the provider publishes one; otherwise the entry says the cost is carried by
  the subscription.
- Accounting lives in `core::state` and `core::economics`, never in a view.
- Estimated numbers say so, and carry the formula that produced them.
