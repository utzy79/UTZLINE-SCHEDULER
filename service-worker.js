// UTZLINE Scheduler offline service worker.
//
// This is a NEW, SEPARATE, standalone app in the UTZLINE family --
// requested directly by Andrew (2026-09-23): "now create a schedular app
// (seperate) that runs off all this info... Do not change any other apps.
// they are all working, just build the standalone scheduler." It sits
// alongside UTZLINE Site Measure (the editor), UTZLINE Viewer (the
// read-only browser), UTZLINE Install ITP, UTZLINE Manufacture ITP, and
// UTZLINE Projects (the master app) -- its own manifest, own icon (blue,
// the one accent hue not already used by a sibling: Site Measure/Viewer
// are orange-red, Install ITP is green, Manufacture ITP is purple,
// Projects is crimson), own taskbar/Start-menu entry, own cache namespace
// ("utzline-scheduler-cache-*"). It is NOT built from source.html -- like
// Install ITP/Manufacture ITP/Projects, it's its own small, purpose-built
// codebase, since it needs a different kind of screen (sortable schedule
// tables + a lightweight read-only plan viewer), not a drawing canvas.
//
// It reads the SAME Projects-root folder every other app in the family
// uses (project -> joinery-items.json / joinery-status.json / Project
// Saves/Floor Plans/<Level>.json), strictly READ-ONLY against every one of
// those existing files -- per Andrew's explicit instruction, this app
// never writes into any file another app owns. The only thing it ever
// writes is its own new file, "joinery-schedule.json", one per project,
// holding this app's own schedule records (required delivery date,
// manufacture lead time in business days, and the computed manufacture
// start date) keyed by level/room/joineryId -- the same identity triple
// joinery-status.json already uses, so it never introduces a new item-
// matching scheme.
//
// Same cache-first app shell strategy as every other app in the family: a
// small, fixed set of local files, no CDN calls once installed (no pdf.js
// import either -- this app never imports floor plans itself, only reads
// the ones Site Measure/Projects already saved). Bump CACHE_NAME whenever
// index.html or any vendored asset changes, so installed copies pick up
// the update instead of serving stale files forever.
//
// (v1, 2026-09-23: first release. Projects-root folder picker/reconnect
// (same convention as Projects/Viewer), a cross-project sortable Overall
// Schedule table and a per-project Schedule table -- both listing every
// joinery item from joinery-items.json, enriched with its current status
// (joinery-status.json, read-only) and its schedule (this app's own new
// joinery-schedule.json) -- a read-only pan/zoom plan viewer reusing the
// family's own SVG marker-rendering code, right-click (or long-press, on
// touch) a marker to set/edit its Required Delivery Date and Manufacture
// Lead Time (business days, default 30), which computes and saves the
// Manufacture Start Date (delivery date minus lead time, skipping
// Saturdays/Sundays -- no public-holiday calendar exists anywhere in this
// ecosystem yet, so this is a disclosed, known limitation, consistent with
// how every other date-adjacent feature here has handled the same gap),
// and delay flags (Delivery overdue / Manufacture start overdue / On
// track / No schedule set) computed against today's date and the item's
// real status rank. Also added, as a disclosed convenience beyond
// Andrew's literal spec: an "Edit schedule" button directly on each table
// row (so a schedule can be set without needing to first find and
// right-click the marker on the plan), and a "Clear schedule" option in
// the same dialog. Does NOT touch source.html, Install ITP, Manufacture
// ITP, or Projects in any way.)
//
// (v3, 2026-09-23: Andrew, verbatim: "scheduler floor plan needs the zoom
// function, reset to centre, zoom on scroll functionality, mouse click on
// plan to change the dates. currenty only has pan." Added a zoom control
// group (zoom in / zoom out / Reset view) to the Level Plan topbar --
// scroll-wheel zoom and pinch-zoom were already wired up (copied from
// UTZLINE Projects' own plan canvas along with everything else there) but
// had no visible affordance and no way to reset drift back to a known-good
// view; "Reset view" re-runs the same fit-to-screen-centred transform the
// plan already opens with. Also: a plain tap/click on a marker now opens
// the real Set Schedule dialog directly (previously it only showed a
// read-only summary toast, a disclosed "accidental-tap safety" design
// choice Andrew's request above explicitly overrides) -- right-click and
// long-press are unchanged, now just a redundant second path to the same
// dialog. Does NOT touch source.html, Install ITP, Manufacture ITP, or
// Projects in any way.)
//
// (v5, 2026-09-23: Andrew, verbatim: "implement the username as per the
// delivery itp throughout the entire system, but instead of it opening a
// popup, the button is the selector, when you pick a name it opens a
// numberpad to input the pin (4 digit pin)." This app had no identity
// feature of its own before this -- added from scratch, copied verbatim
// from UTZLINE Delivery ITP's own reference implementation of this exact
// pattern. A new <select id="identitySelector"> on the Home screen IS the
// button: its dropdown lists every known name plus "+ Add a new name...",
// and choosing one opens a real on-screen numberpad (not a popup) to
// verify its 4-digit PIN; adding a brand-new name still types the name as
// text first. Reads/writes the same "utzline-identity" IndexedDB and the
// same <ProjectsRoot>/utzline-users.csv registry every sibling UTZLINE app
// now shares. Also, as a small disclosed enhancement, each
// joinery-schedule.json record now stamps a read-only `setBy` field with
// whoever was signed in when Save was pressed. Does NOT touch source.html,
// Install ITP, Manufacture ITP, Delivery ITP, or Projects in any way.)
//
// (v7, 2026-09-23: Andrew, verbatim: "scheduler status should have the
// same tracking on hover like the attached photo from the projects app.
// and delivery column should have scheduled delivery and actual delivery
// dates." The Status column, in both the Overall and Project Schedule
// tables, now hovers/taps open the exact same status-history popup as
// UTZLINE Projects' own Joinery Register -- ported verbatim from that
// app's own showStatusHistoryPop/joineryStatusHistoryFor. The former
// "Required delivery" column is relabelled "Scheduled delivery" (same
// field, unchanged), and a new "Actual delivery" column beside it shows
// the item's own "delivered"-stage joinery-status.json history timestamp
// once it's reached that stage. See index.html's own top-of-file comment
// for the full design note.)
//
// (v8, 2026-09-23: Andrew, verbatim: "once an item is dispatched, the
// delay column changes in the scheduler, (this could read Delivered
// early / Delivered late / Delivered on time (on time would be 2 days
// either side)." computeDelayInfo now takes the item's own actual
// "delivered"-stage timestamp (added in v7's Actual delivery column) as a
// 4th argument: once an item has genuinely reached "delivered" or later
// AND has that real timestamp, the Delay column stops showing the
// before-the-fact "Delivery overdue"/"On track" framing and instead
// compares the real delivered date against the required delivery date --
// "Delivered late" (more than 2 days after), "Delivered early" (more than
// 2 days before), or "Delivered on time" (within that window, inclusive).
// An item that reached "installed" without ever having a "delivered"
// history entry (a real, if less common, path -- Delivery ITP's own
// checklist is optional, not mandatory) still falls through to the
// unchanged pre-existing rules. See index.html's own top-of-file comment
// for the full design note.)
//
// (v9, 2026-09-23: Andrew, on the same status-history popup: "these status
// windows to show days between each process." A gap marker now sits
// between each pair of consecutive rows showing the elapsed time between
// them -- "Same day" for anything under 1 day, "1 day" (singular) for
// exactly one, otherwise "N days" -- ported verbatim from the identical
// change made to UTZLINE Projects' own copy of this popup the same day. No
// gap after the oldest (last) row, and none at all for an item with only
// one history entry.)
//
// (v10, 2026-09-23: Andrew, verbatim: "Where there is a table it needs to
// open the full width of the screen. To minimise scrolling." The Overall
// Schedule and per-project Schedule screens now stretch to the full
// viewport width instead of being capped to this app's usual 980px
// centered content column -- a new .wide-table CSS class (max-width:none)
// on just those two screens. Both tables already force a 900px min-width
// (.sched-table) that the old 980px cap left little room for once main's
// own side padding and the card's own padding were subtracted, so this
// removes most of the forced horizontal scroll on ordinary desktop/tablet
// viewports. The identical fix shipped to UTZLINE Projects' own Register/
// Rework Register screens the same day.)
var ICON_VERSION = "v1";
var CACHE_NAME = "utzline-scheduler-cache-v10";

var PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json?v=" + ICON_VERSION,
  "./icons/icon-192.png?v=" + ICON_VERSION,
  "./icons/icon-512.png?v=" + ICON_VERSION,
  "./icons/icon-192-maskable.png?v=" + ICON_VERSION,
  "./icons/icon-512-maskable.png?v=" + ICON_VERSION
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_NAME; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function(cached){
      var networkFetch = fetch(event.request).then(function(response){
        if (response && response.status === 200){
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        }
        return response;
      }).catch(function(){
        return cached;
      });
      // Cache-first for instant offline loads; refresh the cache in the
      // background whenever the network is available.
      return cached || networkFetch;
    })
  );
});
