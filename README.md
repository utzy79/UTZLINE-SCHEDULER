# UTZLINE Scheduler — installable app

**Current version: v11** (its own independent version line, separate from every other app in the family — bump this line, and add a dated entry below, every time a new build ships.)

**v11 (2026-09-23):** Andrew, verbatim: *"Manufacture status needs to be split up into 2 parts. We need a machined and a manufactured tab. All traceable by user name. Machined to have its own app. Called machine schedule. This is where the machinist can mark off a joinery item as complete. It will add their name and date time to the system."* A new `"machined"` stage is inserted into the shared `joinery-status.json` pipeline, between `"in_manufacture"` and `"manufactured"` — written exclusively by a brand-new sibling app, **UTZLINE Machine Schedule**, built in parallel with this round as its own separate codebase (not part of this repo). Scheduler stays strictly read-only against `joinery-status.json`: it never sets `"machined"` itself, it only displays it, same as every other status. `joineryStatusRank`/`joineryStatusLabel`/`joineryStatusIcon` gained a `"machined"` case (⚙️ / "Machined", rank 3), and both the Overall Schedule and Project Schedule screens' status filter dropdowns gained a matching "Machined" option between "In manufacture" and "Ready to dispatch". The status-history hover/tap popup needed no change — it already renders any history entry generically through those same label/icon functions.

Inserting a stage in the *middle* of the pipeline, rather than appending one at the end like every earlier addition, shifts every rank from `"manufactured"` onward up by one (manufactured 3→4, delivered 4→5, installed 5→6). `computeDelayInfo()` has three hard-coded rank-threshold comparisons that were written against the old numbers, and each was re-derived against its real-world meaning rather than blindly bumped: the "has this item reached delivered-or-later" check (`rank >= 4` → `rank >= 5`) and the "is this item not yet installed" delivery-overdue exemption (`rank < 5` → `rank < 6`) both moved, since delivered/installed shifted — but the "is this item not yet in_manufacture" manufacture-start-overdue trigger (`rank < 2`) is **unchanged**, since `in_manufacture`'s own rank is still 2 and the new stage sits after it, not before. Bumping that third one too would have been the actual bug: an item newly sitting at "machined" (rank 3) would then have wrongly tripped "Manufacture start overdue" instead of correctly falling through to "On track"/"Delivery overdue" — the same treatment "manufactured" itself already got.

Verified with a throwaway Node harness computing `computeDelayInfo()` under the old ranks/thresholds vs. the new ones across every pre-existing status (measured/in_manufacture/manufactured/delivered/installed, both pre- and post-delivery scenarios): byte-identical output on both sides, confirming the renumbering is a pure no-op for every status that didn't move. The new "machined" status was checked on its own and correctly does not trip "Manufacture start overdue" while correctly still tripping "Delivery overdue" once past the required date, same as "manufactured" always did. `service-worker.js` cache bumped to `utzline-scheduler-cache-v11`. Full 9-file suite re-run clean, zero regressions.

**v10 (2026-09-23):** Andrew, verbatim: *"Where there is a table it needs to open the full width of the screen. To minimise scrolling."* The Overall Schedule and per-project Schedule screens now stretch to the full viewport width instead of being capped to this app's usual 980px centered content column — a new `.wide-table` CSS class (`max-width: none`) applied to just those two screens. Both tables already force a 900px `min-width` (`.sched-table`) that left little room once the old 980px screen cap, `main`'s own side padding, and the card's own padding were all subtracted — this removes most of the forced horizontal scroll on ordinary desktop/tablet viewports. `service-worker.js` cache bumped to `utzline-scheduler-cache-v10`. Full 9-file suite re-run clean. The identical fix shipped to UTZLINE Projects' own Joinery Register and Rework Register screens the same day — see that app's own README.

**v9 (2026-09-23):** Andrew, on the same status-history popup added in v7: *"these status windows to show days between each process."* A gap marker now sits between each pair of consecutive history rows in the popup, showing the elapsed time between them — "Same day" for under a day, "1 day" (singular) for exactly one, otherwise "N days" — ported verbatim from the identical change made to UTZLINE Projects' own copy of this same popup the same day. No gap appears after the oldest (last) row, and an item with only one history entry shows that row with no gap marker at all.

New regression test `run_status_history_gaps.js` covers three exact, hand-picked gaps (6 hours → "Same day", 8 days exactly, 1 day exactly), confirms a single-entry item shows no gap, and confirms the same gap markers render correctly from the Overall Schedule table too. Full suite re-run clean afterward: 9/9 passing, zero regressions.

