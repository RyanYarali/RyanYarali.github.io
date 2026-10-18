/**
 * Flair
 * -----
 * The smaller custom touches shared by every page:
 *
 *   letters       big titles split into letters that rise one after
 *                 another; the hero name and the footer wordmark thin
 *                 under the pointer (a weight lens); the skills marquee
 *                 speeds up with fast scrolling
 *   header        the bar lifts into a glass capsule on scroll, and a pill
 *                 glides between the nav links
 *   pixel icons   the skill tiles' icons, drawn on a 12 x 12 grid in Ping's
 *                 pixel style, booting in pixel by pixel and animating in
 *                 two frames when a tile is hovered or (on a touch screen)
 *                 in the middle of the screen
 *   pixel resolve the About portrait arrives as a coarse mosaic that
 *                 sharpens in steps, like a packet coming in
 *   preview       on the projects page, a project's cover floats beside the
 *                 pointer while its row is hovered
 *   terminal      Ctrl K / Cmd K (or the footer button) opens a small
 *                 terminal for getting around the site
 *
 * All of it is decoration over content that is already in the HTML, and it
 * all respects reduced motion.
 */

(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;

  // ==================== Pixel icons ====================
  // a accent   h accent highlight   l accent shade   k text colour
  // Each icon has two frames; the second is what changes when it animates.

  var ICONS = {
    lang: [
      ["............", ".......h....", "...a...ha...", "..a...h..a..", ".a....h...a.", "a....h.....a", ".a...h....a.", "..a.h....a..", "...ah...a...", "............"],
      ["............", ".......h....", "....a..h.a..", "...a..h...a.", "..a...h....a", ".a...h.....a", "..a..h....a.", "...ah....a..", "....h...a...", "............"],
    ],
    front: [
      ["aaaaaaaaaaaa", "ahahahaaaaaa", "aaaaaaaaaaaa", "a..........a", "a.kkkkk....a", "a..........a", "a.kkkkkkk..a", "a..........a", "a.kkk......a", "aaaaaaaaaaaa"],
      ["aaaaaaaaaaaa", "ahahahaaaaaa", "aaaaaaaaaaaa", "a..........a", "a.kkkkkkk..a", "a..........a", "a.kkkk.....a", "a..........a", "a.kkkkkh...a", "aaaaaaaaaaaa"],
    ],
    back: [
      [".aaaaaaaaaa.", ".ah.kkkk..a.", ".aaaaaaaaaa.", "............", ".aaaaaaaaaa.", ".al.kkkk..a.", ".aaaaaaaaaa.", "............", ".aaaaaaaaaa.", ".ah.kkkk..a.", ".aaaaaaaaaa."],
      [".aaaaaaaaaa.", ".al.kkkk..a.", ".aaaaaaaaaa.", "............", ".aaaaaaaaaa.", ".ah.kkkk..a.", ".aaaaaaaaaa.", "............", ".aaaaaaaaaa.", ".al.kkkk..a.", ".aaaaaaaaaa."],
    ],
    net: [
      ["..aaaaaaaa..", ".a........a.", "a..........a", "...hhhhhh...", "..h......h..", "............", "....aaaa....", "...a....a...", "............", ".....aa.....", ".....aa....."],
      ["............", "............", "............", "...hhhhhh...", "..h......h..", "............", "....aaaa....", "...a....a...", "............", ".....hh.....", ".....hh....."],
    ],
    db: [
      ["..aaaaaaaa..", ".ahhhhhhhha.", ".aaaaaaaaaa.", ".a.h......a.", ".aaaaaaaaaa.", ".a.h......a.", ".a.h......a.", ".aaaaaaaaaa.", ".a.h......a.", ".a.h......a.", "..aaaaaaaa.."],
      ["..aaaaaaaa..", ".ahhhhhhhha.", ".aaaaaaaaaa.", ".a......h.a.", ".aaaaaaaaaa.", ".a......h.a.", ".a......h.a.", ".aaaaaaaaaa.", ".a......h.a.", ".a......h.a.", "..aaaaaaaa.."],
    ],
    sys: [
      ["aaaaaaaaaaaa", "a..........a", "a.h........a", "a..h.......a", "a...h......a", "a..h.......a", "a.h..kkkk..a", "a..........a", "aaaaaaaaaaaa"],
      ["aaaaaaaaaaaa", "a..........a", "a.h........a", "a..h.......a", "a...h......a", "a..h.......a", "a.h........a", "a..........a", "aaaaaaaaaaaa"],
    ],
    seo: [
      ["....aaaa....", "..aa....aa..", ".a........a.", "a.h........a", "a..h.......a", "a...h......a", "a....kk....a", "a....kk....a", "aaaaaaaaaaaa"],
      ["....aaaa....", "..aa....aa..", ".a........a.", "a........h.a", "a.......h..a", "a......h...a", "a....kk....a", "a....kk....a", "aaaaaaaaaaaa"],
    ],
    flow: [
      ["..aaa.......", "..aha.......", "..aaa.......", "...a.a......", "...a..a.....", "...a...aaa..", "...a...aha..", "...a...aaa..", "...a..a.....", "..aaaa......", "..aha.......", "..aaa......."],
      ["..aaa.......", "..aaa.......", "..aaa.......", "...a.a......", "...a..a.....", "...a...aaa..", "...a...hhh..", "...a...aaa..", "...a..a.....", "..aaaa......", "..aaa.......", "..aaa......."],
    ],
    folio: [
      ["aaaaaaaaaaaa", "a..........a", "a.hhh......a", "a.hhh.kkkk.a", "a.hhh......a", "a.....kkk..a", "a.kkkkkkkk.a", "a..........a", "a.kkkkk....a", "aaaaaaaaaaaa"],
      ["aaaaaaaaaaaa", "a..........a", "a.hhh......a", "a.hhh.kkk..a", "a.hhh......a", "a.....kkkk.a", "a.kkkkk....a", "a..........a", "a.kkkkkkkk.a", "aaaaaaaaaaaa"],
    ],
    shop: [
      ["ahahahahahah", "ahahahahahah", ".aaaaaaaaaa.", ".a........a.", ".a.kkk.aa.a.", ".a.kkk.aa.a.", ".a.....aa.a.", ".a.....aa.a.", "aaaaaaaaaaaa"],
      ["hahahahahaha", "hahahahahaha", ".aaaaaaaaaa.", ".a........a.", ".a.hhh.aa.a.", ".a.hhh.ah.a.", ".a.....aa.a.", ".a.....aa.a.", "aaaaaaaaaaaa"],
    ],
    app: [
      ["aaaaaaaaaaaa", "ahaaaaaaaaaa", "aaaaaaaaaaaa", "a..........a", "a.hh..kkkk.a", "a.hh.......a", "a..........a", "a.kk..hhhh.a", "a.kk.......a", "aaaaaaaaaaaa"],
      ["aaaaaaaaaaaa", "ahaaaaaaaaaa", "aaaaaaaaaaaa", "a..........a", "a.kk..hhhh.a", "a.kk.......a", "a..........a", "a.hh..kkkk.a", "a.hh.......a", "aaaaaaaaaaaa"],
    ],
  };

  function drawFrame(svg, map, cls, w, h) {
    var g = document.createElementNS(NS, "g");
    g.setAttribute("class", cls);
    // Centre the drawing in the 12 x 12 box.
    var ox = Math.floor((12 - w) / 2);
    var oy = Math.floor((12 - h) / 2);
    map.forEach(function (row, y) {
      row.split("").forEach(function (ch, x) {
        if (ch === ".") return;
        var r = document.createElementNS(NS, "rect");
        r.setAttribute("x", x + ox);
        r.setAttribute("y", y + oy);
        r.setAttribute("width", 1.02);
        r.setAttribute("height", 1.02);
        r.setAttribute("class", "pi-" + ch);
        // Each pixel boots in at its own moment when the tile is revealed.
        r.style.setProperty("--d", Math.round(Math.random() * 420) + "ms");
        g.appendChild(r);
      });
    });
    svg.appendChild(g);
  }

  function initIcons() {
    var tiles = document.querySelectorAll(".skill-tile[data-icon], .plan[data-icon]");
    if (!tiles.length) return;
    [].forEach.call(tiles, function (tile) {
      var frames = ICONS[tile.getAttribute("data-icon")];
      var svg = tile.querySelector(".skill-icon");
      if (!frames || !svg) return;
      svg.setAttribute("viewBox", "0 0 12 12");
      svg.setAttribute("shape-rendering", "crispEdges");
      var w = frames[0][0].length;
      var h = frames[0].length;
      drawFrame(svg, frames[0], "pi-a", w, h);
      drawFrame(svg, frames[1], "pi-b", w, h);
    });

    // On a touch screen there is no hover: the tile in the middle band of
    // the screen is the live one.
    if (fine || reduced || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle("is-live", e.isIntersecting);
        });
      },
      { rootMargin: "-35% 0px -35% 0px" },
    );
    [].forEach.call(tiles, function (t) {
      io.observe(t);
    });
  }

  // ==================== Letters ====================
  // Big display type is split into one span per letter (inside one span per
  // word), so its letters can rise one after another and respond to the
  // pointer. The heading keeps its real text as its accessible name; the
  // spans are hidden from assistive technology.

  function split(el) {
    if (el.dataset.split) return el;
    el.dataset.split = "1";
    var clone = el.cloneNode(true);
    [].forEach.call(clone.querySelectorAll("[aria-hidden='true']"), function (n) {
      n.remove();
    });
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", clone.textContent.replace(/\s+/g, " ").trim());
    var i = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) {
          if (n.getAttribute("aria-hidden") === "true") return;
          return walk(n);
        }
        if (n.nodeType !== 3 || !n.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          var wd = document.createElement("span");
          wd.className = "wd";
          wd.setAttribute("aria-hidden", "true");
          Array.from(part).forEach(function (c) {
            var ch = document.createElement("span");
            ch.className = "ch";
            ch.textContent = c;
            ch.style.setProperty("--i", i++);
            wd.appendChild(ch);
          });
          frag.appendChild(wd);
        });
        n.parentNode.replaceChild(frag, n);
      });
    })(el);
    return el;
  }
  window.siteSplit = split;

  // Letters rise out of their word's mask when the title comes into view.
  // The hero name (data-rise="manual") is timed by hero.js instead.
  function initRise() {
    if (reduced) return;
    var els = document.querySelectorAll("[data-rise]:not([data-rise='manual'])");
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-risen");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.2 },
    );
    [].forEach.call(els, function (el) {
      split(el);
      el.classList.add("rise-ready");
      // A frame in the hidden state first, so the rise has somewhere to
      // start from.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          io.observe(el);
        });
      });
    });
  }

  // The weight lens: over a title marked data-lens, each letter's weight
  // follows the pointer's distance from it, so the type thins under the
  // pointer like glass passing over it. Letters keep the width they have at
  // rest, so nothing around them moves.
  function initLens() {
    if (!fine || reduced) return;
    [].forEach.call(document.querySelectorAll("[data-lens]"), function (el) {
      if (!el.querySelector(".ch")) split(el);
      var chars = [].slice.call(el.querySelectorAll(".ch"));
      if (!chars.length) return;
      var accent = el.getAttribute("data-lens") === "accent";
      var base = parseFloat(getComputedStyle(chars[0]).fontWeight) || 700;
      var MIN = 380;
      var cur = chars.map(function () {
        return base;
      });
      var tgt = cur.slice();
      var raf = 0;
      var px = -1e4;
      var py = -1e4;

      function fix() {
        chars.forEach(function (c) {
          c.style.width = "";
          c.style.fontWeight = "";
        });
        // Computed width: fractional, and blind to any transform on the way
        // up (the hero name may be mid-flight into the nav).
        chars.forEach(function (c) {
          c.style.width = getComputedStyle(c).width;
        });
        cur = chars.map(function () {
          return base;
        });
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fix);
      else fix();
      window.addEventListener("resize", fix, { passive: true });

      function aim() {
        var any = false;
        chars.forEach(function (c, i) {
          var r = c.getBoundingClientRect();
          var radius = r.height * 1.15;
          var d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
          var f = Math.max(0, 1 - d / radius);
          f = f * f;
          tgt[i] = base - (base - MIN) * f;
          if (f > 0) any = true;
        });
        return any;
      }

      function frame() {
        raf = 0;
        var moving = false;
        chars.forEach(function (c, i) {
          var next = cur[i] + (tgt[i] - cur[i]) * 0.2;
          if (Math.abs(tgt[i] - next) < 0.6) next = tgt[i];
          if (Math.round(next) !== Math.round(cur[i])) {
            c.style.fontWeight = String(Math.round(next));
            if (accent) {
              var k = Math.round(((base - next) / (base - MIN)) * 100);
              c.style.color = k > 2 ? "color-mix(in srgb, var(--color-accent) " + k + "%, currentColor)" : "";
            }
          }
          cur[i] = next;
          if (next !== tgt[i]) moving = true;
        });
        if (moving) raf = requestAnimationFrame(frame);
      }

      window.addEventListener(
        "pointermove",
        function (e) {
          var box = el.getBoundingClientRect();
          var pad = box.height * 0.6;
          var near = e.clientX > box.left - pad && e.clientX < box.right + pad && e.clientY > box.top - pad && e.clientY < box.bottom + pad;
          if (!near) {
            if (px === -1e4) return;
            px = py = -1e4;
          } else {
            px = e.clientX;
            py = e.clientY;
          }
          aim();
          if (!raf) raf = requestAnimationFrame(frame);
        },
        { passive: true },
      );
    });
  }

  // The skills marquee runs faster while the page is scrolled fast, and
  // eases back to its own pace. Only while it is on screen, and with its
  // animations looked up once: asking for them every frame forced the whole
  // page's styles to be recalculated on every scroll frame.
  function initMarqueeSpeed() {
    if (reduced || !("IntersectionObserver" in window)) return;
    var last = window.scrollY;
    var v = 0;
    var rate = 1;
    var applied = 1;
    var raf = 0;
    var anims = null;
    var visible = false;

    function find() {
      var box = document.querySelector(".marquee");
      if (!box) return false;
      anims = [];
      [].forEach.call(box.querySelectorAll(".marquee-row"), function (row) {
        anims = anims.concat(row.getAnimations());
      });
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(box);
      return true;
    }

    function apply(r) {
      if (Math.abs(r - applied) < 0.02 && r !== 1) return;
      applied = r;
      for (var i = 0; i < anims.length; i++) anims[i].playbackRate = r;
    }

    function tick() {
      raf = 0;
      rate += (1 + v - rate) * 0.12;
      v *= 0.9;
      if (Math.abs(rate - 1) < 0.01 && v < 0.01) {
        rate = 1;
        if (applied !== 1) apply(1);
        return;
      }
      apply(rate);
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener(
      "scroll",
      function () {
        var dy = window.scrollY - last;
        last = window.scrollY;
        if (!anims && !find()) return;
        if (!visible) return;
        v = Math.min(5, Math.max(v, Math.abs(dy) / 14));
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true },
    );
  }

  // ==================== Header ====================
  // The bar lifts into a glass capsule once the page is scrolled, and a pill
  // glides between the links: to the one under the pointer, then back to the
  // current section's (main.js marks it .active as the page scrolls).

  function initHeader() {
    var nav = document.querySelector(".navbar");
    if (!nav) return;
    function lift() {
      nav.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    lift();
    window.addEventListener("scroll", lift, { passive: true });

    var list = document.getElementById("nav-links");
    if (!list) return;
    var links = [].slice.call(list.querySelectorAll(".nav-link"));
    var pill = document.createElement("li");
    pill.className = "nav-pill";
    pill.setAttribute("aria-hidden", "true");
    list.appendChild(pill);
    var wide = window.matchMedia("(min-width: 768px)");

    function current() {
      return list.querySelector(".nav-link.active, .nav-link[aria-current='page']");
    }

    function place(link) {
      if (!wide.matches || !link) {
        pill.style.opacity = "0";
        return;
      }
      var lr = list.getBoundingClientRect();
      var r = link.getBoundingClientRect();
      pill.style.width = r.width.toFixed(1) + "px";
      pill.style.height = r.height.toFixed(1) + "px";
      pill.style.top = (r.top - lr.top).toFixed(1) + "px";
      pill.style.transform = "translateX(" + (r.left - lr.left).toFixed(1) + "px)";
      pill.style.opacity = "1";
    }

    links.forEach(function (a) {
      a.addEventListener("pointerenter", function () {
        place(a);
      });
      a.addEventListener("focus", function () {
        place(a);
      });
    });
    list.addEventListener("pointerleave", function () {
      place(current());
    });
    list.addEventListener("focusout", function () {
      place(current());
    });
    new MutationObserver(function () {
      place(current());
    }).observe(list, { attributes: true, subtree: true, attributeFilter: ["class"] });
    window.addEventListener("resize", function () {
      place(current());
    });
    // The first placement waits for the fonts, which set the links' widths.
    var settle = function () {
      pill.style.transition = "none";
      place(current());
      void pill.offsetWidth;
      pill.style.transition = "";
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    else settle();
  }

  // ==================== Pixel resolve ====================
  // A portrait marked data-pixel-reveal arrives like a packet: when it
  // scrolls in it is drawn as a coarse mosaic that sharpens in steps (6, 10,
  // 16, 26, 44, 72 blocks across), then the real photo takes over.

  function initPixelReveal() {
    var figs = document.querySelectorAll("[data-pixel-reveal]");
    if (!figs.length || reduced || !("IntersectionObserver" in window)) return;
    [].forEach.call(figs, function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      var cv = document.createElement("canvas");
      cv.className = "pixel-canvas";
      cv.setAttribute("aria-hidden", "true");
      fig.insertBefore(cv, img.nextSibling);
      fig.classList.add("is-pixelated");

      function done() {
        fig.classList.add("is-resolved");
      }

      function run() {
        var ready = img.decode ? img.decode() : Promise.resolve();
        ready
          .catch(function () {})
          .then(function () {
            try {
              var W = fig.clientWidth;
              var H = fig.clientHeight;
              var dpr = Math.min(2, window.devicePixelRatio || 1);
              cv.width = Math.round(W * dpr);
              cv.height = Math.round(H * dpr);
              var ctx = cv.getContext("2d");
              var tmp = document.createElement("canvas");
              var tctx = tmp.getContext("2d");
              // The same crop as object-fit: cover.
              var iw = img.naturalWidth;
              var ih = img.naturalHeight;
              var sc = Math.max(W / iw, H / ih);
              var sw = W / sc;
              var sh = H / sc;
              var sx = (iw - sw) / 2;
              var sy = (ih - sh) / 2;
              var STEPS = [6, 10, 16, 26, 44, 72];
              var i = 0;
              (function step() {
                var cols = STEPS[i];
                var rows = Math.max(1, Math.round((cols * H) / W));
                tmp.width = cols;
                tmp.height = rows;
                tctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(tmp, 0, 0, cols, rows, 0, 0, cv.width, cv.height);
                i++;
                setTimeout(i < STEPS.length ? step : done, i === 1 ? 260 : 120);
              })();
            } catch (e) {
              done();
            }
          });
      }

      var io = new IntersectionObserver(
        function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          run();
        },
        { threshold: 0.3 },
      );
      io.observe(fig);
    });
  }

  // ==================== Project preview ====================
  // On the projects page, hovering a row floats that project's cover beside
  // the pointer, trailing it with a little lag and leaning into the motion.

  function initPreview() {
    var list = document.querySelector(".project-accordion");
    if (!list || !fine || reduced) return;
    var heads = list.querySelectorAll(".project-accordion-item");
    if (!heads.length) return;

    var box = document.createElement("div");
    box.className = "float-preview";
    box.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.alt = "";
    img.decoding = "async";
    box.appendChild(img);
    document.body.appendChild(box);

    var x = 0;
    var y = 0;
    var tx = 0;
    var ty = 0;
    var raf = 0;
    var on = false;

    function frame() {
      raf = 0;
      var dx = tx - x;
      x += dx * 0.16;
      y += (ty - y) * 0.16;
      var lean = Math.max(-8, Math.min(8, dx * 0.08));
      box.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + lean.toFixed(2) + "deg)";
      if (on && (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3)) raf = requestAnimationFrame(frame);
    }

    [].forEach.call(heads, function (item) {
      var src = item.querySelector(".project-accordion-media img");
      var head = item.querySelector(".project-accordion-head");
      if (!head) return;
      head.addEventListener("pointerenter", function (e) {
        // An open row already shows its cover; and a project without one
        // (still launching) has nothing to float.
        if (!src || head.getAttribute("aria-expanded") === "true") return;
        if (img.getAttribute("src") !== src.getAttribute("src")) img.src = src.currentSrc || src.src;
        if (!on) {
          x = tx = e.clientX + 28;
          y = ty = e.clientY - 120;
        }
        on = true;
        box.classList.add("is-on");
        if (!raf) raf = requestAnimationFrame(frame);
      });
      head.addEventListener("pointermove", function (e) {
        tx = e.clientX + 28;
        ty = e.clientY - 120;
        if (on && !raf) raf = requestAnimationFrame(frame);
      });
      head.addEventListener("pointerleave", function () {
        on = false;
        box.classList.remove("is-on");
      });
      head.addEventListener("click", function () {
        on = false;
        box.classList.remove("is-on");
      });
    });
  }

  // ==================== Terminal ====================
  // Ctrl K / Cmd K opens a small terminal: type to filter, arrows to move,
  // Enter to go. Every destination is also an ordinary link on the page; this
  // is a shortcut, not the only way there.

  function initTerminal() {
    var base = /\/projects\//.test(location.pathname) ? "../" : "";
    var onHome = !!document.getElementById("hero");
    function home(hash) {
      return onHome ? hash : base + "index.html" + hash;
    }
    var COMMANDS = [
      { cmd: "home", desc: "Back to the top of the home page", go: home("#hero") },
      { cmd: "about", desc: "Who I am and what I'm studying", go: home("#about") },
      { cmd: "projects", desc: "Every project, with the case studies", go: base + "projects.html" },
      { cmd: "skills", desc: "Languages, stack and tools", go: home("#skills") },
      { cmd: "pricing", desc: "Packages, add-ons and prices", go: home("#pricing") },
      { cmd: "contact", desc: "Send me a message", go: home("#contact") },
      { cmd: "resume", desc: "My résumé", go: base + "resume.html" },
      { cmd: "nooklook", desc: "Case study: Nook Look Studio", go: base + "projects/nooklook.html" },
      { cmd: "vancobab", desc: "Case study: Vancobab", go: base + "projects/vancobab.html" },
      { cmd: "taskmate", desc: "Case study: TaskMate", go: base + "projects/taskmate.html" },
      { cmd: "foodroutes", desc: "Case study: FoodRoutes", go: base + "projects/foodroutes.html" },
      { cmd: "hackertycoon", desc: "Case study: Hacker Tycoon", go: base + "projects/hackertycoon.html" },
      { cmd: "how-its-built", desc: "How this site is built", go: base + "projects/this-site.html" },
      { cmd: "email", desc: "ryan@ryanyarali.com", go: "mailto:ryan@ryanyarali.com", mail: true },
      { cmd: "github", desc: "github.com/RyanYarali", go: "https://github.com/RyanYarali", ext: true },
      { cmd: "linkedin", desc: "linkedin.com/in/ryan-yarali", go: "https://www.linkedin.com/in/ryan-yarali/", ext: true },
      { cmd: "theme", desc: "Switch light and dark", run: function () {
        if (window.siteTheme) window.siteTheme.toggle();
      } },
    ];

    var dlg = document.createElement("dialog");
    dlg.className = "term";
    dlg.setAttribute("aria-label", "Site terminal");
    dlg.innerHTML =
      '<div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '<span class="term-title">ping@ryanyarali.com: ~</span>' +
      '<button type="button" class="term-close" aria-label="Close the terminal">esc</button></div>' +
      '<div class="term-body">' +
      '<label class="term-prompt"><span aria-hidden="true">$</span>' +
      '<input class="term-input" type="text" autocomplete="off" spellcheck="false" placeholder="type a command, e.g. projects" ' +
      'role="combobox" aria-expanded="true" aria-controls="term-list" aria-label="Command" /></label>' +
      '<ul class="term-list" id="term-list" role="listbox" aria-label="Commands"></ul>' +
      '<p class="term-foot" aria-hidden="true"><span>↑↓ move</span><span>↵ run</span><span>esc close</span></p>' +
      "</div>";
    document.body.appendChild(dlg);

    var input = dlg.querySelector(".term-input");
    var listEl = dlg.querySelector(".term-list");
    var shown = [];
    var active = 0;

    function render() {
      var q = input.value.trim().toLowerCase();
      shown = COMMANDS.filter(function (c) {
        return !q || c.cmd.indexOf(q) !== -1 || c.desc.toLowerCase().indexOf(q) !== -1;
      });
      if (active >= shown.length) active = Math.max(0, shown.length - 1);
      listEl.innerHTML = "";
      if (!shown.length) {
        var none = document.createElement("li");
        none.className = "term-none";
        none.textContent = "command not found: " + q + " (try projects, contact or theme)";
        listEl.appendChild(none);
        input.removeAttribute("aria-activedescendant");
        return;
      }
      shown.forEach(function (c, i) {
        var li = document.createElement("li");
        li.id = "term-opt-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === active));
        li.innerHTML = '<span class="term-cmd"></span><span class="term-desc"></span>';
        li.firstChild.textContent = c.cmd;
        li.lastChild.textContent = c.desc;
        li.addEventListener("click", function () {
          run(c);
        });
        li.addEventListener("pointermove", function () {
          if (active !== i) {
            active = i;
            mark();
          }
        });
        listEl.appendChild(li);
      });
      mark();
    }

    function mark() {
      [].forEach.call(listEl.children, function (li, i) {
        li.setAttribute("aria-selected", String(i === active));
      });
      var cur = listEl.children[active];
      if (cur && cur.id) {
        input.setAttribute("aria-activedescendant", cur.id);
        cur.scrollIntoView({ block: "nearest" });
      }
    }

    function close() {
      if (dlg.open) dlg.close();
    }

    function run(c) {
      close();
      if (c.run) return c.run();
      if (c.ext) {
        window.open(c.go, "_blank", "noopener");
        return;
      }
      if (c.mail) {
        location.href = c.go;
        return;
      }
      if (c.go.charAt(0) === "#") {
        var target = document.querySelector(c.go);
        var link = document.querySelector('.nav-link[href="' + c.go + '"]');
        // The nav already knows how to reach a stacked section properly.
        if (link) link.click();
        else if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        return;
      }
      location.href = c.go;
    }

    function open() {
      if (dlg.open) return;
      input.value = "";
      active = 0;
      render();
      dlg.showModal();
      input.focus();
    }

    input.addEventListener("input", function () {
      active = 0;
      render();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (shown.length) active = (active + 1) % shown.length;
        mark();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (shown.length) active = (active - 1 + shown.length) % shown.length;
        mark();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (shown[active]) run(shown[active]);
      }
    });
    dlg.querySelector(".term-close").addEventListener("click", close);
    // A click on the backdrop (outside the window) closes it.
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) close();
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (dlg.open) close();
        else open();
      }
    });
    [].forEach.call(document.querySelectorAll("[data-terminal]"), function (b) {
      b.addEventListener("click", open);
    });
    // Name the shortcut the way this keyboard does.
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
      [].forEach.call(document.querySelectorAll(".footer-term kbd, .nav-term kbd"), function (k) {
        k.textContent = "⌘K";
      });
      [].forEach.call(document.querySelectorAll(".nav-term"), function (b) {
        b.setAttribute("aria-label", "Open the site terminal, ⌘K");
      });
    }
  }

  // ==================== Copy email ====================
  // A button that copies the address it carries and says so for a moment.
  function initCopy() {
    [].forEach.call(document.querySelectorAll("[data-copy]"), function (b) {
      var label = b.textContent;
      var timer = 0;
      b.addEventListener("click", function () {
        var text = b.getAttribute("data-copy");
        var done = function (ok) {
          b.textContent = ok ? "Copied" : "Press Ctrl C";
          b.classList.toggle("is-done", ok);
          clearTimeout(timer);
          timer = setTimeout(function () {
            b.textContent = label;
            b.classList.remove("is-done");
          }, 1800);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            function () {
              done(true);
            },
            function () {
              done(false);
            },
          );
        } else {
          done(false);
        }
      });
    });
  }

  function boot() {
    initCopy();
    initRise();
    initLens();
    initMarqueeSpeed();
    initHeader();
    initIcons();
    initPixelReveal();
    initPreview();
    initTerminal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
