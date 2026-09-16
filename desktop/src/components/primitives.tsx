import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Tone = "neutral" | "accent" | "green" | "amber" | "red" | "violet" | "blue";

/* ------------------------------------------------------------------ button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "quiet";
  icon?: IconName;
  trailingIcon?: IconName;
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  icon,
  trailingIcon,
  size = "md",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 13 : 15} />}
      {children && <span>{children}</span>}
      {trailingIcon && <Icon name={trailingIcon} size={size === "sm" ? 13 : 15} />}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  size = 15,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; size?: number }) {
  return (
    <button className={`icon-btn ${className}`} title={label} aria-label={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

/* ------------------------------------------------------------------- badge */

export function Badge({
  tone = "neutral",
  mono = true,
  icon,
  children,
}: {
  tone?: Tone;
  mono?: boolean;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <span className={`badge badge--${tone} ${mono ? "badge--mono" : ""}`}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone = "neutral", pulse }: { tone?: Tone; pulse?: boolean }) {
  return <i className={`status-dot status-dot--${tone} ${pulse ? "is-pulsing" : ""}`} />;
}

/* -------------------------------------------------------------------- card */

export function Card({
  children,
  className = "",
  tone = "neutral",
  dashed,
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  dashed?: boolean;
}) {
  return (
    <section className={`card card--${tone} ${dashed ? "card--dashed" : ""} ${className}`}>
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  count,
  action,
}: {
  children: ReactNode;
  count?: number | string;
  action?: ReactNode;
}) {
  return (
    <header className="section-title">
      <h2>
        {children}
        {count !== undefined && <span className="section-title__count">{count}</span>}
      </h2>
      {action}
    </header>
  );
}

export function Avatar({ name, tone = "neutral" }: { name: string; tone?: Tone }) {
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return <span className={`avatar avatar--${tone}`}>{initials}</span>;
}

export function KeyHint({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
