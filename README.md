# UTZLINE Scheduler — installable app

**Current version: v5** (its own independent version line, separate from every other app in the family — bump this line, and add a dated entry below, every time a new build ships.)

**v5 (2026-09-23):** Andrew, verbatim: *"implement the username as per the delivery itp throughout the entire system, but instead of it opening a popup, the button is the selector, when you pick a name it opens a numberpad to input the pin (4 digit pin)."* Scheduler had no identity/name feature of its own before this — it's added here from scratch, copied verbatim from UTZLINE Delivery ITP's own reference implementation of this exact pattern. A new `<select id="identitySelector">` on the Home screen (next to the project list) **is** the button: its own native dropdown lists every known name plus "+ Add a new name…", and choosing one immediately opens a real on-screen numberpad (never a popup) to verify its 4-digit PIN. Adding a brand-new name still types the name as plain text first (a small dedicated prompt, since this app had no existing generic-prompt modal to reuse), then chooses and confirms a PIN via two numberpad rounds, then ticks which apps to show it in (pre-checked "Scheduler"). This reads/writes the same `utzline-identity` IndexedDB (origin-scoped — a name set in any UTZLINE app shows up in all of them) and the same `<ProjectsRoot>/utzline-users.csv` registry every sibling app now shares — the same file, not a separate copy. As a small, disclosed enhancement while wiring this in, `joinery-schedule.json` records now also carry a read-only `setBy` field, stamped with whoever was signed in on this device when Save was pressed — purely informational, it changes no existing gating, matching, or validation. Does NOT touch Site Measure, Viewer, Install ITP, Manufacture ITP, Delivery ITP, or Projects in any way.

**v4 (2026-09-23):** Andrew, verbatim: *"show both these dates like the bottom one, but with the day (ie.monday) at the start. if the start date is a weekend, move to the closest monday directly after"* — about the Set Schedule dialog's two dates. `formatDateDisplay()` (used everywhere a date is shown as text in this app, not just this dialog) now leads with the weekday, e.g. "Thu, Aug 13, 2026" instead of "Aug 13, 2026". The Required Delivery Date field (a native date-picker input, which can't show a weekday inline) gained a new read-only line right below it showing that same formatted style, live-updating as you change the date — matching the Computed Manufacture Start Date box's own display style, per "show both these dates like the bottom one." Separately, `subtractBusinessDays()` now pushes its result forward to the next Monday if it would otherwise land on a Saturday or Sunday — a real edge case with a 0-day lead time (the function then returns the required delivery date itself unchanged, with no weekday check), not a hypothetical: a 0-lead-time item whose own delivery date is a weekend would previously have shown a weekend "manufacture start date," which is what's now corrected. With any lead time above 0 the walk-back already only ever lands on a weekday, so this is a safety net for that one case, not a change to the everyday calculation.

**v3 (2026-09-23):** Andrew, verbatim: *"scheduler floor plan needs the zoom function, reset to centre, zoom on scroll functionality, mouse click on plan to change the dates. currenty only has pan."* Added a small zoom control group (zoom in / zoom out / **Reset view**) to the Level Plan topbar. Scroll-wheel zoom (centred on the cursor) and two-finger pinch-zoom were already implemented under the hood — copied verbatim from UTZLINE Projects' own plan canvas along with the rest of this viewer — there just wasn't a visible affordance for it, or any way to reset drift back to a known-good view; **Reset view** re-runs the exact fit-to-screen-centred transform the plan already opens with. Zoom buttons use the same 1.25x/0.8x step and viewport-centre anchor Site Measure's own zoomIn/zoomOut buttons use in `source.html`, and share `planZoomAt`'s existing clamp (scale 0.05–20). Also, per Andrew's 4th ask: **a plain tap/click on a marker now opens the real Set Schedule dialog directly**, the same dialog right-click/long-press already opened (`onPlanTap` now delegates straight to `onPlanRightClickOrLongPress`) — previously a plain tap only showed a read-only status/schedule summary toast, a disclosed "accidental-tap safety" design choice from v1 that this explicit request overrides. Right-click and long-press are unchanged and still work exactly as before, now simply a redundant second path to the same dialog.

**v2 (2026-09-23):** added the Work Order # column, requested alongside the same change to UTZLINE Projects ("This and the projects app needs a work order # section"). Scheduler only *displays* it — it reads `workOrderNo` straight off each `joinery-items.json` record (the field Projects now writes at creation time) in both the Overall and Project Schedule tables, in the Level Plan's tap summary and Set Schedule dialog subtitle, and in every text search box, with the same "—" placeholder convention as every other blank cell for items created before the field existed. Scheduler never writes this field — it's read-only here, same as `description` or `joineryId`.

This folder is the self-contained, installable **UTZLINE Scheduler** app — a
**new, separate** app in the UTZLINE family, requested directly by Andrew:

