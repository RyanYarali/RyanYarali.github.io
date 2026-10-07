/**
 * Route spine
 * -----------
 * A route down the left edge of the page. Each section is a hop on it; the
 * line fills as you scroll, a packet rides its leading edge, and the hop you
 * are in grows a label ("02 · About"). It stretches while you scroll fast.
 *
 * Hops are the page's own sections: on the home page the sections in <main>,
 * on a case study each .project-section, labelled by its heading. The spine
 * is decoration (the nav and the headings carry the same information), so it
 * is aria-hidden and never takes focus, but a mouse can click a hop to jump.
 */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var layout = window.siteLayout || {
    top: function (el) {
      return el.getBoundingClientRect().top + window.scrollY;
    },
  };

  var targets = [].slice.call(document.querySelectorAll("main > header[id], main > section[id]"));
  if (targets.length < 3) targets = [].slice.call(document.querySelectorAll(".project-section"));

  function labelFor(el) {
    if (el.id) {
      var link = document.querySelector('.nav-links a[href="#' + el.id + '"]');
      if (link) return link.textContent.trim();
    }
    var h = el.querySelector("h1, h2");
    return (h ? h.textContent : el.id || "").trim();
  }

  var spine = document.createElement("div");
  spine.className = "spine";
  spine.setAttribute("aria-hidden", "true");
  spine.innerHTML =
    '<span class="spine-track"></span>' +
    '<span class="spine-fill"></span>' +
    '<span class="spine-packet"></span>';
  var fill = spine.querySelector(".spine-fill");
  var packet = spine.querySelector(".spine-packet");

  // Below three hops the marks say nothing a plain progress line doesn't.
  var hops = targets.length >= 3 ? targets : [];
  hops = hops.map(function (el, i) {
    var mark = document.createElement("span");
    mark.className = "spine-hop";
    mark.dataset.cursor = "link";
    var label = document.createElement("span");
    label.className = "spine-label";
    label.textContent = String(i + 1).padStart(2, "0") + " · " + labelFor(el);
    mark.appendChild(label);
    mark.addEventListener("click", function () {
      window.scrollTo({ top: layout.top(el), behavior: reduced ? "auto" : "smooth" });
    });
    spine.appendChild(mark);
    return { el: el, mark: mark, top: 0 };
  });

  document.body.appendChild(spine);

  var max = 1;
  var lastY = window.scrollY;
  var speed = 0;
  var current = -2;

  function measure() {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    hops.forEach(function (h) {
      h.top = layout.top(h.el);
      h.mark.style.top = Math.min(100, (h.top / max) * 100) + "%";
    });
    spine.classList.toggle("is-active", max > 40);
  }

  function update() {
    var y = window.scrollY;
    var k = Math.min(1, Math.max(0, y / max));
    fill.style.transform = "scaleY(" + k.toFixed(4) + ")";

    // The packet stretches along the route with scroll speed.
    var v = Math.min(1, Math.abs(y - lastY) / 40);
    lastY = y;
    speed += (v - speed) * 0.25;
    var stretch = reduced ? 1 : 1 + speed * 3;
    packet.style.transform =
      "translate(-50%, -50%) translateY(" + (k * spine.clientHeight).toFixed(1) + "px) scaleY(" + stretch.toFixed(3) + ")";

    var mid = y + window.innerHeight * 0.4;
    var idx = -1;
    hops.forEach(function (h, i) {
      if (h.top <= mid) idx = i;
    });
    if (idx !== current) {
      current = idx;
      hops.forEach(function (h, i) {
        h.mark.classList.toggle("is-past", i < idx);
        h.mark.classList.toggle("is-current", i === idx);
      });
    }

    // Keep easing the stretch back down after the scroll stops.
    if (speed > 0.01 && !reduced) schedule();
  }

  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }

  window.addEventListener("scroll", schedule, { passive: true });

  var queued = false;
  function remeasure() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      measure();
      update();
    });
  }
  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("load", remeasure);
  new ResizeObserver(remeasure).observe(document.body);

  measure();
  update();
})();
