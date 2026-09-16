import { useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { IconButton, KeyHint } from "./primitives";
import { maxGroups, type Group, type Layout, type TabSpec } from "../lib/layout";

/** The work area: one strip of tabs per group, groups side by side, a drag
 *  handle between them. A tab can be dragged onto another group's strip, and
 *  any tab can be split to the right — which is the whole point of the
 *  arrangement: two things at once, in one window. */
export function EditorGroups({
  layout,
  render,
  onFocusGroup,
  onFocusTab,
  onCloseTab,
  onSplit,
  onCloseGroup,
  onMoveTab,
  onEmptyAction,
}: {
  layout: Layout;
  render: (tab: TabSpec, group: Group) => ReactNode;
  onFocusGroup: (groupId: string) => void;
  onFocusTab: (groupId: string, key: string) => void;
  onCloseTab: (groupId: string, key: string) => void;
  onSplit: (groupId: string, key: string) => void;
  onCloseGroup: (groupId: string) => void;
  onMoveTab: (fromGroupId: string, key: string, toGroupId: string) => void;
  onEmptyAction: () => void;
}) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const holder = useRef<HTMLDivElement>(null);

  const grow = (id: string) => ratios[id] ?? 1;

  /** Dragging the seam moves weight from one group to its neighbour; the pair
   *  always sums to what they had, so the rest of the row does not jump. */
  const startSeam = (leftId: string, rightId: string) => (event: React.PointerEvent) => {
    event.preventDefault();
    const box = holder.current?.getBoundingClientRect();
    if (!box) return;
    const startX = event.clientX;
    const total = grow(leftId) + grow(rightId);
    const startLeft = grow(leftId);
    const perPixel = total / Math.max(box.width, 1);

    const move = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) * perPixel;
      const left = Math.min(Math.max(startLeft + delta, total * 0.2), total * 0.8);
      setRatios((current) => ({ ...current, [leftId]: left, [rightId]: total - left }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="groups" ref={holder}>
      {layout.groups.map((group, index) => {
        const tab = group.tabs.find((item) => item.key === group.activeKey) ?? null;
        const focused = group.id === layout.activeGroupId;
        return (
          <div key={group.id} className="groups__slot" style={{ flexGrow: grow(group.id) }}>
            {index > 0 && (
              <div
                className="groups__seam"
                role="separator"
                aria-label="Resize panes"
                onPointerDown={startSeam(layout.groups[index - 1].id, group.id)}
              />
            )}
            <section
              className={`group ${focused ? "is-focused" : ""}`}
              onMouseDown={() => !focused && onFocusGroup(group.id)}
            >
              <header className="group__bar">
                <div
                  className="group__tabs"
                  role="tablist"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromGroup = event.dataTransfer.getData("text/tab-group");
                    const key = event.dataTransfer.getData("text/tab-key");
                    if (fromGroup && key) onMoveTab(fromGroup, key, group.id);
                  }}
                >
                  {group.tabs.map((item) => (
                    <div
                      key={item.key}
                      className={`tab ${item.key === group.activeKey ? "is-active" : ""}`}
                      title={item.hint ? `${item.title}\n${item.hint}` : item.title}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/tab-group", group.id);
                        event.dataTransfer.setData("text/tab-key", item.key);
                      }}
                    >
                      <button
                        className="tab__open"
                        role="tab"
                        aria-selected={item.key === group.activeKey}
                        onClick={() => onFocusTab(group.id, item.key)}
                        onAuxClick={(event) => {
                          // Middle click closes, as it does in every tab strip.
                          if (event.button === 1) onCloseTab(group.id, item.key);
                        }}
                      >
                        <Icon name={item.icon} size={14} />
                        <span>{item.title}</span>
                      </button>
                      <button
                        className="tab__close"
                        aria-label={`Close ${item.title}`}
                        onClick={() => onCloseTab(group.id, item.key)}
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="group__tools">
                  {tab && layout.groups.length < maxGroups && (
                    <IconButton
                      icon="split"
                      label="Split to the right"
                      size={14}
                      onClick={() => onSplit(group.id, tab.key)}
                    />
                  )}
                  {layout.groups.length > 1 && (
                    <IconButton
                      icon="close"
                      label="Close this pane"
                      size={14}
                      onClick={() => onCloseGroup(group.id)}
                    />
                  )}
                </div>
              </header>

              <div className="group__view">
                {tab ? render(tab, group) : <Watermark onOpen={onEmptyAction} />}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}

/** What an empty pane says. VS Code shows its shortcuts here; so do we, and we
 *  give the one action that always makes sense. */
function Watermark({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="watermark">
      <Icon name="cube" size={44} />
      <button className="watermark__open" onClick={onOpen}>
        Open the workbench chat
      </button>
      <ul>
        <li>
          Command palette <KeyHint>⌘K</KeyHint>
        </li>
        <li>
          Sidebar <KeyHint>⌘B</KeyHint>
        </li>
        <li>
          Terminals <KeyHint>⌘J</KeyHint>
        </li>
        <li>
          Workbench API <KeyHint>⌘I</KeyHint>
        </li>
      </ul>
    </div>
  );
}
