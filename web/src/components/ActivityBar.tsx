import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { Avatar } from "./primitives";
import { activities, type ActivityId } from "../lib/layout";

/** The strip on the far left: one icon per area of the workbench. Picking an
 *  icon swaps what the sidebar shows; picking the one that is already active
 *  collapses the sidebar, leaving the strip. The account sits at the foot,
 *  where it is always reachable and never in the way. */
export function ActivityBar({
  activity,
  sidebarOpen,
  counts,
  onPick,
  onSettings,
  onShortcuts,
}: {
  activity: ActivityId;
  sidebarOpen: boolean;
  counts: Partial<Record<ActivityId, number>>;
  onPick: (id: ActivityId) => void;
  onSettings: () => void;
  onShortcuts: () => void;
}) {
  return (
    <nav className="activity" aria-label="Workbench areas">
      <ul className="activity__list">
        {activities.map((item) => {
          const current = sidebarOpen && item.id === activity;
          const count = counts[item.id];
          return (
            <li key={item.id}>
              <button
                className={`activity__item ${current ? "is-active" : ""}`}
                title={item.hint}
                aria-label={item.title}
                aria-current={current ? "true" : undefined}
                onClick={() => onPick(item.id)}
              >
                <Icon name={item.icon} size={20} />
                {count !== undefined && count > 0 && <em className="activity__count">{count}</em>}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="activity__foot">
        <button className="activity__item" title="Settings" aria-label="Settings" onClick={onSettings}>
          <Icon name="settings" size={20} />
        </button>
        <Menu
          className="menu--activity"
          placement="above"
          align="left"
          title="Account and appearance"
          chevron={false}
          label={<Avatar name="Rajan Bor" tone="accent" />}
        >
          {(close) => (
            <>
              <p className="menu__label">Account</p>
              <div className="menu__note">
                Open Cube has no sign-in. This profile is local to the machine, and no provider
                credential is stored by the app.
              </div>
              <button
                className="menu__item"
                onClick={() => {
                  onSettings();
                  close();
                }}
              >
                <Icon name="settings" size={14} />
                <span>Settings</span>
              </button>
              <button
                className="menu__item"
                onClick={() => {
                  onShortcuts();
                  close();
                }}
              >
                <Icon name="code" size={14} />
                <span>Keyboard shortcuts</span>
              </button>
            </>
          )}
        </Menu>
      </div>
    </nav>
  );
}
