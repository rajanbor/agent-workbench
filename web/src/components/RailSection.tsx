import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** VS Code style twisty section: uppercase header, chevron, optional count. */
export function RailSection({
  title,
  count,
  icon,
  defaultOpen = true,
  action,
  children,
}: {
  title: string;
  count?: number | string;
  icon?: IconName;
  defaultOpen?: boolean;
  action?: { icon: IconName; label: string; onClick: () => void };
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`rail-section ${open ? "is-open" : ""}`}>
      <header>
        <button className="rail-section__head" onClick={() => setOpen((value) => !value)}>
          <Icon name="chevronDown" size={13} className={open ? "" : "is-closed"} />
          {icon && <Icon name={icon} size={13} className="rail-section__icon" />}
          <span>{title}</span>
          {count !== undefined && <em>{count}</em>}
        </button>
        {action && (
          <button
            className="rail-section__action"
            title={action.label}
            aria-label={action.label}
            onClick={action.onClick}
          >
            <Icon name={action.icon} size={13} />
          </button>
        )}
      </header>
      {open && <div className="rail-section__body">{children}</div>}
    </section>
  );
}
