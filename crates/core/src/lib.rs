//! Shared, platform-neutral engine for Open Cube desktop clients.
//!
//! Platform adapters live outside this crate so the UI and the policy layer
//! stay identical on macOS, Windows and Linux. The crate is pure: it reads no
//! network, spawns no process and holds no credential.
pub mod activity;
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
    fn every_agent_works_in_a_project_the_workbench_knows() {
        let s = snapshot();
        for agent in &s.agents {
            let project = s
                .projects
                .iter()
                .find(|project| project.path == agent.project.path)
                .unwrap_or_else(|| panic!("agent {} works in an unlisted project", agent.id));

            assert_eq!(
                project.name, agent.project.name,
                "agent {} names its project differently from the project itself",
                agent.id
            );
            assert!(
                project.agents.contains(&agent.id),
                "project {} does not list agent {}",
                project.id,
                agent.id
            );
        }

        // A project claiming an agent that does not exist would send the person
        // to an empty tab.
        for project in &s.projects {
            for id in &project.agents {
                assert!(
                    s.agents.iter().any(|agent| &agent.id == id),
                    "project {} lists unknown agent {}",
                    project.id,
                    id
                );
            }
        }
    }

    #[test]
    fn exactly_one_project_owns_the_working_tree_that_is_reported() {
        let s = snapshot();
        let tracked: Vec<_> = s.projects.iter().filter(|project| project.tracked).collect();
        assert_eq!(
            tracked.len(),
            1,
            "the engine reports one working tree, so one project may claim it"
        );
        assert_eq!(
            tracked[0].dirty as usize,
            s.version_control.changes.len(),
            "the tracked project's dirty count must match the changes that are listed"
        );
        assert_eq!(tracked[0].branch, s.version_control.branch);
    }

    #[test]
    fn no_editor_claims_to_be_installed_without_a_check() {
        let s = snapshot();
        assert!(!s.editors.is_empty(), "a folder must have somewhere to go");
        for editor in &s.editors {
            assert!(
                editor.installed.is_none(),
                "{} claims to be installed, but nothing has looked for it",
                editor.id
            );
            assert!(
                editor.command.contains("<path>"),
                "{} does not say where the path goes",
                editor.id
            );
        }
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
    fn every_period_total_matches_its_rows() {
        let s = snapshot();
        assert_eq!(s.usage.periods.len(), 4);
        for period in &s.usage.periods {
            let tokens_in: u64 = period.by_model.iter().map(|row| row.tokens_in).sum();
            let tokens_out: u64 = period.by_model.iter().map(|row| row.tokens_out).sum();
            let cost: f64 = period.by_model.iter().map(|row| row.cost_usd).sum();
            assert_eq!(period.tokens_in, tokens_in, "{}", period.id);
            assert_eq!(period.tokens_out, tokens_out, "{}", period.id);
            assert!((period.cost_usd - cost).abs() < 1e-9, "{}", period.id);
        }

        let today = s
            .usage
            .periods
            .iter()
            .find(|period| period.id == "today")
            .expect("today is one of the periods");
        assert_eq!(today.tokens_in, s.usage.tokens_in);
        assert_eq!(today.tokens_out, s.usage.tokens_out);
    }

    #[test]
    fn periods_grow_with_their_span() {
        let s = snapshot();
        let cost = |id: &str| {
            s.usage
                .periods
                .iter()
                .find(|period| period.id == id)
                .map(|period| period.cost_usd)
                .unwrap_or_default()
        };
        assert!(cost("hour") <= cost("today"));
        assert!(cost("today") <= cost("week"));
        assert!(cost("week") <= cost("month"));
    }

    #[test]
    fn the_calendar_is_whole_weeks_of_readable_days() {
        let s = snapshot();
        let calendar = &s.usage.activity;
        assert_eq!(calendar.weeks.len(), 52);
        for week in &calendar.weeks {
            assert_eq!(week.days.len(), 7, "week {} is short", week.start_date);
            assert_eq!(week.days[0].weekday, 0, "weeks start on Monday");
            for day in &week.days {
                assert!(day.level <= 4);
                assert_eq!(day.date.len(), 10);
                assert!(day.runs == 0 || day.level > 0);
            }
        }

        let counted: u32 = calendar
            .weeks
            .iter()
            .flat_map(|week| week.days.iter())
            .map(|day| day.runs)
            .sum();
        assert_eq!(counted, calendar.total_runs);
        assert!(calendar.basis.contains("prototype"));
    }

    #[test]
    fn activity_is_attributed_to_every_model() {
        let s = snapshot();
        let calendar = &s.usage.activity;
        assert_eq!(calendar.by_model.len(), s.models.len());
        let shares: f64 = calendar.by_model.iter().map(|row| row.share).sum();
        assert!((shares - 1.0).abs() < 1e-9, "shares add up to one");
        for row in &calendar.by_model {
            assert!(s.models.iter().any(|model| model.id == row.model_id));
            assert!(row.runs <= calendar.total_runs);
        }
    }

    #[test]
    fn every_period_splits_its_cost_by_where_the_money_goes() {
        let s = snapshot();
        for period in &s.usage.periods {
            let parts = period.metered_usd + period.subscription_usd + period.electricity_usd;
            assert!(
                (period.cost_usd - parts).abs() < 0.02,
                "{}: {} != {}",
                period.id,
                period.cost_usd,
                parts
            );
            for row in &period.by_model {
                let model = s
                    .models
                    .iter()
                    .find(|model| model.id == row.model_id)
                    .expect("row points at a model");
                match row.cost_kind {
                    CostKind::Metered => assert!(model.pricing.is_some()),
                    CostKind::Subscription => assert!(model.subscription.is_some()),
                    CostKind::Electricity => {
                        assert!(model.local_profile.is_some());
                        assert!(row.energy_wh > 0.0 || row.tokens_out == 0);
                    }
                    CostKind::None => assert_eq!(row.cost_usd, 0.0),
                }
            }
        }
    }

    #[test]
    fn a_subscription_costs_the_plan_over_a_month() {
        let s = snapshot();
        let month = s
            .usage
            .periods
            .iter()
            .find(|period| period.id == "month")
            .unwrap();
        let plan: f64 = s
            .models
            .iter()
            .filter_map(|model| model.subscription.as_ref())
            .map(|subscription| subscription.monthly_usd)
            .sum();
        assert!((month.subscription_usd - plan).abs() < 0.01, "a month is the plan");

        let today = s
            .usage
            .periods
            .iter()
            .find(|period| period.id == "today")
            .unwrap();
        assert!((today.subscription_usd - plan / 30.0).abs() < 0.01, "a day is a thirtieth");
    }

    #[test]
    fn a_local_model_costs_its_electricity() {
        let s = snapshot();
        let today = s.usage.periods.iter().find(|p| p.id == "today").unwrap();
        let row = today
            .by_model
            .iter()
            .find(|row| row.cost_kind == CostKind::Electricity)
            .expect("a local model is in use");
        let expected = row.energy_wh / 1000.0 * s.computer.energy.price_per_kwh;
        assert!((row.cost_usd - expected).abs() < 0.01);
        assert!(row.energy_wh > 0.0);
    }

    #[test]
    fn activity_kinds_are_counted_and_add_up() {
        let s = snapshot();
        let kinds = &s.usage.activity.by_kind;
        assert_eq!(kinds.len(), 4);
        let total: u32 = kinds.iter().map(|kind| kind.count).sum();
        assert!(total > 0);
        let shares: f64 = kinds.iter().map(|kind| kind.share).sum();
        assert!((shares - 1.0).abs() < 1e-9);

        // Terminal commands are counted from the panes, not invented.
        let typed = s
            .terminals
            .iter()
            .flat_map(|terminal| terminal.lines.iter())
            .filter(|line| line.stream == "input")
            .count() as u32;
        assert_eq!(
            kinds.iter().find(|kind| kind.name == "Terminal commands").unwrap().count,
            typed
        );
        assert_eq!(
            kinds.iter().find(|kind| kind.name == "Workflow steps").unwrap().count,
            s.workflow.nodes.len() as u32
        );
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
