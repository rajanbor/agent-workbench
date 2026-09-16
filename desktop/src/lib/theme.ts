import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "open-cube.theme";

function readStored(): ThemeChoice {
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
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readStored);
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(readStored()));

  useEffect(() => {
    apply(choice);
    setResolved(resolveTheme(choice));
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore: the theme still applies for this session */
    }
  }, [choice]);

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
