import { Icon, type IconName } from "./Icon";
import type { Accent } from "../lib/identity";

/** Round agent face, in the spirit of a chat bot avatar: one colour, two eyes. */
export function AgentFace({
  accent,
  size = 30,
  status,
}: {
  accent: Accent;
  size?: number;
  status?: string;
}) {
  return (
    <span
      className={`face face--${accent}`}
      style={{ width: size, height: size }}
      data-status={status}
    >
      <i />
      <i />
    </span>
  );
}

/** Model identity: the model's own icon on its own accent. */
export function ModelGlyph({
  icon,
  accent,
  size = 26,
}: {
  icon: IconName;
  accent: Accent;
  size?: number;
}) {
  return (
    <span className={`glyph glyph--${accent}`} style={{ width: size, height: size }}>
      <Icon name={icon} size={Math.round(size * 0.58)} />
    </span>
  );
}
