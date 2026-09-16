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

/// The windows the cost chip offers. Each carries its own totals and rows, so
/// picking one changes every number on the panel together.
pub fn periods(by_model: &[ModelUsage], daily: &[DailyUsage]) -> Vec<UsagePeriod> {
    let today_in: u64 = by_model.iter().map(|row| row.tokens_in).sum();
    let today_out: u64 = by_model.iter().map(|row| row.tokens_out).sum();
    let week_tokens: u64 = daily.iter().map(|day| day.tokens).sum();
    let day_tokens = (today_in + today_out).max(1);

    // Each window is a multiple of the day the prototype describes.
    let factors = [
        ("hour", "Last hour", 1.0 / 9.0),
        ("today", "Today", 1.0),
        ("week", "This week", week_tokens as f64 / day_tokens as f64),
        ("month", "This month", 4.3 * week_tokens as f64 / day_tokens as f64),
    ];

    factors
        .iter()
        .map(|(id, label, factor)| {
            let rows: Vec<ModelUsage> = by_model
                .iter()
                .map(|row| ModelUsage {
                    model_id: row.model_id.clone(),
                    name: row.name.clone(),
                    version: row.version.clone(),
                    calls: (row.calls as f64 * factor).round() as u32,
                    tokens_in: (row.tokens_in as f64 * factor).round() as u64,
                    tokens_out: (row.tokens_out as f64 * factor).round() as u64,
                    cost_usd: (row.cost_usd * factor * 100.0).round() / 100.0,
                })
                .collect();

            UsagePeriod {
                id: (*id).into(),
                label: (*label).into(),
                tokens_in: rows.iter().map(|row| row.tokens_in).sum(),
                tokens_out: rows.iter().map(|row| row.tokens_out).sum(),
                cost_usd: rows.iter().map(|row| row.cost_usd).sum(),
                calls: rows.iter().map(|row| row.calls).sum(),
                by_model: rows,
            }
        })
        .collect()
}
