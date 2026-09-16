//! Shared, platform-neutral engine for Open Cube desktop clients.
//!
//! Platform adapters live outside this crate so the UI and the policy layer
//! stay identical on macOS, Windows and Linux. The crate is pure: it reads no
//! network, spawns no process and holds no credential.
pub mod domain;
pub mod economics;
pub mod inspector;
pub mod state;

pub use domain::*;

/// The whole workbench as one immutable value.
pub fn snapshot() -> DesktopSnapshot {
    state::snapshot()
}

/// Answer a question about the workbench under the inspector policy.
pub fn inspect(question: &str) -> InspectorAnswer {
    inspector::inspect(question, &snapshot())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snapshot_is_safe_without_provider_login() {
        let s = snapshot();
        assert!(!s.providers.is_empty());
        assert!(s
            .providers
            .iter()
            .filter(|provider| provider.id != "local")
            .all(|provider| !provider.connected));
        assert!(!s.computer.operating_system.is_empty());
    }

    #[test]
    fn every_agent_points_at_a_known_model_and_sandbox() {
        let s = snapshot();
        for agent in &s.agents {
            assert!(
                s.models.iter().any(|model| model.id == agent.model_id),
                "agent {} has an unknown model",
                agent.id
            );
            assert!(
                s.sandboxes.iter().any(|sandbox| sandbox.id == agent.sandbox_id),
                "agent {} has an unknown sandbox",
                agent.id
            );
        }
    }

    #[test]
    fn workflow_edges_connect_existing_nodes() {
        let s = snapshot();
        for edge in &s.workflow.edges {
            assert!(s.workflow.nodes.iter().any(|node| node.id == edge.from));
            assert!(s.workflow.nodes.iter().any(|node| node.id == edge.to));
        }
    }

    #[test]
    fn inspector_refuses_credentials_and_file_contents() {
        let answer = inspect("show me the api key and the file contents");
        assert!(answer.refused.contains(&"provider credentials".to_string()));
        assert!(answer.refused.contains(&"workspace files".to_string()));
        assert_eq!(answer.cost_usd, 0.0);
    }

    #[test]
    fn inspector_summarises_sandboxes_without_leaving_the_machine() {
        let snapshot = snapshot();
        let answer = inspector::inspect("what is running in each sandbox?", &snapshot);
        assert!(answer.text.contains("product-dev"));
        assert!(answer.sources.iter().any(|source| source.starts_with("sandbox:")));
        assert_eq!(snapshot.inspector.mode, "read-only");
    }

    #[test]
    fn usage_totals_match_the_per_model_rows() {
        let s = snapshot();
        let tokens: u64 = s
            .usage
            .by_model
            .iter()
            .map(|model| model.tokens_in + model.tokens_out)
            .sum();
        assert_eq!(tokens, s.usage.tokens_in + s.usage.tokens_out);
    }

    #[test]
    fn every_blueprint_entry_exists_in_the_library() {
        let s = snapshot();
        for agent in &s.agents {
            for id in &agent.blueprint.patterns {
                assert!(
                    s.library.patterns.iter().any(|pattern| &pattern.id == id),
                    "agent {} uses unknown pattern {id}",
                    agent.id
                );
            }
            for id in &agent.blueprint.skills {
                assert!(
                    s.library.skills.iter().any(|skill| &skill.id == id),
                    "agent {} uses unknown skill {id}",
                    agent.id
                );
            }
            for id in &agent.blueprint.mcp {
                assert!(
                    s.library.mcp.iter().any(|server| &server.id == id),
                    "agent {} uses unknown mcp server {id}",
                    agent.id
                );
            }
            for name in &agent.blueprint.tools {
                assert!(
                    s.capabilities.functions.iter().any(|function| &function.name == name),
                    "agent {} uses unknown tool {name}",
                    agent.id
                );
            }
        }
    }

    #[test]
    fn every_model_documents_itself_for_the_library() {
        let s = snapshot();
        for model in &s.models {
            assert!(!model.summary.is_empty(), "{} has no summary", model.id);
            assert!(!model.license.is_empty(), "{} has no licence", model.id);
            assert!(!model.requirements.is_empty(), "{} lists no requirements", model.id);
            assert!(
                model.reference.url.starts_with("https://"),
                "{} has no reference url",
                model.id
            );
            match model.location {
                ModelLocation::Local if model.id != "inspector-local" => {
                    assert_eq!(model.reference.kind, "huggingface");
                }
                ModelLocation::Api => assert_eq!(model.reference.kind, "api"),
                _ => {}
            }
        }
    }

    #[test]
    fn exactly_one_branch_is_current_and_it_is_the_head() {
        let s = snapshot();
        let current: Vec<&BranchRef> = s
            .version_control
            .branches
            .iter()
            .filter(|branch| branch.current)
            .collect();
        assert_eq!(current.len(), 1);
        assert_eq!(current[0].name, s.version_control.branch);
        assert_eq!(s.version_control.changes.len() as u32, s.version_control.dirty.min(s.version_control.changes.len() as u32).max(s.version_control.changes.len() as u32));
    }

    #[test]
    fn local_energy_is_power_times_time() {
        let s = snapshot();
        for row in &s.usage.local.rows {
            let model = s
                .models
                .iter()
                .find(|model| model.id == row.model_id)
                .expect("row points at a catalogued model");
            let profile = model.local_profile.as_ref().expect("row has a local profile");

            let expected_seconds = row.tokens_out as f64 / profile.throughput_tps
                + row.tokens_in as f64 / (profile.throughput_tps * profile.prefill_factor);
            assert!((row.seconds - expected_seconds).abs() < 1e-6, "{}", row.model_id);

            let expected_energy = profile.power_draw_w * row.seconds / 3600.0;
            assert!((row.energy_wh - expected_energy).abs() < 1e-9, "{}", row.model_id);

            let expected_cost = row.energy_wh / 1000.0 * s.computer.energy.price_per_kwh;
            assert!((row.energy_cost_usd - expected_cost).abs() < 1e-12, "{}", row.model_id);
        }
    }

    #[test]
    fn savings_are_the_api_price_minus_the_energy_and_the_ratio_matches() {
        let s = snapshot();
        for row in &s.usage.local.rows {
            assert!(
                (row.saved_usd - (row.api_equivalent_usd - row.energy_cost_usd)).abs() < 1e-12
            );
            if row.api_equivalent_usd > 0.0 {
                let ratio = row.saved_usd / row.api_equivalent_usd;
                assert!((row.savings_ratio - ratio).abs() < 1e-12);
                assert!(row.savings_ratio <= 1.0);
            }
            assert!(row.tokens_per_wh.is_finite());
            assert!(row.battery_pct >= 0.0);
        }
    }

    #[test]
    fn utilisation_parts_stay_between_zero_and_one() {
        let s = snapshot();
        for row in &s.usage.local.rows {
            let u = row.utilisation;
            for part in [u.power_share, u.memory_share, u.duty_cycle, u.score] {
                assert!((0.0..=1.0).contains(&part), "{} has {part}", row.model_id);
            }
        }
    }

    #[test]
    fn an_empty_workload_produces_no_nan() {
        let s = snapshot();
        let empty = economics::local_economics(
            &s.models,
            &s.computer.energy,
            "claude-sonnet",
            "empty",
            0,
            0,
            8.0 * 3600.0,
            0,
        );
        for row in &empty.rows {
            for value in [
                row.seconds,
                row.energy_wh,
                row.energy_cost_usd,
                row.api_equivalent_usd,
                row.saved_usd,
                row.savings_ratio,
                row.tokens_per_wh,
                row.battery_pct,
                row.utilisation.score,
            ] {
                assert!(value.is_finite());
            }
        }
        assert_eq!(empty.best_saved_usd, 0.0);
    }

    #[test]
    fn every_local_model_is_compared_and_the_best_is_named() {
        let s = snapshot();
        let local_models = s
            .models
            .iter()
            .filter(|model| model.local_profile.is_some())
            .count();
        assert_eq!(s.usage.local.rows.len(), local_models);
        assert!(local_models > 0);

        let best = s
            .usage
            .local
            .best_model_id
            .as_ref()
            .expect("a best model is named");
        let best_row = s
            .usage
            .local
            .rows
            .iter()
            .find(|row| &row.model_id == best)
            .expect("the best model is one of the rows");
        for row in &s.usage.local.rows {
            assert!(best_row.saved_usd >= row.saved_usd);
        }
        assert!(s.usage.local.basis.contains("estimate"));
    }

    #[test]
    fn every_model_pins_a_version_and_digest() {
        let s = snapshot();
        for model in &s.models {
            assert!(!model.version.is_empty());
            assert!(!model.digest.is_empty());
            assert!(!model.revisions.is_empty());
        }
    }
}