> "now create a schedular app (seperate) that runs off all this info. it has
> a page thats a sortable overall schedule and also project specific
> viewable shcedules, but the dates are set by right clicking on your
> joinery plan in the scheduler and adding a required delivery date, and a
> manufacture lead time in business days (defaults to 30 days), this gives
> a manufacture start date that is the delivery date - the manufacture
> lead time. It creates a sortable database similar to the joinery
> register. It also shows the current status and flags any delays.
> Do not change any other apps. they are all working, just build the
> standalone scheduler"

**Like Install ITP / Manufacture ITP / UTZLINE Projects, this is NOT built
from `source.html`.** It's its own small, purpose-built codebase
(`index.html`) with its own `manifest.json` and `service-worker.js`,
because it needs a different kind of screen (sortable schedule tables plus
a lightweight read-only plan viewer), not a drawing canvas. There's no
`build.py` here — whatever's in `index.html` is what ships.

## What it reads vs. what it owns

Scheduler reads the **same Projects folder** every other app in the family
uses, and is **strictly read-only** against every file another app already
owns:

- `joinery-items.json` — the project's joinery item list (read-only)
- `joinery-status.json` — the shared, forward-only status pipeline
  (read-only; Site Measure's "Mark as check measured" and each ITP's own
  checklist sign-off/open remain the only writers anywhere in the family)
- `Project Saves/Floor Plans/<Project> - <Level>.json` — a level's floor
  plan image and its roomlink markers (read-only)

The **only** thing Scheduler ever writes is its own new file, one per
project, alongside those existing files:

- `joinery-schedule.json` — this app's own schedule records: `{ level,
  room, joineryId, requiredDeliveryDate, manufactureLeadTimeDays,
  manufactureStartDate, updatedAt, setBy }`, matched to a joinery item by
  the same `(level, room, joineryId)` triple `joinery-status.json` already
  uses. `setBy` (added v5) is read-only informational attribution —
  whoever was signed in via the identity selector when Save was pressed,
  or `""` if nobody was — and never gates or validates anything.

Also, at the **Projects-root level** (a sibling of every project folder,
not inside one), Scheduler now reads/writes the same shared
`utzline-users.csv` name+PIN registry every other UTZLINE app uses (added
v5, see "Shared name+PIN identity" below).

Nothing about how a project is organised changes for Site Measure, Viewer,
Install ITP, Manufacture ITP, or Projects to keep working — none of them
know or care that this new file exists.

## Shared name+PIN identity (v5)

Andrew, verbatim: *"implement the username as per the delivery itp
throughout the entire system, but instead of it opening a popup, the
button is the selector, when you pick a name it opens a numberpad to
input the pin (4 digit pin)."*

Scheduler had no identity feature of its own before this. It's copied
verbatim from UTZLINE Delivery ITP's own reference implementation of this
pattern:

- A `<select id="identitySelector">` on the Home screen **is** the button
  — its own dropdown lists every known name plus "+ Add a new name…". No
  separate "Set your name" button or popup.
- Picking an existing name opens a real on-screen 4-digit numberpad to
  verify its PIN — a wrong PIN shakes/clears the pad for another try and
  never changes the signed-in identity; cancelling reverts the selector to
  whoever was previously signed in.
- Picking "+ Add a new name…" asks for the name as plain text first (a
  small dedicated prompt — this app had no existing generic-prompt modal
  to reuse), rejects a case-insensitive duplicate, then chooses and
  confirms a 4-digit PIN via two numberpad rounds, then shows a "Show me
  in" checklist of every UTZLINE app (pre-checked "Scheduler" — reference
  only, for Andrew's own admin use; it never restricts sign-in anywhere).
- The name+PIN itself lives in `<ProjectsRoot>/utzline-users.csv`
  (`Name,PIN,ShowInApps`, PIN in plain text on purpose — a reference-only
  attribution registry Andrew can inspect or hand-edit directly, not a
  real access-control system) — the exact same file every sibling UTZLINE
  app reads and writes, at the Projects-root level. Who's currently signed
  in on *this device* lives in the same shared `utzline-identity`
  IndexedDB database every sibling app already uses (origin-scoped, so a
  name set in one UTZLINE app shows up in all of them).
- No in-app "forgot PIN" flow, by design — resetting or clearing a PIN, or
  freeing up a name, is a plain file-manager/spreadsheet edit to
  `utzline-users.csv`.

## What it does

1. **Choose the Projects folder** (same one as every other app) — the
   folder handle is remembered, same reconnect-after-permission-reset flow
   the rest of the family uses. Requests `readwrite` up front (the only
   write is this app's own schedule file, the moment someone sets a
   schedule for the first time).
2. **Home** — an "Open Overall Schedule" shortcut, plus the list of
   projects found in the folder.
3. **Overall Schedule** — every joinery item, across every project, in one
   sortable table: Project / Level / Room / Joinery ID / Description / Work
   order # / Required delivery / Manufacture start / Lead time / Status /
   Delay, plus "View on plan" and "Edit schedule" actions per row.
   Filterable by project, status, delay state, and a text search (which
   also matches work order #).
4. **Project Schedule** — the same table scoped to one project (no Project
   column), plus a way to jump straight into any level's plan even before
   anything on it has been scheduled.
5. **Level Plan** — a read-only pan/zoom view of a level's saved floor plan
   and its markers (the same rendering the rest of the family already
   uses). Drag to pan; scroll-wheel or pinch to zoom (centred on the
   cursor/pinch midpoint); zoom in/out buttons and a **Reset view** button
   (fits the whole plan back into view, centred, undoing any pan/zoom
   drift) sit in the topbar. **Click a marker** (right-click and
   press-and-hold/long-press also still work, as alternate paths to the
   same place) to open the **Set Schedule** dialog for that item: Required
   Delivery Date and Manufacture Lead Time (business days, defaults to
   30), with the computed Manufacture Start Date shown live as you type,
   plus a "Clear schedule" option.
6. **Status & delay flags** — status is read live from the shared
   `joinery-status.json` pipeline (Created / Check measured / In
   manufacture / Ready to dispatch / Delivered / Installed). Delay is
   Claude's own disclosed design call, since Andrew asked only that the
   app "flags any delays":
   - **No schedule set** — neutral, not counted as a delay.
   - **Delivery overdue** — today is past the required delivery date and
     the item hasn't reached "Installed" yet (the most severe flag;
     "Delivered" is a reserved-but-currently-unreachable stage everywhere
     else in this family too, so "Installed" is the real completion
     marker).
   - **Manufacture start overdue** — today is past the computed
     manufacture start date and the item hasn't reached "In manufacture"
     yet.
   - **On track** — neither of the above.

## Known, disclosed limitations

- **No public-holiday calendar.** The business-day math (required delivery
  date minus the manufacture lead time) only skips Saturdays and Sundays —
  no holiday calendar exists anywhere in this ecosystem yet, so a lead
  time spanning a public holiday will be a little optimistic. Consistent
  with how every other date-adjacent feature in this family has handled
  the same gap so far.
- **Legacy, not-yet-migrated projects.** The plan viewer reads a level's
  markers from `Project Saves/Floor Plans/<Level>.json`. A project that
  hasn't been opened once in Site Measure or UTZLINE Projects since the
  2026-09-22 "full flat structure" cutover won't have that file yet — its
  items still appear correctly in both schedule tables (`joinery-items.json`
  is unaffected), but "View on plan" / right-click-to-schedule won't find
  a plan for it until it's opened once in one of those apps.
- **Same item-matching caveat as `joinery-status.json` elsewhere in this
  family**: two joinery items that ever collide on the exact same
  `(level, room, joineryId)` triple are treated as one. No stable per-item
  ID exists anywhere in this ecosystem yet to do better.

## Accent color

Blue/teal (`#1f8fbf`) — the one hue not already used by a sibling app
(Site Measure/Viewer are orange-red, Install ITP is green, Manufacture ITP
is purple, Projects is crimson).

