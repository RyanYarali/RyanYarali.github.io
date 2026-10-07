/**
 * Story
 * -----
 * The home page's scroll choreography:
 *
 *   stacking    each section slides up over the one before it, which sinks
 *               back and fades toward the page colour, like turning pages
 *   word fill   the About lede lights up word by word as it is read
 *   tilt card   the portrait leans toward the pointer, with a light glare
 *   gallery     the projects hold the screen while the cards slide sideways
 *   marquee     the skills drift past in two rows above the list
 *
 * Everything here is progressive. Without this script, or under reduced
 * motion, the page is an ordinary scrolling document with the same content.
 *
 * Progress is computed from scroll position and each element's place in the
 * flow, never by reading layout on every frame: a stuck, scaled section
 * reports a moving box, and the arithmetic does not care.
 */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var main = document.getElementById("main");
  if (!main) return;

  var layout = window.siteLayout || {
    top: function (el) {
      return el.getBoundingClientRect().top + window.scrollY;
    },
  };

  var pages = [].slice.call(main.children).filter(function (el) {
    return el.matches(".hero, .section");
  });

  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };

  // Offset of an element from the top of an ancestor, through offsetParents.
  function offsetWithin(el, ancestor) {
    var y = 0;
    while (el && el !== ancestor) {
      y += el.offsetTop;
      el = el.offsetParent;
    }
    return y;
  }

  // Everything scroll-driven reads from one measurement pass and one
  // rAF-throttled scroll handler.
  var deepLink = null;
  var measurers = [];
  var updaters = [];
  var vh = window.innerHeight;

  function measureAll() {
    vh = window.innerHeight;
    measurers.forEach(function (fn) {
      fn();
    });
    updateAll();
  }

  function updateAll() {
    var y = window.scrollY;
    updaters.forEach(function (fn) {
      fn(y);
    });
  }

  // ==================== Work gallery ====================
  // On a wide screen with motion allowed, the projects section holds the
  // screen while vertical scroll slides the cards sideways. Everywhere else
  // the same markup is a native swipe carousel, which only needs its counter
  // and progress bar kept in step.

  function initGallery() {
    var work = document.getElementById("work");
    var section = work && work.closest(".section");
    if (!work || !section) return;

    var viewport = work.querySelector(".work-viewport");
    var track = work.querySelector(".work-track");
    var cards = [].slice.call(track.children);
    var media = cards.map(function (c) {
      return c.querySelector(".work-media img, .work-media canvas");
    });
    var count = work.querySelector(".work-count-now");
    var bar = work.querySelector(".work-progress span");
    var n = cards.length;
    var shownIndex = -1;

    // Cards without a screenshot get the generated figure from interactive.js.
    [].forEach.call(work.querySelectorAll("canvas[data-art]"), function (cv) {
      cv.dataset.painted = "1";
    });
    function paintArt() {
      if (window.repaintProjectArt) window.repaintProjectArt();
    }

    // The bar follows overall progress; the counter names the card that is
    // actually nearest the middle of the screen, when the caller knows it.
    function setProgress(p, nearest) {
      bar.style.transform = "scaleX(" + (1 / n + (1 - 1 / n) * p).toFixed(4) + ")";
      var i = nearest != null ? nearest : Math.min(n - 1, Math.round(p * (n - 1)));
      if (i !== shownIndex) {
        shownIndex = i;
        count.textContent = String(i + 1).padStart(2, "0");
      }
    }

    // Pinned only where a card fits on screen: a phone in landscape or a
    // zoomed-in laptop gets the carousel instead of clipped cards.
    var wide = window.matchMedia("(min-width: 860px) and (min-height: 700px)");
    var pinned = false;
    var travel = 0;
    var top = 0;
    var height = 0;
    var pinW = 0;
    var x = 0;

    function setPinned(on) {
      pinned = on;
      html.classList.toggle("work-pinned", on);
      cards.forEach(function (c) {
        c.style.transform = "";
        c.style.opacity = "";
      });
      var pin = work.querySelector(".work-pin");
      // The pin is the measured screen height rather than 100vh, which on
      // iOS includes the toolbar and disagrees with innerHeight.
      if (pin) pin.style.height = on ? vh + "px" : "";
      if (!on) {
        work.style.height = "";
        track.style.transform = "";
        media.forEach(function (m) {
          if (m) m.style.transform = "";
        });
      }
    }

    measurers.push(function () {
      setPinned(!reduced && wide.matches);
      if (pinned) {
        pinW = work.clientWidth;
        travel = Math.max(0, track.scrollWidth - pinW);
        // Three screens of scroll per four of sideways travel: long enough
        // to read each card, short enough not to feel like a detour.
        height = vh + travel * 0.75;
        work.style.height = height + "px";
        top = layout.top(section) + offsetWithin(work, section);
      }
      paintArt();
      flow();
    });

    updaters.push(function (y) {
      if (!pinned) return;
      var p = travel ? clamp((y - top) / (height - vh), 0, 1) : 0;
      x = -p * travel;
      track.style.transform = "translate3d(" + x.toFixed(1) + "px,0,0)";
      // Each screenshot drifts against its frame, a little slower than the
      // card, by how far the card is from the middle of the screen.
      var nearest = 0;
      var best = Infinity;
      for (var i = 0; i < n; i++) {
        var c = cards[i];
        var off = c.offsetLeft + c.offsetWidth / 2 + x - pinW / 2;
        if (Math.abs(off) < best) {
          best = Math.abs(off);
          nearest = i;
        }
        if (media[i]) media[i].style.transform = "translate3d(" + (off * -0.05).toFixed(1) + "px,0,0)";
      }
      setProgress(p, nearest);
      // The route (route.js) runs its sideways stretch from this.
      work.style.setProperty("--work-p", p.toFixed(4));
    });

    // Carousel mode: follow the native sideways scroll. Cards away from the
    // middle sink back and dim a little, so the one in front reads as the
    // one being looked at, and each screenshot drifts against its frame.
    function flow() {
      if (pinned) return;
      var max = viewport.scrollWidth - viewport.clientWidth;
      var mid = viewport.scrollLeft + viewport.clientWidth / 2;
      var nearest = 0;
      var best = Infinity;
      for (var i = 0; i < n; i++) {
        var c = cards[i];
        var off = c.offsetLeft + c.offsetWidth / 2 - mid;
        if (Math.abs(off) < best) {
          best = Math.abs(off);
          nearest = i;
        }
        if (reduced) continue;
        var d = clamp(Math.abs(off) / c.offsetWidth, 0, 1);
        c.style.transform = "scale(" + (1 - d * 0.08).toFixed(4) + ")";
        c.style.opacity = (1 - d * 0.45).toFixed(3);
        if (media[i]) media[i].style.transform = "translate3d(" + (off * -0.06).toFixed(1) + "px,0,0)";
      }
      setProgress(max > 0 ? viewport.scrollLeft / max : 0, nearest);
    }
    var flowQueued = false;
    viewport.addEventListener(
      "scroll",
      function () {
        if (flowQueued) return;
        flowQueued = true;
        requestAnimationFrame(function () {
          flowQueued = false;
          flow();
        });
      },
      { passive: true },
    );

    // Pinned mode: a keyboard user tabbing to a card that is off to the side
    // gets the page scrolled to the point where that card is in view.
    track.addEventListener("focusin", function (e) {
      if (!pinned || !travel) return;
      var card = e.target.closest(".work-card");
      if (!card) return;
      var edge = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      var p = clamp((card.offsetLeft - edge) / travel, 0, 1);
      window.scrollTo({ top: top + p * (height - vh), behavior: "instant" });
    });

    wide.addEventListener("change", function () {
      measureAll();
    });
  }

  // ==================== Stacking ====================

  function initStack() {
    if (reduced || pages.length < 2) return;
    html.classList.add("is-stacked");

    var tops = [];
    var stick = [];
    var state = pages.map(function () {
      return { cover: -1, covered: false };
    });

    measurers.push(function () {
      var top = layout.top(main);
      tops = [];
      stick = [];
      pages.forEach(function (p) {
        var h = p.offsetHeight;
        tops.push(top);
        top += h;
        // A section taller than the screen scrolls through until its bottom
        // meets the bottom of the viewport, then holds there to be covered.
        var s = Math.min(0, vh - h);
        stick.push(s);
        p.style.setProperty("--stick-top", s + "px");
        // Sink toward the middle of the part that is actually on screen.
        p.style.transformOrigin = "50% " + (h > vh ? h - vh / 2 : h / 2) + "px";
      });
    });

    updaters.push(function (y) {
      for (var i = 0; i < pages.length - 1; i++) {
        // Where the next section sits on screen: in the flow until it sticks.
        var nextTop = Math.max(tops[i + 1] - y, stick[i + 1]);
        var cover = Math.round(clamp((vh - nextTop) / vh, 0, 1) * 1000) / 1000;
        var s = state[i];

        if (cover !== s.cover) {
          s.cover = cover;
          pages[i].style.setProperty("--cover", cover);
          pages[i].classList.toggle("is-covering", cover > 0 && cover < 1);
        }

        // The hero globe hears when the hero is fully covered, so it can
        // stop rendering behind the page.
        var covered = cover >= 1;
        if (covered !== s.covered) {
          s.covered = covered;
          pages[i].classList.toggle("is-covered", covered);
          document.dispatchEvent(
            new CustomEvent("stack:covered", { detail: { el: pages[i], covered: covered } }),
          );
        }
      }
    });

    // In-page links to a stacked section: the browser would scroll to where
    // the section is stuck, so scroll to where it sits in the flow instead.
    function scrollToSection(target, smooth) {
      window.scrollTo({ top: layout.top(target), behavior: smooth ? "smooth" : "instant" });
    }

    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = decodeURIComponent(a.getAttribute("href").slice(1));
      var target = id && document.getElementById(id);
      if (!target || pages.indexOf(target) === -1) return;
      e.preventDefault();
      history.pushState(null, "", "#" + id);
      scrollToSection(target, true);
      // Move focus with the view, so keyboard and screen reader users land
      // in the section they asked for.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });

    // A deep link such as /#projects: correct the browser's initial jump.
    // A deep link such as /#skills jumps straight there once the page is
    // measured (not after every image has loaded), and again on load only if
    // late images moved the section.
    deepLink = function () {
      var id = decodeURIComponent(location.hash.slice(1));
      var target = id && document.getElementById(id);
      if (!target || pages.indexOf(target) < 1) return;
      var want = layout.top(target);
      if (Math.abs(window.scrollY - want) > 4) scrollToSection(target, false);
    };
    window.addEventListener("load", function () {
      if (deepLink) deepLink();
    });

    // Keyboard focus that lands inside a section another one has slid over
    // brings it back into view instead of leaving it hidden underneath.
    document.addEventListener("focusin", function (e) {
      var page = pages.find(function (p) {
        return p.contains(e.target);
      });
      if (!page) return;
      var i = pages.indexOf(page);
      if (!state[i] || state[i].cover <= 0.02) return;
      var y = layout.top(page) + offsetWithin(e.target, page) - vh / 3;
      window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
    });
  }

  // ==================== Word fill ====================

  function initLede() {
    var lede = document.querySelector(".about-lede");
    var section = lede && lede.closest(".section");
    if (!lede || !section || reduced) return;

    // Wrap each word in a span. The text itself is untouched, so it reads
    // the same to a screen reader and to anything that copies it.
    (function wrap(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) return wrap(n);
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var w = document.createElement("span");
            w.className = "w";
            w.textContent = part;
            frag.appendChild(w);
          }
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(lede);

    var words = [].slice.call(lede.querySelectorAll(".w"));
    var shown = words.map(function () {
      return -1;
    });
    var n = words.length;
    var start = 0;
    var end = 1;
    lede.classList.add("is-filling");

    measurers.push(function () {
      var top = layout.top(section) + offsetWithin(lede, section);
      start = top - vh * 0.85;
      end = top + lede.offsetHeight - vh * 0.45;
    });

    updaters.push(function (y) {
      var p = clamp((y - start) / (end - start), 0, 1);
      for (var i = 0; i < n; i++) {
        // The floor stays readable (about 4:1 on the section ground); the
        // fill is emphasis, not a gate on reading.
        var o = Math.round((0.5 + 0.5 * clamp(p * (n + 4) - i, 0, 1)) * 100) / 100;
        if (o !== shown[i]) {
          shown[i] = o;
          words[i].style.opacity = o;
        }
      }
    });
  }

  // ==================== Tilt card ====================

  function initTilt() {
    var card = document.querySelector(".about-photo");
    if (!card || !fine || reduced) return;

    var rx = 0;
    var ry = 0;
    var lift = 0;
    var tx = 0;
    var ty = 0;
    var tl = 0;
    var raf = 0;

    function frame() {
      rx += (tx - rx) * 0.12;
      ry += (ty - ry) * 0.12;
      lift += (tl - lift) * 0.12;
      card.style.transform =
        "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) scale(" +
        (1 + lift * 0.03).toFixed(4) + ")";
      var settled = Math.abs(tx - rx) < 0.01 && Math.abs(ty - ry) < 0.01 && Math.abs(tl - lift) < 0.001;
      raf = settled ? 0 : requestAnimationFrame(frame);
    }

    function wake() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      tx = (0.5 - py) * 14;
      ty = (px - 0.5) * 18;
      tl = 1;
      card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      card.classList.add("is-tilting");
      wake();
    });

    card.addEventListener("pointerleave", function () {
      tx = 0;
      ty = 0;
      tl = 0;
      card.classList.remove("is-tilting");
      wake();
    });
  }

  // ==================== Skills marquee ====================
  // Two rows of the skills drifting in opposite directions above the list.
  // They are built from the list itself, so the page never carries a second
  // copy of the text, and they are aria-hidden: the list is the content.

  function initMarquee() {
    var rows = [].slice.call(document.querySelectorAll(".skills-row"));
    var heading = document.querySelector("#skills .section-heading");
    if (!rows.length || !heading) return;

    var names = function (from, to) {
      var out = [];
      rows.slice(from, to).forEach(function (row) {
        [].forEach.call(row.querySelectorAll(".skills-list li"), function (li) {
          out.push(li.textContent.trim());
        });
      });
      return out;
    };
    var half = Math.ceil(rows.length / 2);

    var box = document.createElement("div");
    box.className = "marquee";
    box.setAttribute("aria-hidden", "true");
    [names(0, half), names(half)].forEach(function (list, i) {
      var row = document.createElement("div");
      row.className = "marquee-row" + (i ? " is-reverse" : "");
      // Two identical halves, so sliding by exactly one half loops seamlessly.
      var html = list
        .map(function (n) {
          return "<span>" + n.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span><i></i>";
        })
        .join("");
      row.innerHTML = '<div class="marquee-half">' + html + '</div><div class="marquee-half">' + html + "</div>";
      // A steady speed whatever the row length.
      row.style.setProperty("--marquee-duration", Math.max(24, list.length * 2.6) + "s");
      box.appendChild(row);
    });
    heading.insertAdjacentElement("afterend", box);
  }

  // ==================== Boot ====================

  // The gallery sets the projects section's height, so it measures before
  // the stacking reads that height.
  initGallery();
  initStack();
  initLede();
  initTilt();
  initMarquee();

  if (!updaters.length) return;

  var ticking = false;
  window.addEventListener(
    "scroll",
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        updateAll();
      });
    },
    { passive: true },
  );

  // Heights change when fonts and images land, when a project row opens, and
  // when the window resizes; re-measure on all of them, once per frame.
  var queued = false;
  function queueMeasure() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      measureAll();
    });
  }
  var ro = new ResizeObserver(queueMeasure);
  pages.forEach(function (p) {
    ro.observe(p);
  });
  // A phone's toolbar sliding in and out changes the height by a little on
  // every scroll; that is not worth re-laying the page. A width change (a
  // rotation) is, and the reader keeps their place in the section they were
  // reading.
  var lastW = window.innerWidth;
  var lastH = window.innerHeight;
  window.addEventListener(
    "resize",
    function () {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) < 150) return;
      var anchor = null;
      if (w !== lastW) {
        var y = window.scrollY + h * 0.3;
        for (var i = pages.length - 1; i >= 0; i--) {
          var t = layout.top(pages[i]);
          if (t <= y) {
            anchor = { page: pages[i], ratio: (y - t) / Math.max(1, pages[i].offsetHeight) };
            break;
          }
        }
      }
      lastW = w;
      lastH = h;
      requestAnimationFrame(function () {
        measureAll();
        if (anchor) {
          var top = layout.top(anchor.page) + anchor.ratio * anchor.page.offsetHeight - h * 0.3;
          window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
        }
      });
    },
    { passive: true },
  );
  window.addEventListener("load", queueMeasure);
  measureAll();
  if (deepLink) deepLink();
})();
