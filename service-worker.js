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
var ICON_VERSION = "v1";
var CACHE_NAME = "utzline-scheduler-cache-v2";

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
