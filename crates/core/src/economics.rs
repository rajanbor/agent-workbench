//! What a workload costs when it runs on the device instead of an API.
//!
//! Every number here is an *estimate* derived from declared coefficients —
//! a model's throughput and power draw, and the device's power envelope,
//! memory, battery and electricity price. Nothing is measured yet; the runtime
//! (#32) is what will replace these coefficients with readings. The interface
//! says so wherever the numbers appear.
//!
//! The formulas are specified in `.ai/specs/LOCAL_RUN_ECONOMICS.md`.
use crate::domain::*;

/// Seconds of generation for a workload.
///
/// `t = out / tps + in / (tps * prefill)` — prompt processing is much faster
/// than generation, so it is divided by the prefill factor rather than ignored.
fn seconds_for(profile: &LocalProfile, tokens_in: u64, tokens_out: u64) -> f64 {
    if profile.throughput_tps <= 0.0 {
        return 0.0;
    }
    let generation = tokens_out as f64 / profile.throughput_tps;
    let prefill = tokens_in as f64 / (profile.throughput_tps * profile.prefill_factor.max(1.0));
    generation + prefill
}

/// Price of the same tokens on the reference API model, in dollars.
fn api_equivalent(reference: &ModelCard, tokens_in: u64, tokens_out: u64) -> f64 {
    match reference.pricing {
        Some(pricing) => {
            (tokens_in as f64 / 1_000_000.0) * pricing.input_per_mtok
                + (tokens_out as f64 / 1_000_000.0) * pricing.output_per_mtok
        }
        None => 0.0,
    }
}

/// How much of the machine one run takes, and the parts it is made of.
///
/// `score = 0.5 * power share + 0.3 * memory share + 0.2 * duty cycle`
/// The weights say that heat and power matter most, memory next, and occupying
/// the machine for a while least — it is the part a person can wait out.
fn utilisation(profile: &LocalProfile, device: &DeviceEnergy, seconds: f64, window_seconds: f64) -> Utilisation {
    let power_share = ratio(profile.power_draw_w, device.power_budget_w);
    let memory_share = ratio(profile.memory_gb, device.memory_gb);
    let duty_cycle = ratio(seconds, window_seconds);
    Utilisation {
        power_share,
        memory_share,
        duty_cycle,
        score: (0.5 * power_share + 0.3 * memory_share + 0.2 * duty_cycle).clamp(0.0, 1.0),
    }
}

fn ratio(part: f64, whole: f64) -> f64 {
    if whole <= 0.0 {
        return 0.0;
    }
    (part / whole).clamp(0.0, 1.0)
}

/// One local model measured against the reference API model for one workload.
pub fn row_for(
    model: &ModelCard,
    profile: &LocalProfile,
    device: &DeviceEnergy,
    reference: &ModelCard,
    tokens_in: u64,
    tokens_out: u64,
    window_seconds: f64,
) -> LocalRunEconomics {
    let seconds = seconds_for(profile, tokens_in, tokens_out);
    let energy_wh = profile.power_draw_w * seconds / 3600.0;
    let energy_cost_usd = energy_wh / 1000.0 * device.price_per_kwh;
    let api_equivalent_usd = api_equivalent(reference, tokens_in, tokens_out);
    let saved_usd = api_equivalent_usd - energy_cost_usd;
    let savings_ratio = if api_equivalent_usd > 0.0 {
        saved_usd / api_equivalent_usd
    } else {
        0.0
    };
    let tokens = (tokens_in + tokens_out) as f64;

    LocalRunEconomics {
        model_id: model.id.clone(),
        name: model.name.clone(),
        tokens_in,
        tokens_out,
        seconds,
        energy_wh,
        energy_cost_usd,
        api_equivalent_usd,
        saved_usd,
        savings_ratio,
        tokens_per_wh: if energy_wh > 0.0 { tokens / energy_wh } else { 0.0 },
        battery_pct: if device.battery_wh > 0.0 {
            energy_wh / device.battery_wh * 100.0
        } else {
            0.0
        },
        ready: model.ready,
        utilisation: utilisation(profile, device, seconds, window_seconds),
    }
}

/// The whole picture for one usage window: every local model in the catalogue
/// measured against the same workload and the same reference API model.
pub fn local_economics(
    models: &[ModelCard],
    device: &DeviceEnergy,
    reference_id: &str,
    window: &str,
    tokens_in: u64,
    tokens_out: u64,
    window_seconds: f64,
    realised_tokens: u64,
) -> LocalEconomics {
    let reference = models.iter().find(|model| model.id == reference_id);

    let rows: Vec<LocalRunEconomics> = models
        .iter()
        .filter_map(|model| {
            let profile = model.local_profile.as_ref()?;
            let reference = reference?;
            Some(row_for(
                model,
                profile,
                device,
                reference,
                tokens_in,
                tokens_out,
                window_seconds,
            ))
        })
        .collect();

    let best = rows
        .iter()
        .max_by(|a, b| a.saved_usd.partial_cmp(&b.saved_usd).unwrap_or(std::cmp::Ordering::Equal));

    LocalEconomics {
        basis: "estimate · declared coefficients, not measured".into(),
        window: window.into(),
        price_per_kwh: device.price_per_kwh,
        reference_model_id: reference_id.into(),
        workload_tokens_in: tokens_in,
        workload_tokens_out: tokens_out,
        realised_tokens,
        best_model_id: best.map(|row| row.model_id.clone()),
        best_saved_usd: best.map(|row| row.saved_usd).unwrap_or(0.0),
        best_savings_ratio: best.map(|row| row.savings_ratio).unwrap_or(0.0),
        best_energy_wh: best.map(|row| row.energy_wh).unwrap_or(0.0),
        best_battery_pct: best.map(|row| row.battery_pct).unwrap_or(0.0),
        rows,
    }
}