**v8 (2026-09-23):** Andrew, verbatim: *"once an item is dispatched, the delay column changes in the scheduler, (this could read Delivered early / Delivered late / Delivered on time (on time would be 2 days either side)."* `computeDelayInfo()` now takes the item's own actual `"delivered"`-stage timestamp (the same one v7's new Actual delivery column already shows) as a 4th argument. Once an item has genuinely reached "Delivered" or later status **and** has that real timestamp on record, the Delay column stops showing the earlier before-the-fact framing ("Delivery overdue" / "On track") and instead compares the real delivered date against the required delivery date: **Delivered late** (more than 2 days after), **Delivered early** (more than 2 days before), or **Delivered on time** (within that 2-day window either side, inclusive on both edges). An item that reached "Installed" without ever passing through a real "delivered" history entry — a genuine path, since signing off in Install ITP doesn't require Delivery ITP's own checklist to have been used first — has no actual delivered timestamp to compare, so it still falls through to the unchanged pre-existing rules. Every other delay scenario (not yet delivered at all) is completely unaffected by this round.

New regression test `run_post_delivery_delay_outcome.js` covers every boundary of the new rule directly against `computeDelayInfo()` (exactly on the required date, exactly 2 days either side — still "on time" since the window is inclusive — and 3 days either side, which tips into late/early), confirms "installed" with a real delivered timestamp gets the same treatment as "delivered" itself, confirms "installed" with **no** delivered timestamp correctly falls back to the old rules, and confirms the pre-delivery scenarios are untouched — then checks the same thing end to end through the real rendered Delay column and pill class in the Project Schedule table from a seeded `joinery-status.json` history. Full suite re-run clean afterward: 8/8 passing, zero regressions.

**v7 (2026-09-23):** Andrew, verbatim: *"scheduler status should have the same tracking on hover like the attached photo from the projects app. and delivery column should have scheduled delivery and actual delivery dates."* Both the Overall Schedule and Project Schedule tables' **Status** column now opens the exact same status-history popup as UTZLINE Projects' own Joinery Register — hover on desktop, tap to toggle on touch (no hover event there) — listing every `joinery-status.json` history entry newest-first, each with its icon/label, formatted date and time, and who made the change. `joineryStatusHistoryFor`/`showStatusHistoryPop`/`hideStatusHistoryPop` are a verbatim port of Projects' own functions (same markup/CSS classes), just reading this app's already-loaded status list instead of re-fetching it — this app is still strictly read-only against `joinery-status.json`, same as always. The **Required delivery** column is relabelled **Scheduled delivery** (same field, same sort key, only the header text changed — it needed to read correctly once a second delivery-related column sits beside it), and a new **Actual delivery** column shows the item's own `"delivered"`-stage history timestamp once it's reached that stage (an em dash otherwise, same convention as every other unset-date cell in this table). Purely a display change — Scheduler still writes nothing but its own `joinery-schedule.json`.

