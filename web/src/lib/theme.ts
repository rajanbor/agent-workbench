import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "open-cube.theme";

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* private mode or blocked storage: fall back to the system theme */
  }
  return "system";
}

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  void syncWindow(choice);
}

/** Keep the native window appearance with the app theme.
 *
 *  The macOS window material follows the window's appearance, so a light app
 *  theme in a dark-appearance window keeps a dark ground behind light text.
 *  Setting the window theme makes the material follow the app instead. */
async function syncWindow(choice: ThemeChoice) {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTheme(choice === "system" ? null : choice);
  } catch {
    /* the page still paints its own ground over the material */
  }
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  // The first client render must match the prerendered HTML, so the stored
  // choice is adopted in an effect rather than read during render. The
  // pre-paint script has already applied it to <html>, so nothing flashes.
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [adopted, setAdopted] = useState(false);
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setChoice(readStored());
    setAdopted(true);
  }, []);

  useEffect(() => {
    if (!adopted) return;
    apply(choice);
    setResolved(resolveTheme(choice));
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore: the theme still applies for this session */
    }
  }, [adopted, choice]);

  useEffect(() => {
    if (choice !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setResolved(media.matches ? "light" : "dark");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice]);

  const toggle = useCallback(() => {
    setChoice((current) => (resolveTheme(current) === "dark" ? "light" : "dark"));
  }, []);

  return { choice, resolved, setChoice, toggle };
}
