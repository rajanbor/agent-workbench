//! Usage over time: what a period costs, and a year of days to look at.
//!
//! The series is prototype data, generated deterministically from the date so
//! it does not jitter between reads. `basis` says so wherever it is shown; the
//! event log (#15) is what will replace it with recorded runs.
use crate::domain::*;

/// Civil date from days since 1970-01-01 — Howard Hinnant's algorithm, so the
/// calendar needs no date dependency.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

fn iso(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

/// 1970-01-01 was a Thursday; 0 = Monday.
fn weekday(days: i64) -> u8 {
    (((days % 7) + 10) % 7) as u8
}

fn today() -> i64 {
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    seconds / 86_400
}

/// Deterministic per-day pseudo-randomness: the same date always produces the
/// same activity, so the calendar does not shimmer between reads.
fn noise(day: i64, salt: u64) -> u64 {
    let mut x = (day as u64).wrapping_mul(6_364_136_223_846_793_005).wrapping_add(salt);
    x ^= x >> 33;
    x = x.wrapping_mul(0xff51_afd7_ed55_8ccd);
    x ^= x >> 29;
    x
}

fn level_for(runs: u32, max: u32) -> u8 {
    if runs == 0 || max == 0 {
        return 0;
    }
    let share = runs as f64 / max as f64;
    match share {
        s if s > 0.75 => 4,
        s if s > 0.5 => 3,
        s if s > 0.25 => 2,
        _ => 1,
    }
}

/// What the work was. Every number is counted from an object that exists:
/// inspector calls, agent runs, replayed terminal commands and workflow steps.
pub fn kinds(
    inspector_calls: u32,
    agent_runs: u32,
    terminal_commands: u32,
    workflow_steps: u32,
) -> Vec<ActivityKind> {
    let raw = [
        ("Chat answers", inspector_calls),
        ("Agent runs", agent_runs),
        ("Terminal commands", terminal_commands),
        ("Workflow steps", workflow_steps),
    ];
    let total: u32 = raw.iter().map(|(_, count)| count).sum();
    raw.iter()
        .map(|(name, count)| ActivityKind {
            name: (*name).into(),
            count: *count,
            share: if total > 0 {
                *count as f64 / total as f64
            } else {
                0.0
            },
        })
        .collect()
}

/// A year of days, grouped into week columns like a contribution calendar.
pub fn calendar(models: &[ModelCard], weeks_back: i64, by_kind: Vec<ActivityKind>) -> ActivityCalendar {
    let now = today();
    // Whole week columns: end on the Sunday of the current week and go back a
    // round number of weeks, so every column has seven cells. Days after today
    // are drawn empty, the way a contribution calendar shows the rest of the
    // week.
    let end = now - weekday(now) as i64 + 6;
    let start = end - (weeks_back * 7) + 1;

    let mut raw: Vec<(i64, u32, u64, f64)> = Vec::new();
    for day in start..=end {
        if day > now {
            raw.push((day, 0, 0, 0.0));
            continue;
        }
        let weekend = weekday(day) >= 5;
        let spread = noise(day, 0x9e37) % 100;
        let runs = if weekend {
            (spread / 24) as u32
        } else if spread < 12 {
            0
        } else {
            (spread / 9) as u32
        };
        // A run is a whole task, not a single message: tens to hundreds of
        // thousands of tokens each.
        let tokens = runs as u64 * (60_000 + noise(day, 0x51ed) % 240_000);
        let cost = tokens as f64 / 1_000_000.0 * 5.4;
        raw.push((day, runs, tokens, cost));
    }

    let max_runs = raw.iter().map(|(_, runs, _, _)| *runs).max().unwrap_or(0);

    let mut weeks: Vec<ActivityWeek> = Vec::new();
    for chunk in raw.chunks(7) {
        let days = chunk
            .iter()
            .map(|(day, runs, tokens, cost)| ActivityDay {
                date: iso(*day),
                weekday: weekday(*day),
                runs: *runs,
                tokens: *tokens,
                cost_usd: *cost,
                level: level_for(*runs, max_runs),
            })
            .collect::<Vec<_>>();
        weeks.push(ActivityWeek {
            start_date: days.first().map(|d| d.date.clone()).unwrap_or_default(),
            days,
        });
    }

    let total_runs: u32 = raw.iter().map(|(_, runs, _, _)| runs).sum();
    let total_tokens: u64 = raw.iter().map(|(_, _, tokens, _)| tokens).sum();
    let busiest = raw
        .iter()
        .max_by_key(|(_, runs, _, _)| *runs)
        .map(|(day, _, _, _)| iso(*day))
        .unwrap_or_default();

    // Attribution per model, the way a profile breaks contributions down per
    // organisation: a stable share each, then the totals split along it.
    let shares: Vec<f64> = models
        .iter()
        .map(|model| match model.location {
            ModelLocation::Api if model.ready => 3.0,
            ModelLocation::Api => 2.5,
            ModelLocation::Local if model.ready => 1.5,
            ModelLocation::Local => 0.6,
        })
        .collect();
    let total_weight: f64 = shares.iter().sum();

    let by_model = models
        .iter()
        .zip(shares.iter())
        .map(|(model, weight)| {
            let share = if total_weight > 0.0 { weight / total_weight } else { 0.0 };
            let runs = (total_runs as f64 * share).round() as u32;
            let tokens = (total_tokens as f64 * share).round() as u64;
            ModelActivity {
                model_id: model.id.clone(),
                name: model.name.clone(),
                runs,
                tokens,
                cost_usd: match model.pricing {
                    Some(pricing) => tokens as f64 / 1_000_000.0 * pricing.output_per_mtok,
                    None => 0.0,
                },
                share,
                days_active: (raw.iter().filter(|(_, runs, _, _)| *runs > 0).count() as f64 * share)
                    .round() as u32,
            }
        })
        .collect();

    ActivityCalendar {
        basis: "prototype series · recorded runs arrive with the event log".into(),
        from: iso(start),
        to: iso(now),
        weeks,
        max_runs,
        total_runs,
        total_tokens,
        busiest_day: busiest,
        by_model,
        by_kind,
    }
}

/// The windows the cost chip offers.
///
/// Three kinds of money live here and they are computed differently:
/// metered rows scale with the tokens, a subscription is the monthly plan
/// spread over the window, and a local model costs the electricity its run
/// needs at the machine's declared price.
pub fn periods(
    by_model: &[ModelUsage],
    daily: &[DailyUsage],
    models: &[ModelCard],
    device: &DeviceEnergy,
) -> Vec<UsagePeriod> {
    let today_tokens: u64 = by_model
        .iter()
        .map(|row| row.tokens_in + row.tokens_out)
        .sum();
    let week_tokens: u64 = daily.iter().map(|day| day.tokens).sum();
    let day_tokens = today_tokens.max(1);

    // (id, label, how much of a day's work, how much of a month's calendar)
    let windows = [
        ("hour", "Last hour", 1.0 / 9.0, 1.0 / (30.0 * 24.0)),
        ("today", "Today", 1.0, 1.0 / 30.0),
        (
            "week",
            "This week",
            week_tokens as f64 / day_tokens as f64,
            7.0 / 30.0,
        ),
        (
            "month",
            "This month",
            4.3 * week_tokens as f64 / day_tokens as f64,
            1.0,
        ),
    ];

    windows
        .iter()
        .map(|(id, label, work, month_share)| {
            let rows: Vec<ModelUsage> = by_model
                .iter()
                .map(|row| {
                    let model = models.iter().find(|model| model.id == row.model_id);
                    let tokens_in = (row.tokens_in as f64 * work).round() as u64;
                    let tokens_out = (row.tokens_out as f64 * work).round() as u64;

                    let (cost_usd, kind, energy_wh) = match model {
                        // Metered: the provider bills the tokens.
                        Some(model) if model.pricing.is_some() => {
                            let pricing = model.pricing.unwrap();
                            let cost = tokens_in as f64 / 1_000_000.0 * pricing.input_per_mtok
                                + tokens_out as f64 / 1_000_000.0 * pricing.output_per_mtok;
                            (round_cents(cost), CostKind::Metered, 0.0)
                        }
                        // A plan: the same fee whether it ran or not, spread
                        // over the window being shown.
                        Some(model) if model.subscription.is_some() => {
                            let plan = model.subscription.as_ref().unwrap();
                            (
                                round_cents(plan.monthly_usd * month_share),
                                CostKind::Subscription,
                                0.0,
                            )
                        }
                        // On the device: electricity, from the same formula the
                        // local comparison uses.
                        Some(model) if model.local_profile.is_some() => {
                            let profile = model.local_profile.as_ref().unwrap();
                            let energy = energy_wh_for(profile, tokens_in, tokens_out);
                            (
                                round_cents(energy / 1000.0 * device.price_per_kwh),
                                CostKind::Electricity,
                                energy,
                            )
                        }
                        _ => (0.0, CostKind::None, 0.0),
                    };

                    ModelUsage {
                        model_id: row.model_id.clone(),
                        name: row.name.clone(),
                        version: row.version.clone(),
                        calls: (row.calls as f64 * work).round() as u32,
                        tokens_in,
                        tokens_out,
                        cost_usd,
                        cost_kind: kind,
                        energy_wh,
                    }
                })
                .collect();

            let sum = |kind: CostKind| -> f64 {
                round_cents(
                    rows.iter()
                        .filter(|row| row.cost_kind == kind)
                        .map(|row| row.cost_usd)
                        .sum(),
                )
            };

            UsagePeriod {
                id: (*id).into(),
                label: (*label).into(),
                tokens_in: rows.iter().map(|row| row.tokens_in).sum(),
                tokens_out: rows.iter().map(|row| row.tokens_out).sum(),
                cost_usd: round_cents(rows.iter().map(|row| row.cost_usd).sum()),
                calls: rows.iter().map(|row| row.calls).sum(),
                metered_usd: sum(CostKind::Metered),
                subscription_usd: sum(CostKind::Subscription),
                electricity_usd: sum(CostKind::Electricity),
                energy_wh: rows.iter().map(|row| row.energy_wh).sum(),
                by_model: rows,
            }
        })
        .collect()
}

/// Cents, so a column of costs adds up to what it displays.
fn round_cents(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

/// Energy for a workload on one local model, shared with the economics module.
pub fn energy_wh_for(profile: &LocalProfile, tokens_in: u64, tokens_out: u64) -> f64 {
    if profile.throughput_tps <= 0.0 {
        return 0.0;
    }
    let seconds = tokens_out as f64 / profile.throughput_tps
        + tokens_in as f64 / (profile.throughput_tps * profile.prefill_factor.max(1.0));
    profile.power_draw_w * seconds / 3600.0
}