## Tests

`pdftest-scheduler/` (Playwright against a fake File System Access API,
same convention as the rest of the family):

- `run_schedule_crud_and_delay.js` — setting/recomputing/clearing a
  schedule through the real Save/Clear buttons, confirms
  `joinery-items.json` is never touched, and all six delay-flag scenarios.
- `run_overall_and_plan_view.js` — cross-project aggregation and filters
  on the Overall Schedule screen, unset-dates-always-sort-last, and that a
  plain click and right-click/long-press on a plan marker both open the
  Set Schedule dialog for the correct item.
- `run_plan_zoom_and_reset.js` — the Level Plan's zoom/reset-view controls:
  a real wheel event changes the rendered transform's scale (zoomed toward
  the cursor), the **Reset view** button restores a known-good fit-to-
  screen transform after pan+zoom drift, a plain click on a marker opens
  the Set Schedule dialog and a date can be saved through it, and
  right-click still also opens the same dialog (regression check).
- `run_date_weekday_format_and_weekend_shift.js` — the v4 date-display
  change: the delivery-date field's new weekday-led read-only line and the
  computed-start box both format as "Thu, Aug 13, 2026"; an ordinary
  (>0-day lead) computation always lands on a weekday, unaffected; the
  0-lead-time edge case (delivery date itself a Saturday, then a Sunday) is
  pushed forward to the very next Monday, confirmed both in the live
  preview and in what's actually saved to `joinery-schedule.json`.
- `run_identity_pin.js` — the v5 shared name+PIN identity selector: adding
  a brand-new name through the real UI (name prompt → choose-PIN numberpad
  → confirm-PIN numberpad, including a mismatched-confirm-then-retry case)
  → the "show me in" app-checks modal (pre-checked "Scheduler") → the
  correct row written to `utzline-users.csv` at the Projects-root level,
  and the name then appearing as a real selector option; picking an
  existing name opens a numberpad naming them, a wrong PIN is
  rejected/retryable without changing the signed-in identity, and the
  correct PIN succeeds; cancelling the numberpad reverts the selector; and
  adding a case-insensitive duplicate name is rejected without touching
  the CSV.

Run all five with `./run_all.sh` from that folder.
