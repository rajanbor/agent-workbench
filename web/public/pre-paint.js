/* Runs before the first paint: pin the stored theme and mark the native window,
   so the shell never flashes the wrong ground. Kept out of the React tree —
   a script rendered by a component is not executed on the client and breaks
   hydration. */
try {
  if (window.__TAURI_INTERNALS__) document.documentElement.dataset.runtime = "tauri";
  var stored = localStorage.getItem("open-cube.theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
} catch (error) {
  /* storage blocked: fall back to the system theme */
}
