//! Dumps the prototype snapshot as JSON.
//!
//! `pnpm fallback` writes the result to `src/data/prototype-snapshot.json`, so
//! the browser preview shows exactly what the engine would return instead of a
//! hand-maintained copy that drifts.
fn main() {
    let snapshot = open_cube_engine::snapshot();
    println!("{}", serde_json::to_string_pretty(&snapshot).expect("serialisable snapshot"));
}
