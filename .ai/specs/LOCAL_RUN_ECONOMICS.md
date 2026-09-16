# Spec: local run economics

Acceptance: for every model that can run on the device, the workbench states
what a workload costs there — time, energy, battery and share of the machine —
against what the same workload costs on a reference API model, and what that
saves. The numbers are computed in `crates/core`, never in a view, and the
interface says they are estimates until the runtime can measure them.

## Coefficients

A local model declares a `LocalProfile`:

| Field | Meaning |
| --- | --- |
| `throughputTps` | generated tokens per second on this device class |
| `prefillFactor` | how many times faster prompt processing is than generation |
| `powerDrawW` | additional package power while generating, in watts |
| `memoryGb` | resident memory while loaded |
| `accelerator` | Metal, CUDA or CPU |

The machine declares a `DeviceEnergy`: sustained `powerBudgetW`, `memoryGb`,
`batteryWh` and the electricity `pricePerKwh`.

## Formulas

```
time      t  = out / tps + in / (tps × prefill)
energy    E  = W × t / 3600                       [Wh]
electric  Ce = E / 1000 × price_per_kWh           [$]
api       Ca = in/1e6 × in_price + out/1e6 × out_price
saved     S  = Ca − Ce
coefficient  r = S / Ca                            [0..1]
efficiency     = (in + out) / E                    [tokens per Wh]
battery        = E / battery_Wh × 100              [%]
```

Exploitation — how much of the machine a run takes:

```
power share  = W / power_budget_W
memory share = model_GB / device_GB
duty cycle   = t / window_seconds
score        = 0.5 × power + 0.3 × memory + 0.2 × duty
```

The weights say that heat and power matter most, memory next, and occupying the
machine for a while least — that is the part a person can wait out. Every share
is clamped to `0..1`, and a zero-token workload produces zeros, never `NaN`.

## Honesty

`LocalEconomics.basis` says `estimate · declared coefficients, not measured`,
and every surface that shows these numbers carries an `estimate` badge and the
formula. `realisedTokens` reports how many tokens actually ran on the device in
the window — today, none, because no local model is downloaded. When
`crates/runtime` can read real power, throughput and residency, it replaces the
coefficients and the basis changes; the formulas and this spec stay.

## Surfaces

- **Usage** shows the window's comparison: saved, energy, battery and
  exploitation for the best model, then a row per local model with time,
  energy, battery, electricity, API price, saved and an exploitation bar whose
  parts are in its tooltip.
- **Model library** shows a local model's own throughput, power, efficiency in
  tokens per Wh, what today's workload would take on it, and the three parts of
  exploitation.

## Tests

`crates/core` asserts that energy is power × time, that saving is the API price
minus electricity and the coefficient is their ratio, that every exploitation
part stays within `0..1`, that an empty workload produces finite numbers, and
that every local model in the catalogue is compared and the best one named.
