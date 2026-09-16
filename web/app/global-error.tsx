"use client";

/** The shell has no server to fall back to, so a fatal render error is shown
 *  in place with the one action that can help: reload the window. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Open Cube could not render</h1>
          <p style={{ opacity: 0.7, fontSize: 13 }}>{error.message}</p>
          <button onClick={reset} style={{ marginTop: 16 }}>
            Reload the shell
          </button>
        </main>
      </body>
    </html>
  );
}
