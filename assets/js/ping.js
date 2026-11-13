/**
 * Ping
 * ----
 * The little packet that rides the route. In networking a ping is how one
 * machine says "hello, are you there?", and the answer is a pong, so Ping
 * says hello when you arrive and "Pong" when you reach the end.
 *
 * He is a pixel-art sprite (ping-sprite.js) coloured from the theme tokens.
 * He blinks, glances the way the page is moving, walks while it scrolls,
 * hops at each heading, dozes off when nothing happens, carries the contact
 * form's message to the inbox, and at the end of the route grows big to wave
 * goodbye. His lines dock in a corner as RPG dialog boxes, wired to him. On
 * pages without a route he stands next to the heading.
 *
 * Everything he says repeats something already on the page, so he is
 * hidden from assistive technology. Under reduced motion he holds still and
 * his lines appear without typing.
 */

(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var route = window.siteRoute;
  var spot = document.querySelector("[data-ping-spot]");
  if (!route && !spot) return;

  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };
  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    },
  };

  // ==================== What he says ====================

  // He speaks at the two stops that matter and stays quiet in between: a
  // line at every heading turned him into a narrator competing with the page.
  var HOME = {
    projects: "Real clients. Real live sites. Have a look!",
    contact: "Want to say hi? Write below. I'll deliver it myself.",
  };

  // Case study headings, matched by what they are about.
  // On a case study he speaks at three stops only, as on the home page.
  var CASE = [
    [/the site|screens/i, "Screenshots! The fun part."],
    [/what i built|features?/i, "Here's what he built."],
    [/outcome|result/i, "And how it turned out."],
  ];

  var QUIPS = {
    "work-nooklook": "Ooh, the photo studio. That one's live!",
    "work-vancobab": "Kebab truck site. I can smell it from here.",
    "work-termeh": "Pick a table on the map. In two languages!",
    "work-doorlook": "Houses at twilight. Book in five taps.",
    "work-taskmate": "Built for students. Like Ryan!",
  };

  var STANDALONE = {
    lost: "Oops. I got lost too. Let's go home?",
    resume: "Fresh off the printer. One page, no fluff!",
    projects: "Every project, in one place. Tap one!",
    services: "Prices up front. Pick a package, or ask for a quote!",
    about: "That's Ryan. The résumé is one click away!",
  };

  var isHome = !!document.getElementById("hero");
  var pageTitle = (document.querySelector(".project-hero h1") || {}).textContent || "";

  // ==================== Building him ====================

  // He is a pixel-art sprite (ping-sprite.js draws him on a hard grid from
  // character maps); every state below is a class on .ping that the
  // stylesheet turns into the matching frame.
  var SVG = '<svg class="ping-svg" aria-hidden="true" focusable="false"></svg>';

  var el = document.createElement("div");
  el.className = "ping";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    // Each line arrives as a packet: a header with its sequence number, then
    // the payload typing out. The full line is laid out from the start (the
    // untyped rest is transparent), so the bubble never grows while typing.
    '<div class="ping-bubble"><span class="ping-bubble-head"><span>PING</span><span class="ping-seq"></span></span>' +
    '<span class="ping-bubble-text"><span class="ping-typed"></span><span class="ping-rest"></span></span></div>' +
    '<span class="ping-zzz">z</span>' +
    '<div class="ping-hit" data-cursor="link"><div class="ping-scale"><div class="ping-float"><div class="ping-squash">' +
    SVG +
    "</div></div></div></div>";

  var bubble = el.querySelector(".ping-bubble");
  var bubbleSeq = el.querySelector(".ping-seq");
  var bubbleText = el.querySelector(".ping-bubble-text");
  var typed = el.querySelector(".ping-typed");
  var rest = el.querySelector(".ping-rest");
  var seq = 0;

  function setLine(shown, all) {
    typed.textContent = all.slice(0, shown);
    rest.textContent = all.slice(shown);
  }
  var sprite = window.PingSprite ? window.PingSprite.build(el.querySelector(".ping-svg")) : null;
  var eyes = sprite ? sprite.eyes : null;
  var hit = el.querySelector(".ping-hit");

  if (route) {
    document.body.appendChild(el);
  } else {
    el.classList.add("is-standalone");
    spot.appendChild(el);
  }

  // ==================== Poses and faces ====================

  var mood = "awake";
  function setMood(m) {
    el.classList.remove("is-happy", "is-sleep", "is-dizzy", "is-sad");
    mood = m;
    if (m !== "awake") el.classList.add("is-" + m);
  }

  // Arms: rest, cheer (both up), point-l / point-r, wave, carry, droop.
  var pose = "";
  var poseTimer = 0;
  function setPose(p, ms) {
    el.classList.remove("pose-cheer", "pose-point-l", "pose-point-r", "pose-wave", "pose-carry", "pose-droop");
    pose = p || "";
    if (pose) el.classList.add("pose-" + pose);
    clearTimeout(poseTimer);
    if (ms) {
      poseTimer = setTimeout(function () {
        setPose("");
      }, ms);
    }
  }

  function retrigger(cls, ms) {
    if (reduced) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () {
      el.classList.remove(cls);
    }, ms);
  }
  var hop = function () {
    retrigger("is-hop", 560);
  };
  var nod = function () {
    retrigger("is-nod", 700);
  };

  var happyTimer = 0;
  function happy(ms) {
    setMood("happy");
    clearTimeout(happyTimer);
    happyTimer = setTimeout(function () {
      if (mood === "happy") setMood("awake");
    }, ms || 900);
  }

  // Blinking on his own schedule.
  (function blink() {
    if (!reduced && mood === "awake" && !document.hidden) {
      el.classList.add("is-blink");
      setTimeout(function () {
        el.classList.remove("is-blink");
      }, 130);
    }
    setTimeout(blink, 2200 + Math.random() * 3200);
  })();

  // His eyes glance one whole sprite pixel at most, so they stay on the grid.
  function look(x, y) {
    if (!eyes) return;
    eyes.style.transform = "translate(" + Math.round(clamp(x / 1.6, -1, 1)) + "px," + Math.round(clamp(y / 1.6, -1, 1)) + "px)";
  }

  // Which way to point at something on the page.
  function pointAt(target) {
    var r = hit.getBoundingClientRect();
    var t = target.getBoundingClientRect();
    return t.left + t.width / 2 < r.left + r.width / 2 ? "point-l" : "point-r";
  }

  // ==================== Talking ====================
  // Lines type themselves out with his mouth moving, then fade. A more
  // important line interrupts; a less important one waits in a one-slot
  // queue so a heading's line is never lost behind the hello.

  var said = {};
  var cool = {};
  var talkTimer = 0;
  var typeTimer = 0;
  var prioNow = 0;
  var pending = null;

  // Standing next to a heading he can be anywhere on the line; the bubble
  // takes whichever side has room and never runs off the screen.
  function fitBubble() {
    if (route) return;
    el.classList.remove("is-flip");
    var r = hit.getBoundingClientRect();
    var right = window.innerWidth - r.right - 16;
    var left = r.left - 16;
    if (right >= 170 || right >= left) {
      bubble.style.maxWidth = Math.max(120, Math.min(250, right)) + "px";
    } else {
      el.classList.add("is-flip");
      bubble.style.maxWidth = Math.max(120, Math.min(250, left)) + "px";
    }
  }
  if (!route) window.addEventListener("resize", fitBubble, { passive: true });

  // ==================== Where his words go ====================
  // Riding the route he is always over the page, so a bubble beside him
  // would sit on whatever scrolls past, and hiding it whenever something did
  // left most lines unread. Instead each line docks in the bottom corner on
  // his side of the screen, the least-read part of it, and a dotted wire runs
  // from him to it: the line the packet travels down. It stays put while the
  // page moves, long enough to read, on a phone as on a desktop.

  var current = "";
  var waiting = null;
  var wire = null;
  var NS = "http://www.w3.org/2000/svg";

  if (route) {
    bubble.classList.add("is-docked");
    bubble.setAttribute("aria-hidden", "true");
    document.body.appendChild(bubble);
    var wireSvg = document.createElementNS(NS, "svg");
    wireSvg.setAttribute("class", "ping-wire");
    wireSvg.setAttribute("aria-hidden", "true");
    wire = document.createElementNS(NS, "path");
    wireSvg.appendChild(wire);
    document.body.appendChild(wireSvg);
  }

  var READABLE = "h1, h2, h3, h4, p, a, li, dd, dt, label, input, textarea, button, span, em, strong, small, kbd";
  // The corner the current line is docked in (see dock()).
  var held = null;

  function showBubble(on) {
    held = null;
    bubble.classList.toggle("is-on", on);
    if (wire) wire.parentNode.classList.toggle("is-on", on);
    if (on) dock();
  }

  function dock() {
    if (!route || !bubble.classList.contains("is-on")) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var phone = vw <= 700;
    var gap = phone ? 12 : 24;
    var w = bubble.offsetWidth;
    var h = bubble.offsetHeight;
    var r = hit.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var nav = document.querySelector(".navbar");
    var navBottom = (nav ? nav.getBoundingClientRect().bottom : 64) + gap;
    var mine = cx < vw / 2 ? "L" : "R";
    var other = mine === "L" ? "R" : "L";

    // Where a bubble on a given side and edge would sit.
    function spot(side, atTop) {
      var l = side === "L" ? cx - 28 : cx + 28 - w;
      // Across the screen from him, it keeps to its own corner.
      if (side !== mine) l = side === "L" ? gap : vw - w - gap;
      l = clamp(l, gap, vw - w - gap);
      // Clear of the back-to-top button, which holds the bottom-right corner,
      // and on a phone clear of the nav dock along the foot of the screen.
      var bottom = gap + (phone ? 76 : side === "R" ? 64 : 0);
      return { side: side, left: l, top: atTop ? navBottom : vh - bottom - h };
    }
    function clear(sp) {
      return !(r.bottom > sp.top - 12 && r.top < sp.top + h + 12 && r.right > sp.left - 12 && r.left < sp.left + w + 12);
    }
    // Is there writing or a control under that spot? Sampled on a small
    // grid, looking through him and his own bubble.
    function quiet(sp) {
      for (var gx = 0; gx < 3; gx++) {
        for (var gy = 0; gy < 3; gy++) {
          var px = sp.left + 10 + ((w - 20) * gx) / 2;
          var py = sp.top + 8 + ((h - 16) * gy) / 2;
          var stack = document.elementsFromPoint(px, py);
          for (var k = 0; k < stack.length; k++) {
            var node = stack[k];
            if (node === bubble || bubble.contains(node) || el.contains(node)) continue;
            if (node.closest(".ping-wire, .navbar, #site-trace, .route-svg, .cursor-ring")) continue;
            if (node.matches(READABLE)) return false;
            // The first real thing under the point decides.
            if (node.matches("div, section, main, body, html, figure, img, ul, dl, form, fieldset, canvas, svg, path")) break;
            return false;
          }
        }
      }
      return true;
    }
    // His own bottom corner first; when he is down there himself (riding
    // under the gallery, or the goodbye), the other bottom corner; then the
    // top, under the nav. The corner is chosen once per line (when the
    // bubble opens), preferring one that covers no writing, and kept while
    // he stays clear of it, so the bubble does not hop about mid-sentence.
    var pick = null;
    if (held) {
      pick = spot(held.side, held.atTop);
      if (!clear(pick)) pick = held = null;
    }
    if (!pick) {
      var order = [
        [mine, false],
        [other, false],
        [mine, true],
        [other, true],
      ];
      for (var o = 0; o < order.length && !pick; o++) {
        // On a phone the top of the screen is where the next heading lands,
        // so his words keep to the foot of it, just above the dock.
        if (phone && order[o][1]) continue;
        var cand = spot(order[o][0], order[o][1]);
        if (clear(cand) && quiet(cand)) {
          pick = cand;
          held = { side: order[o][0], atTop: order[o][1] };
        }
      }
    }
    if (!pick) {
      pick = spot(mine, false);
      if (!clear(pick)) pick = spot(other, false);
      if (!clear(pick)) pick = spot(mine, true);
    }
    var side = pick.side;
    var left = pick.left;
    var top = pick.top;
    bubble.style.left = left.toFixed(1) + "px";
    bubble.style.top = top.toFixed(1) + "px";
    bubble.classList.toggle("is-flip", side === "R");
    bubble.classList.toggle("is-above", top < r.top);
    // The wire leaves him on the side facing the bubble and meets its near
    // corner, where the little square port sits.
    var below = top > r.top;
    var ax = cx;
    var ay = below ? r.bottom - r.height * 0.12 : r.top + r.height * 0.1;
    var bx = cx < left + w / 2 ? left + 4 : left + w - 4;
    var by = below ? top : top + h;
    var mid = (ay + by) / 2;
    wire.setAttribute("d", "M" + ax.toFixed(1) + " " + ay.toFixed(1) + " C" + ax.toFixed(1) + " " + mid.toFixed(1) + " " + bx.toFixed(1) + " " + mid.toFixed(1) + " " + bx.toFixed(1) + " " + by.toFixed(1));
  }
  window.addEventListener("resize", dock, { passive: true });
  // The page moves under a docked bubble, so once scrolling settles the
  // corner is chosen again against what is now beneath it.
  var settleTimer = 0;
  window.addEventListener(
    "scroll",
    function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () {
        held = null;
        dock();
      }, 160);
    },
    { passive: true },
  );

  // On a phone in the hero he waits off stage; a line worth saying is kept
  // for when he steps on.
  function retryWaiting() {
    if (!waiting || bubble.classList.contains("is-on") || el.classList.contains("is-passive")) return;
    if (performance.now() > waiting.until) {
      waiting = null;
      return;
    }
    var w = waiting;
    waiting = null;
    say(w.text, w.opt);
  }

  function say(text, opt) {
    opt = opt || {};
    fitBubble();
    var prio = opt.prio || 1;
    if (opt.once && said[opt.once]) return;
    if (opt.cool && cool[opt.cool] && performance.now() - cool[opt.cool] < (opt.coolMs || 15000)) return;
    if (route && el.classList.contains("is-passive")) {
      if (opt.once || prio >= 2) waiting = { text: text, opt: opt, until: performance.now() + 20000 };
      return;
    }
    if (waiting && waiting.text === text) waiting = null;
    if (bubble.classList.contains("is-on") && prio < prioNow) {
      if (opt.once || prio >= 2) {
        if (!pending || (pending.opt.prio || 1) <= prio) pending = { text: text, opt: opt };
      }
      return;
    }
    if (opt.once) said[opt.once] = true;
    if (opt.cool) cool[opt.cool] = performance.now();
    prioNow = prio;
    clearTimeout(talkTimer);
    clearInterval(typeTimer);
    if (mood === "sleep") setMood("awake");
    // Long enough to read: a beat to start, then about a word every 300ms.
    var hold = (opt.hold || 3200) + text.length * 45;
    if (opt.pose) setPose(opt.pose, hold);

    current = text;
    seq++;
    bubbleSeq.textContent = "SEQ " + (seq < 10 ? "0" : "") + seq;
    if (reduced) {
      setLine(text.length, text);
      showBubble(true);
    } else {
      el.classList.add("is-talking");
      bubble.classList.add("is-typing");
      var i = 0;
      setLine(0, text);
      showBubble(true);
      typeTimer = setInterval(function () {
        i++;
        setLine(i, text);
        if (i >= text.length) {
          clearInterval(typeTimer);
          el.classList.remove("is-talking");
          bubble.classList.remove("is-typing");
        }
      }, 26);
    }
    talkTimer = setTimeout(
      function () {
        showBubble(false);
        prioNow = 0;
        current = "";
        if (pending) {
          var next = pending;
          pending = null;
          setTimeout(function () {
            say(next.text, next.opt);
          }, 260);
        }
      },
      hold,
    );
  }

  // ==================== Where he is ====================

  var head = { x: -100, y: -100, active: false, side: "L" };
  var x = -100;
  var y = -100;
  var big = false;
  var flying = false;
  var raf = 0;
  var placed = false;

  function target() {
    // On a phone the route hugs the screen edge; he stays wholly on screen.
    var scale = parseFloat(getComputedStyle(el).getPropertyValue("--s")) || 1;
    var half = hit.offsetWidth * 0.5 * scale + 4;
    // On a phone he hugs the edge (a few pixels may tuck past it) so he does
    // not sit on the first letters of the text beside the route.
    var edge = window.innerWidth <= 700 ? half * 0.7 : half;
    if (!big) return { x: clamp(head.x, edge, window.innerWidth - edge), y: head.y };
    // Grown for the goodbye he steps in from the edge, so all of him is on
    // screen, and stands a little above the end of the route.
    var phone = window.innerWidth <= 700;
    var step = Math.min(90, window.innerWidth * 0.14);
    var margin = Math.min(90, window.innerWidth * 0.2);
    var sx = phone ? 70 : head.side === "L" ? head.x + step : head.x - step;
    var sy = head.y - (phone ? 0 : 40);
    // Never on top of the send button: same colour, and he'd bury it.
    var btn = document.querySelector('#contact-form button[type="submit"]');
    if (btn) {
      var b = btn.getBoundingClientRect();
      var reach = hit.offsetHeight * 0.6 * (phone ? 1.9 : 2.6);
      if (b.bottom > sy - reach && b.top < sy + reach) sy = b.bottom + reach + 6;
    }
    return { x: clamp(sx, margin, window.innerWidth - margin), y: sy };
  }

  function render() {
    el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    el.classList.toggle("is-flip", x > window.innerWidth * 0.55);
    // On a phone in the hero he stands at the edge of the main buttons; taps
    // there belong to the buttons, not to him.
    el.classList.toggle("is-passive", window.innerWidth <= 700 && window.scrollY < window.innerHeight * 0.8);
    dock();
  }

  function follow() {
    if (flying || !route) return;
    var t = target();
    if (!placed || reduced || (!big && !el.classList.contains("is-easing"))) {
      x = t.x;
      y = t.y;
      placed = true;
      render();
      return;
    }
    if (!raf) raf = requestAnimationFrame(ease);
  }

  // Easing toward the stage when he grows or shrinks, then back on the line.
  function ease() {
    raf = 0;
    var t = target();
    x += (t.x - x) * 0.16;
    y += (t.y - y) * 0.16;
    render();
    if (Math.abs(t.x - x) > 0.5 || Math.abs(t.y - y) > 0.5) raf = requestAnimationFrame(ease);
    else if (!big) el.classList.remove("is-easing");
  }

  // ==================== Reactions ====================

  var lastActive = performance.now();
  function wake() {
    lastActive = performance.now();
    // Waking is silent, so it never pushes aside the line for the section
    // the reader has just reached.
    if (mood === "sleep") {
      setMood("awake");
      hop();
    }
  }

  setInterval(function () {
    if (mood === "awake" && !flying && !big && performance.now() - lastActive > 45000) {
      setMood("sleep");
      setPose("");
      showBubble(false);
    }
  }, 1000);

  var settleTimer = 0;
  var lastScroll = window.scrollY;

  window.addEventListener(
    "scroll",
    function () {
      var dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      wake();
      // A pixel sprite can't stretch without breaking its grid, so instead
      // of squashing he walks: his feet step while the page moves, and he
      // looks the way it is going.
      if (!reduced && !big) {
        el.classList.add("is-walking");
        look(0, dy > 0 ? 1.5 : -1.5);
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () {
          el.classList.remove("is-walking");
          look(0, 0);
        }, 160);
      }
      // A jump away from the bottom (a nav link, the terminal) can leave the
      // route's end lit, so the goodbye never hears it was left: once the end
      // is well off screen, he shrinks back regardless.
      if (big && !flying && route && route.endPoint) {
        var endPt = route.endPoint();
        if (!endPt || endPt.y > window.innerHeight * 1.15 || endPt.y < -window.innerHeight * 0.5) {
          clearTimeout(endTimer);
          growBig(false);
          setPose("");
        }
      }
      retryWaiting();
    },
    { passive: true },
  );

  if (fine) {
    window.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType !== "mouse") return;
        var r = hit.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var d = Math.hypot(dx, dy) || 1;
        look((dx / d) * 1.6, (dy / d) * 1.6);
        wake();
      },
      { passive: true },
    );
  }

  // Tapping him.
  var taps = 0;
  var tapTimer = 0;
  var TAPS = ["Hi!", "Hehe, that tickles.", "Ping! Yes, it's me.", "Careful, I'm fragile data."];
  hit.addEventListener("click", function () {
    wake();
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () {
      taps = 0;
    }, 2200);
    if (taps >= 5) {
      taps = 0;
      setMood("dizzy");
      setPose("cheer", 2600);
      say("Whoa… too many pings… dizzy…", { prio: 3 });
      setTimeout(function () {
        if (mood === "dizzy") {
          setMood("awake");
          say("Okay. I'm okay.", { prio: 2 });
        }
      }, 2600);
      return;
    }
    hop();
    happy(600);
    // A tap is a question waiting to be asked: the chat opens, and his quips
    // are kept for taps while it is already open.
    if (!window.PingChat || !window.PingChat.isOpen()) {
      setPose("wave", 900);
      return openChat(launcher);
    }
    say(TAPS[(taps - 1) % TAPS.length], { prio: 3, pose: "wave", hold: 1400 });
  });

  // ==================== Ask Ping ====================
  // Tapping Ping opens the chat panel, assets/js/ping-chat.js, which is
  // fetched the first time it is wanted.
  var me = document.currentScript || document.querySelector('script[src*="ping.js"]');
  var chatSrc = me && me.src ? me.src.replace(/ping\.js/, "ping-chat.js") : "assets/js/ping-chat.js";
  var chatLoad = null;

  function openChat(from) {
    if (window.PingChat) return window.PingChat.open(from);
    if (!chatLoad) {
      chatLoad = new Promise(function (resolve, reject) {
        var sc = document.createElement("script");
        sc.src = chatSrc;
        sc.onload = resolve;
        sc.onerror = function () {
          chatLoad = null;
          reject();
        };
        document.head.appendChild(sc);
      });
    }
    chatLoad.then(
      function () {
        window.PingChat.open(from);
      },
      function () {},
    );
  }

  // Ping is the button: a small "ask" mark rides on his shoulder, and a tap
  // on him opens the chat. He is hidden from assistive technology, so there
  // is also a real button for keyboards and screen readers; on pages with
  // the route it shows only when it has focus.
  var mark = document.createElement("span");
  mark.className = "ping-ask";
  mark.innerHTML = "<i></i><i></i><i></i>";
  hit.appendChild(mark);

  var launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "ask-launch";
  launcher.setAttribute("aria-haspopup", "dialog");
  launcher.innerHTML =
    '<img src="/favicon.svg" alt="" width="30" height="30" /><span class="ask-launch-text">Ask Ping a question</span>' +
    '<span class="ping-ask" aria-hidden="true"><i></i><i></i><i></i></span>';
  document.body.appendChild(launcher);
  // Where he stands beside a heading instead of riding the route, he
  // scrolls away with it. Then this button is Ping, docked in the corner:
  // it steps in when he leaves the screen and out when he is back, so there
  // is only ever one of him.
  if (!route && "IntersectionObserver" in window) {
    launcher.classList.add("is-dock");
    new IntersectionObserver(function (entries) {
      launcher.classList.toggle("is-on", !entries[0].isIntersecting);
    }).observe(hit);
  }
  launcher.addEventListener("click", function () {
    openChat(launcher);
  });
  // Any button in the page marked data-ask-ping opens it too.
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-ask-ping]");
    if (b) openChat(b);
  });

  // He reacts while he works on an answer.
  document.addEventListener("ping:asked", function () {
    wake();
    setPose("carry", 4000);
  });
  document.addEventListener("ping:answered", function () {
    hop();
    happy(900);
  });

  // Hovering a project: a comment, pointing at it, once each.
  if (fine) {
    Object.keys(QUIPS).forEach(function (id) {
      var card = document.getElementById(id);
      if (!card) return;
      card.addEventListener("pointerenter", function () {
        say(QUIPS[id], { once: "quip-" + id, prio: 1, pose: pointAt(card) });
      });
    });
  }

  // A theme change gets noticed.
  var lastTheme = html.getAttribute("data-theme");
  new MutationObserver(function () {
    var t = html.getAttribute("data-theme");
    if (t !== lastTheme) {
      say(t === "dark" ? "Ahh, dark mode. Much better." : "Lights on! My eyes!", { prio: 2, cool: "theme", coolMs: 4000 });
    }
    lastTheme = t;
  }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });

  // ==================== Following the route ====================

  // Said once a visit, not once a page: the tab remembers (sessionStorage),
  // so someone going from page to page isn't told the same thing again.
  var heard = {
    has: function (k) {
      try {
        return sessionStorage.getItem("ping-heard-" + k) === "1";
      } catch (e) {
        return false;
      }
    },
    add: function (k) {
      try {
        sessionStorage.setItem("ping-heard-" + k, "1");
      } catch (e) {}
    },
  };

  function hopLine(e) {
    // On a phone his box would sit on the very project card it points at.
    if (isHome && e.id === "projects" && window.innerWidth <= 700) return null;
    if (isHome) return HOME[e.id];
    if (e.id === "intro") return null;
    for (var i = 0; i < CASE.length; i++) if (CASE[i][0].test(e.label)) return CASE[i][1];
    return null;
  }

  function growBig(on) {
    if (reduced || big === on) {
      big = on;
      return;
    }
    big = on;
    el.classList.add("is-easing");
    el.classList.toggle("is-big", on);
    follow();
  }

  var endTimer = 0;

  if (route) {
    route.subscribe(function (e) {
      if (e.type === "move") {
        head = e.head;
        el.classList.toggle("is-on", head.active);
        follow();
        return;
      }
      if (e.type === "hop" && e.on && e.dir >= 0) {
        hop();
        happy(800);
        var line = hopLine(e);
        // Point across the page, away from the side the hop is on.
        if (line && !heard.has(line)) {
          heard.add(line);
          say(line, { once: "hop-" + e.id, prio: 2, pose: e.side === "R" ? "point-l" : "point-r" });
        }
        return;
      }
      if (e.type === "end") {
        // The bottom of a page can bounce (a phone's rubber-band scroll, the
        // reading line settling), so a brief off-and-on at the end is ignored:
        // he only shrinks after staying off the end for a moment, and says
        // goodbye on each real arrival.
        clearTimeout(endTimer);
        if (e.on) {
          if (big) return;
          growBig(true);
          endTimer = setTimeout(function () {
            happy(1800);
            say(isHome ? "Pong! Thanks for visiting. Bye for now!" : "Pong! That's the whole story. Bye for now!", {
              prio: 3,
              hold: 4200,
              pose: "wave",
            });
          }, 380);
        } else {
          endTimer = setTimeout(function () {
            growBig(false);
            setPose("");
          }, 700);
        }
      }
    });
  }

  // ==================== Carrying the message ====================
  // The contact form (form.js) announces the real request. Ping flies to
  // the button, waits there holding the envelope until the answer comes
  // back, then carries it to the end of the route.

  function fly(from, to, ms, arc) {
    return new Promise(function (res) {
      if (reduced || ms <= 0) {
        x = to.x;
        y = to.y;
        render();
        return res();
      }
      var t0 = performance.now();
      (function step(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        var k = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        x = from.x + (to.x - from.x) * k;
        y = from.y + (to.y - from.y) * k - Math.sin(Math.PI * k) * arc;
        render();
        if (t < 1) requestAnimationFrame(step);
        else res();
      })(t0);
    });
  }

  var delivery = null;

  document.addEventListener("contact:sending", function () {
    if (!route || flying) return;
    var btn = document.querySelector('#contact-form button[type="submit"]');
    if (!btn) return;
    wake();
    flying = true;
    growBig(false);
    var b = btn.getBoundingClientRect();
    say("Got it! Delivering…", { prio: 3, pose: "carry", hold: 1200 });
    delivery = fly({ x: x, y: y }, { x: b.left + b.width / 2, y: b.top - 22 }, 600, 60).then(function () {
      el.classList.add("is-carrying");
      setPose("carry");
      hop();
    });
  });

  function homeward(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    })
      .then(function () {
        return fly({ x: x, y: y }, { x: head.x, y: head.y }, 700, 40);
      })
      .then(function () {
        flying = false;
        setPose("");
        follow();
      });
  }

  document.addEventListener("contact:sent", function (e) {
    if (!delivery) return;
    var detail = e.detail || {};
    delivery = delivery
      .then(function () {
        var end = route.endPoint() || { x: x, y: y };
        return fly({ x: x, y: y }, { x: end.x, y: end.y - 26 }, 900, 120);
      })
      .then(function () {
        el.classList.remove("is-carrying");
        hop();
        happy(1400);
        setPose("cheer", 1400);
        say("Delivered! " + (detail.status || 200) + " OK. Ryan will get back to you.", { prio: 3, hold: 3000 });
        return homeward(2600);
      })
      .then(function () {
        delivery = null;
      });
  });

  document.addEventListener("contact:failed", function () {
    if (!delivery) return;
    delivery = delivery
      .then(function () {
        el.classList.remove("is-carrying");
        setMood("sad");
        setPose("droop");
        say("Uh oh, it bounced. Try again in a moment?", { prio: 3, hold: 2600 });
        return homeward(2600);
      })
      .then(function () {
        if (mood === "sad") setMood("awake");
        delivery = null;
      });
  });

  // ==================== Hello ====================

  function hello() {
    var back = store.get("ping-seen");
    store.set("ping-seen", "1");
    hop();
    happy(1000);
    var line;
    if (!route) line = STANDALONE[spot.getAttribute("data-ping-spot")] || "Ping!";
    else if (isHome) line = back ? "Ping! Welcome back. Tap me to ask a question." : "Ping! Tap me any time to ask a question.";
    else if (/this site/i.test(pageTitle)) line = "Ping! This page is about how I was made. Kind of.";
    else line = "Ping! Let's dig into " + pageTitle.trim() + ".";
    setPose("cheer", 700);
    // One greeting a visit. On the pages after the first he waves and
    // keeps quiet (the 404 page keeps its line: it is the page's joke).
    var lost = !route && spot.getAttribute("data-ping-spot") === "lost";
    if (heard.has("hello") && !lost) return;
    heard.add("hello");
    setTimeout(function () {
      // Priority 2, the same as a section's line: someone who starts
      // scrolling straight away hears about the section they reach rather
      // than the end of the greeting. Short on a phone, where it sits over
      // the hero's buttons.
      say(line, { prio: 2, hold: window.innerWidth <= 700 ? 1500 : 2800, pose: route ? "wave" : "point-r" });
    }, reduced ? 0 : 450);
  }

  // On a first visit to the home page, wait for the intro to finish.
  (function start() {
    if (html.classList.contains("intro-pending")) return setTimeout(start, 200);
    setTimeout(hello, 600);
  })();
})();
