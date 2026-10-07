/**
 * Route
 * -----
 * A route that winds down the page like a timeline. It runs down one edge of
 * a section, sweeps across the open space above the next heading to the
 * other side, and carries on, so the whole page reads as one journey. A faint
 * dotted line shows the road ahead; the solid line draws in behind a glowing
 * packet that rides at the reading line (62% down the screen). Each heading
 * is a hop that lights up as the packet passes it. On the home page's pinned
 * gallery the route turns and runs sideways with the cards.
 *
 * On the stacked home page each section carries its own stretch of route,
 * so the line moves with its card: a section sliding up over the last one
 * brings the next stretch in with it, starting where the previous one is
 * parked. Case studies get one continuous route over the whole page.
 *
 * The route is decoration: aria-hidden, behind the content, and the headings
 * carry the same information. Under reduced motion it is drawn complete and
 * still.
 */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var main = document.getElementById("main");
  if (!main) return;

  var NS = "http://www.w3.org/2000/svg";
  var READ = 0.62; // the reading line, as a share of the viewport height

  var pages = [].slice.call(main.children).filter(function (el) {
    return el.matches(".hero, .section");
  });
  var caseSections = [].slice.call(document.querySelectorAll(".project-section"));
  var isHome = pages.length >= 4 && !!document.getElementById("hero");
  if (!isHome && caseSections.length < 3) return;

  html.classList.add("has-route");

  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  var pad = function (n) {
    return (n < 10 ? "0" : "") + n;
  };

  function offsetWithin(el, ancestor) {
    var y = 0;
    var x = 0;
    while (el && el !== ancestor) {
      y += el.offsetTop;
      x += el.offsetLeft;
      el = el.offsetParent;
    }
    return { x: x, y: y };
  }

  function labelText(el) {
    if (el.id) {
      var link = document.querySelector('.nav-links a[href="#' + el.id + '"]');
      if (link) return link.textContent.trim();
    }
    var h = el.querySelector("h1, h2");
    return h ? h.textContent.trim() : "";
  }

  // A curve from the current point to (x1, y1) that leaves vertically and
  // arrives vertically, so a sweep joins the straight runs without a kink.
  function sweep(x0, y0, x1, y1) {
    var k = (y1 - y0) * 0.55;
    return " C " + x0 + " " + (y0 + k) + ", " + x1 + " " + (y1 - k) + ", " + x1 + " " + y1;
  }

  function el(name, cls) {
    var n = document.createElementNS(NS, name);
    if (cls) n.setAttribute("class", cls);
    return n;
  }

  // ==================== The packet ====================
  // One element for the whole page, fixed to the screen at the head of the
  // line. While the page moves it carries the current chapter's name.

  var tip = document.createElement("div");
  tip.className = "route-tip";
  tip.setAttribute("aria-hidden", "true");
  tip.innerHTML = '<span class="route-tip-dot"></span><span class="route-tip-label"></span>';
  var tipLabel = tip.lastChild;
  document.body.appendChild(tip);

  // ==================== Building ====================

  var segs = [];

  function sidesFor(host, container) {
    var c = container || host.querySelector(".container") || host;
    var o = offsetWithin(c, host);
    var cs = getComputedStyle(c);
    var textLeft = o.x + (parseFloat(cs.paddingLeft) || 0);
    var textRight = o.x + c.offsetWidth - (parseFloat(cs.paddingRight) || 0);
    var gap = clamp(textLeft * 0.5, 13, 40);
    return { L: Math.max(8, textLeft - gap), R: Math.min(host.offsetWidth - 8, textRight + gap) };
  }

  // Content in a host is lifted above the route so the line passes behind it.
  function liftContent(host, svg) {
    [].forEach.call(host.children, function (child) {
      if (child === svg) return;
      var pos = getComputedStyle(child).position;
      if (pos === "static" || pos === "relative") child.classList.add("route-above");
    });
  }

  function makeSeg(host, kind) {
    var svg = el("svg", "route-svg");
    svg.setAttribute("aria-hidden", "true");
    var ghost = el("path", "route-ghost");
    var line = el("path", "route-line");
    svg.appendChild(ghost);
    svg.appendChild(line);
    host.insertBefore(svg, host.firstChild);
    liftContent(host, svg);
    return { host: host, kind: kind, svg: svg, ghost: ghost, line: line, nodes: [], drawn: -1 };
  }

  function addNode(seg, x, y, label, side, terminal) {
    var g = el("g", "route-node" + (terminal ? " is-end" : ""));
    var ring = el("circle", "route-node-ring");
    ring.setAttribute("cx", x);
    ring.setAttribute("cy", y);
    ring.setAttribute("r", terminal ? 9 : 7);
    var dot = el("circle", "route-node-dot");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", terminal ? 4 : 3);
    var text = el("text", "route-label");
    text.textContent = label;
    text.setAttribute("y", y);
    text.setAttribute("dy", "0.35em");
    // Labels sit on the outside of the route, in the margin.
    if (side === "L") {
      text.setAttribute("x", x - 16);
      text.setAttribute("text-anchor", "end");
    } else {
      text.setAttribute("x", x + 16);
    }
    g.appendChild(ring);
    g.appendChild(dot);
    g.appendChild(text);
    seg.svg.appendChild(g);
    seg.nodes.push({ g: g, y: y, label: label, len: 0, lit: false });
  }

  // Lengths along a path, sampled by height, so "how far down" can be turned
  // into "how much line" with a binary search instead of geometry per frame.
  function index(seg) {
    var p = seg.line;
    var total = p.getTotalLength();
    var n = Math.max(2, Math.ceil(total / 6));
    var ys = new Float32Array(n + 1);
    for (var k = 0; k <= n; k++) ys[k] = p.getPointAtLength((total * k) / n).y;
    seg.total = total;
    seg.ys = ys;
    seg.step = total / n;
    p.style.strokeDasharray = total + " " + total;
    seg.nodes.forEach(function (node) {
      node.len = lenAtY(seg, node.y);
    });
  }

  function lenAtY(seg, y) {
    var ys = seg.ys;
    if (y <= ys[0]) return 0;
    var hi = ys.length - 1;
    if (y >= ys[hi]) return seg.total;
    var lo = 0;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid;
      else hi = mid;
    }
    var span = ys[hi] - ys[lo];
    var f = span > 0 ? (y - ys[lo]) / span : 0;
    return (lo + f) * seg.step;
  }

  function measureLen(d) {
    var tmp = el("path");
    tmp.setAttribute("d", d);
    segs[0].svg.appendChild(tmp);
    var l = tmp.getTotalLength();
    tmp.remove();
    return l;
  }

  function clear() {
    segs.forEach(function (s) {
      s.svg.remove();
    });
    segs = [];
  }

  function buildHome() {
    var pinned = html.classList.contains("work-pinned");
    var exitX = null;
    var exitSide = "L";
    var n = 0;

    pages.forEach(function (page, i) {
      var galleryPin = pinned && page.id === "projects" ? page.querySelector(".work-pin") : null;
      var host = galleryPin || page;
      var seg = makeSeg(host, galleryPin ? "gallery" : "flow");
      segs.push(seg);

      var H = host.offsetHeight;
      var sides = sidesFor(host, galleryPin ? host.querySelector(".work-head") : null);
      var eyebrow = host.querySelector(".eyebrow");
      var ey = eyebrow ? offsetWithin(eyebrow, host).y + eyebrow.offsetHeight / 2 : 40;
      var label = pad(++n) + " · " + labelText(page);

      // The first page starts at its own hop; every later one arrives where
      // the previous one left, and sweeps across to the other side.
      var side = i === 0 ? "L" : exitSide === "L" ? "R" : "L";
      var x = sides[side];
      var d;
      if (exitX === null) {
        d = "M " + x + " " + ey;
      } else {
        d = "M " + exitX + " 0" + sweep(exitX, 0, x, ey);
      }

      if (galleryPin) {
        // Down to the bottom of the cards, then along under them to the
        // other side, then down and out.
        var bar = host.querySelector(".work-progress");
        var by = bar ? offsetWithin(bar, host).y - 2 : H - 60;
        var other = side === "L" ? "R" : "L";
        var x2 = sides[other];
        var r = 28;
        var dirX = x2 > x ? 1 : -1;
        var dA = d + " L " + x + " " + (by - r) + " Q " + x + " " + by + ", " + (x + dirX * r) + " " + by;
        var dB = dA + " L " + (x2 - dirX * r) + " " + by + " Q " + x2 + " " + by + ", " + x2 + " " + (by + r);
        d = dB + " L " + x2 + " " + H;
        seg.line.setAttribute("d", d);
        seg.ghost.setAttribute("d", d);
        seg.lenA = measureLen(dA);
        seg.lenB = measureLen(dB);
        seg.barY = by;
        exitX = x2;
        exitSide = other;
      } else {
        var last = i === pages.length - 1;
        var endY = last ? H - Math.min(80, H * 0.08) : H;
        d += " L " + x + " " + endY;
        seg.line.setAttribute("d", d);
        seg.ghost.setAttribute("d", d);
        exitX = x;
        exitSide = side;
      }

      addNode(seg, x, ey, label, side, false);
      if (i === pages.length - 1) {
        addNode(seg, x, H - Math.min(80, H * 0.08), "End of route", side, true);
      }
      index(seg);
    });
  }

  function buildCase() {
    var seg = makeSeg(main, "flow");
    segs.push(seg);
    var col = main.querySelector(".project-content") || main.querySelector(".container");
    var sides = sidesFor(main, col);
    var hero = main.querySelector(".project-hero h1");
    var stops = [];
    if (hero) stops.push({ el: hero, label: "Intro" });
    caseSections.forEach(function (sec) {
      var h = sec.querySelector("h2");
      if (h) stops.push({ el: h, label: h.textContent.trim() });
    });

    var side = "L";
    var x = sides.L;
    var d = "";
    var prevY = 0;
    stops.forEach(function (stop, i) {
      var y = offsetWithin(stop.el, main).y + stop.el.offsetHeight / 2;
      if (i === 0) {
        d = "M " + x + " " + y;
      } else {
        // Run down the current side, then sweep across in the gap above the
        // next heading.
        var nextSide = side === "L" ? "R" : "L";
        var nx = sides[nextSide];
        var turn = Math.max(prevY + 20, y - 110);
        d += " L " + x + " " + turn + sweep(x, turn, nx, y);
        side = nextSide;
        x = nx;
      }
      stop.x = x;
      stop.y = y;
      stop.side = side;
      prevY = y;
    });
    var endY = main.offsetHeight - 60;
    d += " L " + x + " " + endY;
    seg.line.setAttribute("d", d);
    seg.ghost.setAttribute("d", d);
    stops.forEach(function (stop, i) {
      addNode(seg, stop.x, stop.y, pad(i + 1) + " · " + stop.label, stop.side, false);
    });
    addNode(seg, x, endY, "End of route", side, true);
    index(seg);
  }

  function build() {
    clear();
    if (isHome) buildHome();
    else buildCase();
    current = null;
    update(true);
  }

  // ==================== Drawing ====================

  var current = null;
  var moving = 0;
  var lastY = window.scrollY;

  function galleryProgress() {
    var work = document.getElementById("work");
    var v = work ? parseFloat(work.style.getPropertyValue("--work-p")) : 0;
    return isNaN(v) ? 0 : v;
  }

  function update(force) {
    var vh = window.innerHeight;
    var read = vh * READ;
    var rects = segs.map(function (s) {
      return s.host.getBoundingClientRect();
    });

    // The segment on top at the reading line is the one the packet rides.
    var active = -1;
    for (var i = 0; i < segs.length; i++) if (rects[i].top <= read) active = i;

    var currentLabel = null;
    segs.forEach(function (s, i) {
      var local = read - rects[i].top;
      var len;
      if (reduced) {
        len = s.total;
      } else if (local <= 0) {
        len = 0;
      } else if (s.kind === "gallery" && rects[i].top <= 1) {
        // Held on screen: the sideways run follows the cards.
        var p = galleryProgress();
        var held = lenAtY(s, Math.min(local, s.barY));
        len =
          p <= 0.06
            ? held + (s.lenA - held) * (p / 0.06)
            : p < 0.97
              ? s.lenA + (s.lenB - s.lenA) * ((p - 0.06) / 0.91)
              : s.lenB + (s.total - s.lenB) * ((p - 0.97) / 0.03);
      } else {
        len = lenAtY(s, s.kind === "gallery" ? Math.min(local, s.barY) : local);
      }
      len = clamp(len, 0, s.total);

      if (force || Math.abs(len - s.drawn) > 0.25) {
        s.drawn = len;
        s.line.style.strokeDashoffset = (s.total - len).toFixed(1);
      }
      s.nodes.forEach(function (node) {
        var lit = len >= node.len - 1;
        if (lit !== node.lit) {
          node.lit = lit;
          node.g.classList.toggle("is-lit", lit);
        }
        if (lit && !/^End/.test(node.label)) currentLabel = node.label;
      });

      if (i === active && !reduced) {
        var pt = s.line.getPointAtLength(s.drawn);
        var tx = rects[i].left + pt.x;
        tip.style.transform = "translate3d(" + tx.toFixed(1) + "px," + (rects[i].top + pt.y).toFixed(1) + "px,0)";
        // On the right-hand side the label opens toward the page instead.
        tip.classList.toggle("is-flip", tx > window.innerWidth / 2);
      }
    });

    tip.classList.toggle("is-on", active >= 0 && !reduced);
    if (currentLabel !== current) {
      current = currentLabel;
      tipLabel.textContent = current || "";
    }
  }

  // ==================== Wiring ====================

  var ticking = false;
  var idle = 0;
  window.addEventListener(
    "scroll",
    function () {
      // While the page moves, the packet carries its label.
      if (Math.abs(window.scrollY - lastY) > 1) {
        lastY = window.scrollY;
        tip.classList.add("is-moving");
        clearTimeout(idle);
        idle = setTimeout(function () {
          tip.classList.remove("is-moving");
        }, 900);
      }
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        update(false);
      });
    },
    { passive: true },
  );

  var queued = false;
  function rebuild() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      build();
    });
  }
  var ro = new ResizeObserver(rebuild);
  (isHome ? pages : [main]).forEach(function (p) {
    ro.observe(p);
  });
  window.addEventListener("resize", rebuild, { passive: true });
  window.addEventListener("load", rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  // The gallery switching between pinned and carousel changes the route.
  var wasPinned = html.classList.contains("work-pinned");
  new MutationObserver(function () {
    var pinned = html.classList.contains("work-pinned");
    if (pinned !== wasPinned) {
      wasPinned = pinned;
      rebuild();
    }
  }).observe(html, { attributes: true, attributeFilter: ["class"] });

  build();
})();
