# Design language

Extracted from the reference interface and applied to the client. The rule
behind every line below: the base is monochrome, and colour is reserved for
meaning. Typography and spacing carry the hierarchy.

## Colour

| Role | Dark | Light |
| --- | --- | --- |
| Page ground | near-black neutral | white |
| Surface | one step off the ground | white on a faint grey page |
| Ink (primary, selected) | white on dark | black on white |
| Text | high contrast; secondary, muted and faint below it | same, inverted |
| Border | hairline at 6-10% contrast | hairline at 6-10% contrast |

Status colour is the only hue in the interface:

| Meaning | Hue |
| --- | --- |
| done, live, ready, running | green |
| thread, conversation | purple |
| task, scheduled work | blue |
| waiting, approval, limited | amber |
| failure, refusal | red |

A status is always tinted text on a low-opacity fill of the same hue, never a
saturated block. Model identity keeps its own accent, because a model must look
the same everywhere; nothing else in the chrome carries a hue.

## Type

| Use | Size | Weight |
| --- | --- | --- |
| Display (profile name) | 40px | 600, tight tracking |
| Section title | 15px | 550 |
| Row title, body | 14px | 450 |
| Secondary, source, meta | 13px | 400 |
| Caption, timestamp, badge | 11-12px | 450 |

System sans for the interface, monospace for identifiers, hashes, paths and
durations. Line height 1.55-1.65 in paragraphs, 1.4 in dense rows.

## Shape and space

- Radii: 12px cards and panels, 8px controls, 6px badges, pill for chips and
  switches, full circle for avatars.
- Rows: 12-14px vertical padding, 20px horizontal, separated by hairlines —
  not by cards.
- Cards: 1px border, 16-18px padding, and an optional footer strip on a faint
  fill carrying a state dot and its schedule.
- Panels are opaque; only the window chrome keeps the platform's translucency.

## Components

**Row.** Timestamp, title, source, then a status badge and a completion mark.
An expanded row indents its body behind a left rule, with labelled blocks
(Prompt, Response) in muted small caps above high-contrast text.

**Chip row.** Filter pills: the active one is a filled neutral, the rest are
outlined and muted. The count of what is listed sits at the far right.

**Tabs.** Underlined, never boxed: the active tab is ink with a 2px rule; the
rest are muted. Icons are allowed beside the label.

**Switch.** Ink when on, grey track when off. Anything that is on or off uses a
switch, not a button.

**Profile.** A large circular avatar, the name at display size, the role in
grey, a short description, then tabs. Actions sit as small circular icon
buttons beside the identity, not as a toolbar.

**Live indicator.** A green dot and the word, at the right of a panel header,
only when the panel is actually following live state.
