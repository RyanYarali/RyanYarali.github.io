/**
 * Ping
 * ----
 * The little packet that rides the route. In networking a ping is how one
 * machine says "hello, are you there?", and the answer is a pong, so Ping
 * says hello when you arrive and "Pong" when you reach the end.
 *
 * He is drawn in SVG from the palette tokens, so he recolours with the
 * palette and the theme. He blinks, looks the way the page is moving,
 * stretches with scroll speed, hops at each heading and points at what it
 * introduces, dozes off when nothing happens, carries the contact form's
 * message to the inbox, and at the end of the route grows big to wave
 * goodbye. On pages without a route he stands next to the heading.
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
  var CASE = [
    [/overview/i, "Here's the story."],
    [/the site|screens/i, "Screenshots! The fun part."],
    [/brief/i, "What the client asked for."],
    [/design/i, "Pretty, right?"],
    [/stack|tech/i, "Ooh, the good stuff."],
    [/what i built|features?/i, "Here's what he built."],
    [/seo|search/i, "Google likes this bit."],
    [/client|working with/i, "Straight from the client."],
    [/outcome|result/i, "And how it turned out."],
    [/the idea/i, "My favourite part. It's about me!"],
    [/motion/i, "Watch me move!"],
    [/performance/i, "Fast. Like me."],
    [/accessib/i, "Everyone's welcome here."],
    [/left out/i, "Knowing when to stop."],
    [/problem|challenge/i, "The tricky part."],
    [/team/i, "Teamwork!"],
    [/learn/i, "Lessons learned."],
  ];

  var QUIPS = {
    "work-nooklook": "Ooh, the photo studio. That one's live!",
    "work-vancobab": "Kebab truck site. I can smell it from here.",
    "work-termeh": "Bilingual, with an admin panel. Fancy.",
    "work-taskmate": "Built for students. Like Ryan!",
  };

  var STANDALONE = {
    lost: "Oops. I got lost too. Let's go home?",
    resume: "The PDF's still cooking. LinkedIn has the full story!",
    projects: "Every project, in one place. Tap one!",
  };

  var isHome = !!document.getElementById("hero");
  var pageTitle = (document.querySelector(".project-hero h1") || {}).textContent || "";

  // ==================== Building him ====================

  // A packet with a face: a rounded square in the accent, pill eyes, and
  // signal arcs for an antenna that pulse while he talks. Flat colour, no
  // shine, so he reads as part of the same bold, minimal system as the page.
  var SVG =
    '<svg viewBox="-10 -16 60 64" aria-hidden="true" focusable="false">' +
    '<g class="ping-arm ping-arm-l"><line x1="8" y1="30" x2="8" y2="37"/><circle cx="8" cy="39.5" r="3.2"/></g>' +
    '<g class="ping-arm ping-arm-r"><line x1="32" y1="30" x2="32" y2="37"/><circle cx="32" cy="39.5" r="3.2"/></g>' +
    '<g class="ping-antenna">' +
    '<circle class="ping-signal-dot" cx="20" cy="7" r="2.2"/>' +
    '<path class="ping-signal ping-signal-1" d="M15.2 3.4 Q20 -0.8 24.8 3.4"/>' +
    '<path class="ping-signal ping-signal-2" d="M11.6 -0.4 Q20 -7.2 28.4 -0.4"/>' +
    "</g>" +
    '<rect class="ping-skin" x="5" y="12" width="30" height="30" rx="10.5"/>' +
    '<g class="ping-eyes">' +
    '<rect class="ping-eye" x="11.4" y="20" width="6.2" height="10.4" rx="3.1"/>' +
    '<rect class="ping-eye" x="22.4" y="20" width="6.2" height="10.4" rx="3.1"/>' +
    '<g class="ping-pupils"><circle cx="14.5" cy="26.4" r="2.1"/><circle cx="25.5" cy="26.4" r="2.1"/></g>' +
    "</g>" +
    '<g class="ping-face ping-face-happy"><path d="M11.4 26.5 Q14.5 22 17.6 26.5"/><path d="M22.4 26.5 Q25.5 22 28.6 26.5"/></g>' +
    '<g class="ping-face ping-face-sleep"><path d="M11.4 25.5 H17.6"/><path d="M22.4 25.5 H28.6"/></g>' +
    '<g class="ping-face ping-face-dizzy"><g><path d="M14.5 25.5 m-3 0 a3 3 0 1 0 6 0 a1.8 1.8 0 1 0 -3.6 0"/></g>' +
    '<g><path d="M25.5 25.5 m-3 0 a3 3 0 1 0 6 0 a1.8 1.8 0 1 0 -3.6 0"/></g></g>' +
    '<path class="ping-mouth ping-mouth-smile" d="M17.8 34.4 Q20 36.2 22.2 34.4"/>' +
    '<path class="ping-mouth ping-mouth-sad" d="M17.8 35.6 Q20 33.8 22.2 35.6"/>' +
    '<rect class="ping-mouth-open" x="18" y="33.4" width="4" height="3.2" rx="1.4"/>' +
    '<g class="ping-envelope" transform="translate(9 -14)"><rect x="0" y="0" width="22" height="15" rx="2"/><path d="M1 1.5 L11 9 L21 1.5"/></g>' +
    "</svg>";

  var el = document.createElement("div");
  el.className = "ping";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    // Each line arrives as a packet: a header with its sequence number, then
    // the payload typing out. The full line is laid out from the start (the
    // untyped rest is transparent), so the bubble never grows while typing.
    '<div class="ping-bubble"><span class="ping-bubble-head"></span>' +
    '<span class="ping-bubble-text"><span class="ping-typed"></span><span class="ping-rest"></span></span></div>' +
    '<span class="ping-zzz">z</span>' +
    '<div class="ping-hit" data-cursor="link"><div class="ping-scale"><div class="ping-float"><div class="ping-squash">' +
    SVG +
    "</div></div></div></div>";

  var bubble = el.querySelector(".ping-bubble");
  var bubbleHead = el.querySelector(".ping-bubble-head");
  var bubbleText = el.querySelector(".ping-bubble-text");
  var typed = el.querySelector(".ping-typed");
  var rest = el.querySelector(".ping-rest");
  var seq = 0;

  function setLine(shown, all) {
    typed.textContent = all.slice(0, shown);
    rest.textContent = all.slice(shown);
  }
  var squash = el.querySelector(".ping-squash");
  var pupils = el.querySelector(".ping-pupils");
  var eyes = el.querySelector(".ping-eyes");
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
      eyes.classList.add("is-blink");
      setTimeout(function () {
        eyes.classList.remove("is-blink");
      }, 110);
    }
    setTimeout(blink, 2200 + Math.random() * 3200);
  })();

  function look(x, y) {
    pupils.style.transform = "translate(" + clamp(x, -1.6, 1.6).toFixed(2) + "px," + clamp(y, -1.6, 1.6).toFixed(2) + "px)";
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

  // ==================== Staying out of the way ====================
  // He rides a fixed line while the page scrolls under him, so his bubble
  // can land on anything. It never covers content: a line that would is held
  // back until the space under it clears, and a showing bubble that content
  // scrolls into is put away.

  var CONTENT = "a, button, input, textarea, select, label, img, picture, figure, h1, h2, h3, h4, p, li, .btn, .work-card, .hero-name";
  var current = "";
  var waiting = null;

  function bubbleRect(text) {
    var old = bubbleText.textContent;
    var oldTyped = typed.textContent.length;
    setLine(0, text);
    // Measured at full size: with its transition running, the box would
    // report the scaled-down pop-in state and look smaller than it is.
    bubble.style.transition = "none";
    bubble.style.transform = "none";
    var r = bubble.getBoundingClientRect();
    bubble.style.transform = "";
    void bubble.offsetWidth;
    bubble.style.transition = "";
    setLine(oldTyped, old);
    return r;
  }

  function blocked(text) {
    if (!route) return false;
    // On a phone in the hero he is hidden behind the main buttons.
    if (el.classList.contains("is-passive")) return true;
    var r = bubbleRect(text);
    if (r.top < 0 || r.left < 0 || r.right > window.innerWidth || r.bottom > window.innerHeight) return true;
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        var px = r.left + 4 + ((r.width - 8) * i) / 2;
        var py = r.top + 4 + ((r.height - 8) * j) / 2;
        var hits = document.elementsFromPoint(px, py);
        for (var k = 0; k < hits.length; k++) {
          if (el.contains(hits[k])) continue;
          if (hits[k].closest(CONTENT)) return true;
          break;
        }
      }
    }
    return false;
  }

  function hush() {
    clearTimeout(talkTimer);
    clearInterval(typeTimer);
    el.classList.remove("is-talking");
    bubble.classList.remove("is-on", "is-typing");
    prioNow = 0;
    current = "";
  }

  var guardRaf = 0;
  function guard() {
    if (!route || guardRaf) return;
    guardRaf = requestAnimationFrame(function () {
      guardRaf = 0;
      if (current && bubble.classList.contains("is-on") && blocked(current)) hush();
      if (waiting && !bubble.classList.contains("is-on")) {
        if (performance.now() > waiting.until) waiting = null;
        else if (!blocked(waiting.text)) {
          var w = waiting;
          waiting = null;
          say(w.text, w.opt);
        }
      }
    });
  }

  function say(text, opt) {
    opt = opt || {};
    fitBubble();
    var prio = opt.prio || 1;
    if (opt.once && said[opt.once]) return;
    if (opt.cool && cool[opt.cool] && performance.now() - cool[opt.cool] < (opt.coolMs || 15000)) return;
    if (blocked(text)) {
      // Worth waiting a few seconds of scrolling for; small talk is dropped.
      if (opt.once || prio >= 2) waiting = { text: text, opt: opt, until: performance.now() + 8000 };
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
    if (opt.pose) setPose(opt.pose, (opt.hold || 2200) + text.length * 30);

    current = text;
    seq++;
    bubbleHead.textContent = "PING · seq " + (seq < 10 ? "0" : "") + seq;
    bubble.classList.add("is-on");
    if (reduced) {
      setLine(text.length, text);
    } else {
      el.classList.add("is-talking");
      bubble.classList.add("is-typing");
      var i = 0;
      setLine(0, text);
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
        bubble.classList.remove("is-on");
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
      (opt.hold || 2200) + text.length * 30,
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
    var half = hit.offsetWidth * 0.5 * (window.innerWidth <= 700 ? 0.72 : 1) + 4;
    if (!big) return { x: clamp(head.x, half, window.innerWidth - half), y: head.y };
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
      var reach = hit.offsetHeight * 0.6 * (phone ? 1.9 : 2.3);
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
      bubble.classList.remove("is-on");
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
      if (!reduced && !big) {
        var s = clamp(Math.abs(dy) / 60, 0, 1);
        squash.style.transform = "scale(" + (1 - s * 0.18).toFixed(3) + "," + (1 + s * 0.32).toFixed(3) + ")";
        look(0, dy > 0 ? 1.5 : -1.5);
        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () {
          squash.style.transform = "scale(1.12,0.88)";
          setTimeout(function () {
            squash.style.transform = "";
          }, 140);
          look(0, 0);
        }, 140);
      }
      guard();
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
    say(TAPS[(taps - 1) % TAPS.length], { prio: 3, pose: "wave", hold: 1400 });
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

  function hopLine(e) {
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
        if (line) say(line, { once: "hop-" + e.id, prio: 2, pose: e.side === "R" ? "point-l" : "point-r" });
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
    else if (isHome) line = back ? "Ping! Welcome back." : "Ping! I'll show you around.";
    else if (/this site/i.test(pageTitle)) line = "Ping! This page is about how I was made. Kind of.";
    else line = "Ping! Let's dig into " + pageTitle.trim() + ".";
    setPose("cheer", 700);
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
