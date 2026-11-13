/**
 * Page-view counter for Ryan's Telegram bot (worker/visits.js).
 * One beacon when the page loads (the page, where the visitor came from, any
 * ?ref= or ?friend= in the link), one with the time spent and how far down
 * the page the visitor got when it's left, and one each for a résumé
 * download, a link followed off the site and the contact form being started
 * (that it was started, never what was typed).
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
    const tall = document.documentElement.scrollHeight || 1;
    beacon({ id, s: Math.round(total / 1000), d: Math.min(100, Math.round((deepest / tall) * 100)) });
  });

  // How far down the page they got: the lowest point that was on screen.
  let deepest = window.innerHeight;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY + window.innerHeight;
      if (y > deepest) deepest = y;
    },
    { passive: true },
  );

  // Things worth knowing about, once each per page: the résumé downloaded,
  // a link followed off the site (only its host name is sent), the contact
  // form started.
  const told = new Set();
  const event = (e, d) => {
    const key = e + "|" + (d || "");
    if (told.has(key)) return;
    told.add(key);
    beacon({ id, e, d });
  };
  document.addEventListener(
    "click",
    (ev) => {
      const a = ev.target.closest && ev.target.closest("a[href]");
      if (!a) return;
      if (/Ryan-Yarali-Resume\.pdf$/i.test(a.pathname)) return event("resume");
      if (a.protocol === "mailto:") return event("out", "email");
      if (a.protocol === "tel:") return event("out", "phone");
      if (/^https?:$/.test(a.protocol) && a.hostname && a.hostname !== location.hostname)
        event("out", a.hostname.replace(/^www\./, ""));
    },
    true,
  );
  document.addEventListener(
    "input",
    (ev) => {
      if (ev.target.closest && ev.target.closest("#contact-form")) event("form");
    },
    true,
  );
})();
