import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Dropdown used by the top bar and the account button.
 *  Closes on outside click and on Escape; the trigger owns its own styling. */
export function Menu({
  label,
  children,
  align = "left",
  placement = "below",
  className = "",
  title,
}: {
  label: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  placement?: "below" | "above";
  className?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${className}`} ref={holder}>
      <button
        className={`menu__trigger ${open ? "is-open" : ""}`}
        title={title}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <Icon name={placement === "above" ? "chevronUpDown" : "chevronDown"} size={13} />
      </button>
      {open && (
        <div className={`menu__panel menu__panel--${align} menu__panel--${placement}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
