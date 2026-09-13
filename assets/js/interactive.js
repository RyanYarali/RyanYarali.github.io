/**
 * Interactive layer
 * -----------------
 * Ambient scroll trace, hero counters, the project accordion, the skills
 * filter, and magnetic buttons.
 *
 * Every effect here is driven by scroll or by a tap, never by cursor position
 * alone, so a phone gets the same site a desktop does. The one exception is the
 * magnetic button, which is purely additive and is gated behind a fine pointer.
 */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ==================== Ambient trace ====================

  function initTrace() {
    var cv = document.getElementById("site-trace");
    if (!cv || !cv.getContext) return;

    var ctx = cv.getContext("2d");
    var W = 0;
    var H = 0;
    var amp = 0;
    var phase = 0;
    var lastY = window.scrollY;
    var vel = 0;

    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      cv.style.width = W + "px";
      cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function accent() {
      return getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent")
        .trim();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var col = accent();
      var mid = H * 0.5;
      ctx.lineWidth = 1.1;

      for (var layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.globalAlpha = [0.24, 0.12, 0.06][layer];
        ctx.strokeStyle = col;
        for (var x = 0; x <= W; x += 6) {
          var k = x / W;
          var env = Math.sin(k * Math.PI); // taper to nothing at both edges
          var y =
            mid +
            Math.sin(k * 7 + phase + layer * 1.1) * amp * env * (1 - layer * 0.2) +
            Math.sin(k * 17 - phase * 1.6 + layer) * amp * 0.32 * env;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame() {
      var y = window.scrollY;
      vel = Math.min(1, Math.abs(y - lastY) / 34);
      lastY = y;
      var target = 6 + vel * 110;
      amp += (target - amp) * 0.08;
      phase += 0.011 + vel * 0.075;
      draw();
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", size, { passive: true });
    size();

    if (reduced) {
      amp = 9;
      draw();
    } else {
      requestAnimationFrame(frame);
    }
  }

  // ==================== Scroll progress ====================
  // A hairline across the very top: the fill is how far down the page you are,
  // and the leading edge brightens with scroll speed, so it reads as the same
  // instrument as the ambient trace rather than a second unrelated widget.

  function initProgress() {
    var rail = document.createElement("div");
    rail.className = "scroll-progress";
    rail.setAttribute("aria-hidden", "true");
    rail.innerHTML = '<span class="scroll-progress-fill"></span>';
    document.body.appendChild(rail);

    var fill = rail.firstChild;
    var lastY = window.scrollY;
    var glow = 0;
    var ticking = false;

    function update() {
      ticking = false;

      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var k = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      fill.style.transform = "scaleX(" + k + ")";
      rail.style.setProperty("--progress", k.toFixed(4));

      var speed = Math.min(1, Math.abs(y - lastY) / 30);
      lastY = y;
      glow += (speed - glow) * 0.3;
      rail.style.setProperty("--progress-glow", glow.toFixed(3));

      // Hide the rail at the very top: there is nothing to report yet.
      rail.classList.toggle("is-active", k > 0.005);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true },
    );
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  // ==================== Hero counters ====================

  function initCounters() {
    var tiles = document.querySelectorAll("[data-count]");
    if (!tiles.length) return;

    if (reduced || !("IntersectionObserver" in window)) {
      [].forEach.call(tiles, function (el) {
        el.textContent = el.dataset.count + (el.dataset.suffix || "");
      });
      return;
    }

    [].forEach.call(tiles, function (el) {
      var done = false;
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting || done) return;
            done = true;

            var end = Number(el.dataset.count);
            var suffix = el.dataset.suffix || "";
            var start = performance.now();
            var dur = 1000;

            (function run(now) {
              var k = Math.min(1, (now - start) / dur);
              var eased = 1 - Math.pow(1 - k, 3);
              el.textContent = Math.round(end * eased) + suffix;
              if (k < 1) requestAnimationFrame(run);
              else {
                el.textContent = end + suffix;
                io.disconnect();
              }
            })(performance.now());
          });
        },
        { threshold: 0.6 },
      );
      io.observe(el);
    });
  }

  // ==================== Project accordion ====================

  function initAccordion() {
    var items = document.querySelectorAll(".project-accordion-item");
    if (!items.length) return;

    function close(item) {
      var panel = item.querySelector(".project-accordion-panel");
      var head = item.querySelector(".project-accordion-head");
      if (!panel) return;

      item.classList.remove("is-open");
      head.setAttribute("aria-expanded", "false");

      if (reduced) {
        panel.style.height = "0px";
        return;
      }
      panel.style.height = panel.scrollHeight + "px";
      requestAnimationFrame(function () {
        panel.style.transition = "height 460ms cubic-bezier(.19,1,.22,1)";
        panel.style.height = "0px";
      });
    }

    function open(item) {
      var panel = item.querySelector(".project-accordion-panel");
      var head = item.querySelector(".project-accordion-head");
      if (!panel) return;

      item.classList.add("is-open");
      head.setAttribute("aria-expanded", "true");

      // Canvas art is painted only once a row is actually opened.
      var art = panel.querySelector("canvas[data-art]");
      if (art && !art.dataset.painted) {
        art.dataset.painted = "1";
        paintArt(art);
      }

      if (reduced) {
        panel.style.height = "auto";
        return;
      }
      panel.style.transition = "height 460ms cubic-bezier(.19,1,.22,1)";
      panel.style.height = panel.scrollHeight + "px";
      panel.addEventListener("transitionend", function once(e) {
        if (e.propertyName !== "height") return;
        panel.removeEventListener("transitionend", once);
        if (item.classList.contains("is-open")) panel.style.height = "auto";
      });
    }

    [].forEach.call(items, function (item) {
      var head = item.querySelector(".project-accordion-head");
      if (!head) return;

      head.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");

        // One row at a time keeps the section short, which is the point.
        [].forEach.call(items, function (other) {
          if (other !== item && other.classList.contains("is-open")) close(other);
        });

        if (isOpen) close(item);
        else open(item);
      });
    });

    // A panel left at height:auto has to be re-measured when the layout reflows.
    var resizeTimer;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          [].forEach.call(items, function (item) {
            if (!item.classList.contains("is-open")) return;
            var panel = item.querySelector(".project-accordion-panel");
            if (panel) panel.style.height = "auto";
          });
        }, 150);
      },
      { passive: true },
    );

    // Open the first row so the section is never a stack of closed bars.
    if (items[0]) open(items[0]);
  }

  // ==================== Generative art ====================
  // Projects without a screenshot get a deterministic drawing seeded by their
  // own key, coloured from the live palette, so it changes with the accent.

  function paintArt(cv) {
    var w = cv.clientWidth;
    var h = cv.clientHeight;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = w * dpr;
    cv.height = h * dpr;

    var ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var styles = getComputedStyle(document.documentElement);
    var accent = styles.getPropertyValue("--color-accent").trim();
    var surface = styles.getPropertyValue("--color-surface").trim();
    var key = cv.dataset.art || "project";
    var seed = 0;
    for (var i = 0; i < key.length; i++) seed += key.charCodeAt(i);

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = accent;
    for (var b = 0; b < 24; b++) {
      var p = ((seed * (b + 7)) % 211) / 211;
      var q = ((seed * (b + 2)) % 71) / 71;
      ctx.fillRect(w * p, h * (0.12 + q * 0.6), w * (0.05 + p * 0.16), h * 0.055);
    }

    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (var x = 0; x <= w; x += 5) {
      var y = h * 0.5 + Math.sin((x / w) * 6 + seed) * h * 0.18;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function repaintArt() {
    [].forEach.call(document.querySelectorAll("canvas[data-art]"), function (cv) {
      if (cv.dataset.painted) paintArt(cv);
    });
  }

  // ==================== Skills filter ====================

  function initSkillsFilter() {
    var chips = document.querySelectorAll(".skills-filter-chip");
    var rows = document.querySelectorAll(".skills-row");
    if (!chips.length || !rows.length) return;

    [].forEach.call(chips, function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.dataset.filter;

        [].forEach.call(chips, function (other) {
          other.setAttribute("aria-pressed", String(other === chip));
        });

        [].forEach.call(rows, function (row, i) {
          var match = key === "all" || row.dataset.skillGroup === key;
          row.classList.toggle("is-dimmed", !match);
          row.classList.toggle("is-match", match && key !== "all");

          if (!reduced) {
            row.style.transitionDelay = i * 22 + "ms";
            setTimeout(function () {
              row.style.transitionDelay = "";
            }, 600);
          }
        });
      });
    });
  }

  // ==================== Magnetic buttons ====================

  function initMagnetic() {
    if (!fine || reduced) return;

    [].forEach.call(document.querySelectorAll("[data-magnetic]"), function (el) {
      el.addEventListener("pointermove", function (e) {
        var b = el.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) * 0.2;
        var dy = (e.clientY - (b.top + b.height / 2)) * 0.3;
        el.style.transform = "translate(" + dx + "px," + dy + "px)";
      });

      el.addEventListener("pointerleave", function () {
        el.style.transition = "transform 520ms cubic-bezier(.19,1,.22,1)";
        el.style.transform = "translate(0,0)";
        setTimeout(function () {
          el.style.transition = "";
        }, 540);
      });
    });
  }

  // ==================== Boot ====================

  function boot() {
    initTrace();
    initProgress();
    initCounters();
    initAccordion();
    initSkillsFilter();
    initMagnetic();

    // The art is drawn from palette tokens, so it has to be redrawn whenever
    // the palette or the theme changes.
    new MutationObserver(repaintArt).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-palette"],
    });
    window.addEventListener("resize", repaintArt, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.repaintProjectArt = repaintArt;
})();
