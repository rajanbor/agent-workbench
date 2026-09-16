/** Open a reference in the system browser.
 *
 *  Never in the app window: an artifact page or a provider's documentation is
 *  untrusted content, and the shell holds the workbench state. Under Tauri the
 *  opener plugin hands the URL to the OS; in a browser preview it opens a new
 *  tab with no opener reference.
 */
export async function openExternal(url: string): Promise<void> {
  if (!/^https:\/\//.test(url)) throw new Error("only https references are opened");
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
