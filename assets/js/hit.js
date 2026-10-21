/**
 * Page-view counter for Ryan's Telegram bot (worker/visits.js).
 * One beacon when the page loads (the page, where the visitor came from, any
 * ?ref= or ?friend= in the link) and one with the time spent when it's left.
 * No cookies and nothing stored on the visitor's device, except the opt-out
 * flag below. Skipped for Do Not Track / Global Privacy Control, and on
 * Ryan's own devices once he has opened the site with ?notrack=1.
 */

(function () {
  "use strict";

  if (!navigator.sendBeacon || location.protocol === "file:") return;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl) return;

  const KEY = "ry-notrack";
  const params = new URLSearchParams(location.search);
  try {
    if (params.has("notrack")) localStorage.setItem(KEY, "1");
    if (localStorage.getItem(KEY)) return;
  } catch (e) {
    // Storage blocked: count the visit anyway.
  }

  const id =
    crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const keep = ["ref", "friend", "utm_source"].filter((k) => params.has(k));
  const q = keep.map((k) => `${k}=${encodeURIComponent(params.get(k))}`).join("&");
  const beacon = (data) =>
    navigator.sendBeacon("/api/hit", new Blob([JSON.stringify(data)], { type: "text/plain" }));

  beacon({ id, path: location.pathname, r: document.referrer, q });

  // Time on the page, counted only while it's visible. The running total
  // goes each time the page is hidden; the last one sent is the one kept.
  let shown = document.visibilityState === "visible" ? performance.now() : 0;
  let total = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      shown = performance.now();
      return;
    }
    if (shown) total += performance.now() - shown;
    shown = 0;
    beacon({ id, s: Math.round(total / 1000) });
  });
})();
