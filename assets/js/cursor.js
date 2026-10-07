/**
 * Cursor ring
 * -----------
 * A ring that trails the real pointer and changes with what is under it. The
 * system cursor is never hidden, so precision, custom pointer sizes and text
 * selection all behave exactly as the visitor expects.
 *
 *   default   a thin ring
 *   link      tinted with the accent over links and buttons
 *   stick     wraps a [data-magnetic] button and moves with it
 *   view      a filled disc reading "View" over project screenshots
 *   drag      the same, reading "Drag", over the hero globe
 *   text      shrinks away over form fields so typing is not crowded
 *
 * Fine pointers only, and off entirely under reduced motion: the trailing
 * follow is itself motion.
 */

(function () {
  "use strict";

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var VIEW = ".project-accordion-media, .shots img, .screenshots-grid img";
  var TEXT = "input, textarea, select, [contenteditable]";
  var LINK = "a, button, [role='button'], label, summary";
  var LABELS = { view: "View", drag: "Drag" };
  var SIZES = { default: 36, link: 52, view: 84, drag: 84, text: 36 };
  var PAD = 10; // how far the ring sits outside a button it wraps

  var ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.dataset.mode = "default";
  var shape = document.createElement("div");
  shape.className = "cursor-shape";
  var label = document.createElement("span");
  label.className = "cursor-label";
  shape.appendChild(label);
  ring.appendChild(shape);
  document.body.appendChild(ring);

  var px = -100;
  var py = -100;
  var x = px;
  var y = py;
  var w = SIZES.default;
  var h = SIZES.default;
  var mode = "default";
  var stickTo = null;
  var raf = 0;
  var seen = false;

  function setMode(next, target) {
    stickTo = next === "stick" ? target : null;
    if (next === mode) return;
    mode = next;
    ring.dataset.mode = next;
    label.textContent = LABELS[next] || "";
    wake();
  }

  function classify(el) {
    if (!el || !el.closest) return setMode("default");
    var hit;
    if (el.closest(TEXT)) return setMode("text");
    if ((hit = el.closest("[data-cursor]"))) return setMode(hit.dataset.cursor in SIZES ? hit.dataset.cursor : "link");
    if (el.closest(VIEW)) return setMode("view");
    if ((hit = el.closest("[data-magnetic]"))) return setMode("stick", hit);
    if (el.closest(LINK)) return setMode("link");
    setMode("default");
  }

  function frame() {
    var tx = px;
    var ty = py;
    var tw = SIZES[mode] || SIZES.default;
    var th = tw;
    var radius = "";

    if (mode === "stick" && stickTo) {
      // Lock onto the button, leaning a little toward the pointer so it still
      // feels attached to the hand.
      var b = stickTo.getBoundingClientRect();
      var cx = b.left + b.width / 2;
      var cy = b.top + b.height / 2;
      tx = cx + (px - cx) * 0.12;
      ty = cy + (py - cy) * 0.12;
      tw = b.width + PAD;
      th = b.height + PAD;
      radius = getComputedStyle(stickTo).borderRadius;
    }

    var k = mode === "stick" ? 0.24 : 0.2;
    x += (tx - x) * k;
    y += (ty - y) * k;
    w += (tw - w) * 0.22;
    h += (th - h) * 0.22;

    ring.style.width = w.toFixed(1) + "px";
    ring.style.height = h.toFixed(1) + "px";
    ring.style.transform = "translate3d(" + (x - w / 2).toFixed(1) + "px," + (y - h / 2).toFixed(1) + "px,0)";
    shape.style.borderRadius = radius;

    var settled =
      Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1 && Math.abs(tw - w) < 0.1 && Math.abs(th - h) < 0.1;
    // A stuck ring follows a button that may itself be moving, so it keeps
    // running until the pointer leaves.
    raf = settled && mode !== "stick" ? 0 : requestAnimationFrame(frame);
  }

  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener(
    "pointermove",
    function (e) {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      px = e.clientX;
      py = e.clientY;
      if (!seen) {
        // Start at the pointer instead of sweeping in from a corner.
        seen = true;
        x = px;
        y = py;
      }
      ring.classList.add("is-visible");
      wake();
    },
    { passive: true },
  );

  document.addEventListener("pointerover", function (e) {
    classify(e.target);
  });

  document.documentElement.addEventListener("pointerleave", function () {
    ring.classList.remove("is-visible");
  });
  window.addEventListener("blur", function () {
    ring.classList.remove("is-visible");
  });

  window.addEventListener("pointerdown", function () {
    ring.classList.add("is-pressed");
  });
  window.addEventListener("pointerup", function () {
    ring.classList.remove("is-pressed");
  });

  // Scrolling moves content under a still pointer, so re-check what is there.
  window.addEventListener(
    "scroll",
    function () {
      if (!seen) return;
      classify(document.elementFromPoint(px, py));
      wake();
    },
    { passive: true },
  );
})();
