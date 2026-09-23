# UTZLINE Scheduler — installable app

**Current version: v2** (its own independent version line, separate from every other app in the family — bump this line every time a new build ships.)

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
  manufactureStartDate, updatedAt }`, matched to a joinery item by the same
  `(level, room, joineryId)` triple `joinery-status.json` already uses.

Nothing about how a project is organised changes for Site Measure, Viewer,
Install ITP, Manufacture ITP, or Projects to keep working — none of them
know or care that this new file exists.

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
   uses). **Right-click a marker** (or **press and hold**, on a touch
   device — there's no native right-click there) to open the **Set
   Schedule** dialog for that item: Required Delivery Date and Manufacture
   Lead Time (business days, defaults to 30), with the computed
   Manufacture Start Date shown live as you type, plus a "Clear schedule"
   option. A plain tap/click on a marker instead shows a quick, read-only
   status/schedule summary — it never opens the editing dialog, so a stray
   tap can't start an edit by accident.
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
  on the Overall Schedule screen, unset-dates-always-sort-last, and the
  plan view's tap-vs-right-click/long-press distinction.

Run both with `./run_all.sh` from that folder.
