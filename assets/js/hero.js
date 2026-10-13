/**
 * Hero
 * ----
 * The first-visit intro, the hero entrance, and the lazy load of the globe.
 *
 * The inline script in <head> decides, before first paint, whether any of
 * this plays: it adds `hero-anim` when motion is allowed, and `intro-pending`
 * too on a first visit. This file only ever acts on those classes, and the CSS
 * in motion.css shows everything anyway if it never runs.
 *
 * The intro is the TCP handshake that opened the connection to this page,
 * printed the way a packet capture would show it. The figure on the last line
 * is the real connection time from the Navigation Timing API, and it is left
 * off when the browser reused a connection and there is nothing to report.
 */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
  var INTRO_KEY = "ry-intro-seen";

  // ==================== Hero entrance ====================

  var heroPlayed = false;

  function playHero() {
    if (heroPlayed || !html.classList.contains("hero-anim")) return;
    heroPlayed = true;

    var title = document.querySelector(".hero-title");
    var parts = document.querySelectorAll(".hero .hero-reveal");
    var animations = [];

    if (title) {
      animations.push(
        title.animate(
          [
            { opacity: 0, transform: "translateY(18px)", filter: "blur(10px)" },
            { opacity: 1, transform: "none", filter: "blur(0)" },
          ],
          { duration: 900, easing: EASE, fill: "both" },
        ),
      );
    }

    [].forEach.call(parts, function (el, i) {
      animations.push(
        el.animate(
          [
            { opacity: 0, transform: "translateY(16px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 800, delay: 260 + i * 90, easing: EASE, fill: "both" },
        ),
      );
    });

    // Once everything has landed, hand the elements back to the stylesheet so
    // nothing is left pinned by a finished animation.
    Promise.all(
      animations.map(function (a) {
        return a.finished;
      }),
    ).then(function () {
      html.classList.remove("hero-anim");
      animations.forEach(function (a) {
        a.cancel();
      });
    });
  }

  // ==================== Intro ====================

  function connectTime() {
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      var ms = nav ? Math.round(nav.connectEnd - nav.connectStart) : 0;
      return ms > 0 ? ms : 0;
    } catch (e) {
      return 0;
    }
  }

  function playIntro() {
    var overlay = document.getElementById("intro");
    var log = document.getElementById("intro-log");
    if (!overlay || !log) {
      html.classList.remove("intro-pending");
      playHero();
      return;
    }

    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch (e) {}

    // On a touch screen there is no key to press.
    var hint = overlay.querySelector(".intro-hint");
    var touch = window.matchMedia("(hover: none)").matches || navigator.maxTouchPoints > 0;
    if (hint && touch && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      hint.textContent = "Tap anywhere to skip";
    }

    var ms = connectTime();
    var lines = [
      '<span class="dir">→</span> SYN',
      '<span class="dir">←</span> SYN, ACK',
      '<span class="dir">→</span> ACK',
      '<span class="ok">✓ connected to ryanyarali.com' + (ms ? " in " + ms + " ms" : "") + "</span>",
    ];
    var timers = [];
    var finished = false;

    lines.forEach(function (line, i) {
      timers.push(
        setTimeout(function () {
          var row = document.createElement("div");
          row.innerHTML = line;
          log.appendChild(row);
          row.animate(
            [
              { opacity: 0, transform: "translateX(-8px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 260, easing: EASE },
          );
        }, i * 140),
      );
    });

    function finish(fast) {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      removeSkip();
      playHero();
      var exit = overlay.animate(
        fast
          ? [{ opacity: 1 }, { opacity: 0 }]
          : [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
        {
          duration: fast ? 220 : 480,
          easing: "cubic-bezier(0.77, 0, 0.18, 1)",
          fill: "forwards",
        },
      );
      exit.finished.then(function () {
        html.classList.remove("intro-pending");
        exit.cancel();
      });
    }

    // Any input at all skips straight to the page.
    var skipEvents = ["pointerdown", "keydown", "wheel", "touchstart"];
    function skip() {
      finish(true);
    }
    function removeSkip() {
      skipEvents.forEach(function (type) {
        window.removeEventListener(type, skip, true);
      });
    }
    skipEvents.forEach(function (type) {
      window.addEventListener(type, skip, { capture: true, passive: true });
    });

    timers.push(
      setTimeout(function () {
        finish(false);
      }, 720),
    );
  }

  // ==================== Globe ====================
  // three.js is about 190 KB compressed, so it waits until the page has
  // finished loading and the browser has a quiet moment. Data Saver skips it
  // and keeps the poster.

  function loadGlobe() {
    var host = document.getElementById("hero-globe");
    if (!host) return;
    var conn = navigator.connection;
    if (conn && conn.saveData) return;

    function go() {
      import("./hero-globe.js?v=20261032")
        .then(function (mod) {
          mod.mount(host, { reduced: reduced });
        })
        .catch(function () {
          // The poster is a complete backdrop on its own; nothing to recover.
        });
    }

    function idle() {
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 1200 });
      else setTimeout(go, 200);
    }

    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  }

  // ==================== Boot ====================

  if (html.classList.contains("intro-pending")) playIntro();
  else playHero();

  loadGlobe();
})();
