"use client";

import App from "../src/App";

/** The whole shell is a client surface: it reads the engine over Tauri IPC,
 *  stores theme and drafts locally, and never renders on a server. */
export default function Page() {
  return <App />;
}