New regression test `run_status_history_and_actual_delivery.js` covers: the renamed/added column headers and cell values; hovering a fully-historied item's status cell shows all four history rows in the right order with the right icon/date/attribution; an item with no `joinery-status.json` record at all shows the popup's empty state rather than erroring; a click/tap toggles the popup open and closed; clicking elsewhere on the page closes it; navigating away (e.g. back to Home) closes it rather than leaving it stuck on screen; and the same popup also works from the Overall Schedule table. Full suite re-run clean afterward: 7/7 passing, zero regressions (two pre-existing tests' hardcoded `<td>` column indices were updated for the new column — `run_schedule_crud_and_delay.js` and `run_overall_and_plan_view.js` — since their row layout, not their behavior, shifted).

**v6 (2026-09-23):** Andrew, verbatim: *"scheduler doesnt utilise the viewer properly. floor plan in not usable. copy the viewer platform we use in the itps for floor plans"* — following straight on from an earlier, briefer report the same day ("floorplan does not load into scheduler."). Investigation found **three** real, independent bugs, all fixed here:
1. `readLevelFile` only ever tried the new flat `Project Saves/Floor Plans/<Project> - <Level>.json` shape, with no fallback to the older per-Level-folder shape (`<Level>/saves/<Level>.utzline.json`) every ITP app already falls back to — so a legacy-shaped project's plan silently never loaded. `readLevelFile` now tries flat first and falls back to a new `readLegacyLevelFile`, matching every ITP app's own dual-path loader.
2. **The bigger of the two, found while fixing #1:** the level-plan picker's own level list (`listExistingLevels`) was *also* built purely from that same flat Floor Plans directory, via the old `listLevelFiles()` — so a fully legacy-shaped project (no "Project Saves" folder at all, which describes most of Andrew's real, not-yet-migrated projects) never even offered a level to open in the first place, meaning fix #1's fallback never got a chance to run for those projects at all. `listExistingLevels` now detects the project's shape once (`isFlatProject`, the same helper UTZLINE Projects and every ITP app already use) and either reads the flat files' own `name` fields or lists the project's own subfolders directly — excluding the same reserved project-wide folders (`itp-install`/`itp-manufacture`/`itp-delivery`/the old `"itp"` name/`"Project Saves"` itself) every sibling app already excludes from its own level list.
3. Even once a plan loaded, its markers could render as unlabeled bare dots: `planRenderMarkers()` only drew a label when a marker's own saved `label.text` field was truthy, but this family's label-text convention (`roomlinkDisplayText`, shared with Site Measure/Viewer/every ITP app) computes the label fresh from `joineryCode`/`roomName` rather than storing it, so plenty of real markers had no stored `label.text` at all. Every roomlink marker's label is now always computed via `roomlinkDisplayText` and drawn with a white halo behind it for legibility over any plan image, matching Install ITP's own `buildPlanMarkerEl`. A marker with `hidden: true` is still excluded entirely, same as before.

New regression test `run_legacy_plan_fallback.js` covers a fully legacy-shaped project end to end: the level shows up in the picker, its plan image and a real computed label render even with no stored `label` field at all, a `hidden: true` marker on the same level is excluded, and clicking the now-visible marker still opens the real Set Schedule dialog for the correct item. Full suite re-run clean afterward: 6/6 passing, zero regressions.

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
   order # / Scheduled delivery / Actual delivery / Manufacture start /
   Lead time / Status / Delay, plus "View on plan" and "Edit schedule"
   actions per row. Filterable by project, status, delay state, and a text
   search (which also matches work order #). Hovering (or tapping, on
   touch) the Status cell opens a popup listing that item's full status
   history — every stage it's passed through, when, and who changed it
   (same interaction as UTZLINE Projects' own Joinery Register, added v7).
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
   - Once an item has genuinely reached "Delivered" or later **and** has a
     real delivered-stage timestamp on record (added v8, per Andrew:
     "once an item is dispatched, the delay column changes"), the flag
     above stops applying and instead compares that actual delivered date
     against the required delivery date: **Delivered late** (more than 2
     days after), **Delivered early** (more than 2 days before), or
     **Delivered on time** (within that 2-day window either side,
     inclusive). An item signed off as "Installed" without ever having a
     real delivered timestamp (Delivery ITP's own checklist is optional,
     not mandatory) still falls back to the rules above.

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
- `run_legacy_plan_fallback.js` — the v6 floor-plan fix: a fully
  legacy-shaped project (no "Project Saves" folder at all) still offers its
  level in the level-plan picker, its plan image loads via the legacy
  fallback, a marker with no stored `label` field at all still renders a
  real computed label (not a bare dot), a `hidden: true` marker is
  excluded, and clicking the visible marker still opens the real Set
  Schedule dialog for the correct item.
- `run_status_history_and_actual_delivery.js` — the v7 status-history
  popup + delivery columns: renamed/added column headers and values,
  hovering a fully-historied item shows all its history rows in the right
  order with the right icon/date/attribution, an untouched item shows the
  popup's empty state, click/tap toggles it, clicking elsewhere or
  navigating away closes it, and the same popup also works from the
  Overall Schedule table.
- `run_post_delivery_delay_outcome.js` — the v8 post-delivery delay
  outcome: every boundary of the rule against `computeDelayInfo()` directly
  (exactly on the required date and exactly 2 days either side both read
  "on time"; 3 days either side tips into late/early), "installed" with a
  real delivered timestamp gets the same treatment as "delivered" itself,
  "installed" with no delivered timestamp correctly falls back to the
  pre-existing rules, pre-delivery scenarios are untouched, and the same
  outcome renders correctly end to end in the real Delay column and pill
  class from a seeded `joinery-status.json` history.
- `run_status_history_gaps.js` — the v9 "days between each process" gap
  markers: three exact, hand-picked gaps (6 hours → "Same day", 8 days
  exactly, 1 day exactly), a single-entry item shows no gap at all, and the
  same gap markers render correctly from the Overall Schedule table too.

Run all nine with `./run_all.sh` from that folder.
