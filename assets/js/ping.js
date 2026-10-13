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

  function showBubble(on) {
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
    var side = cx < vw / 2 ? "L" : "R";
    var left = side === "L" ? cx - 28 : cx + 28 - w;
    left = clamp(left, gap, vw - w - gap);
    // Clear of the back-to-top button, which holds the bottom-right corner
    // (and, on a phone, sits where a full-width bubble would reach).
    var bottom = gap + (side === "R" || phone ? 64 : 0);
    var top = vh - bottom - h;
    // When he is down in that corner himself (the goodbye), the line docks
    // under the nav instead.
    if (r.bottom > top - 12 && r.top < top + h + 12 && r.right > left - 12 && r.left < left + w + 12) {
      var nav = document.querySelector(".navbar");
      top = (nav ? nav.getBoundingClientRect().bottom : 64) + gap;
    }
    bubble.style.left = left.toFixed(1) + "px";
    bubble.style.top = top.toFixed(1) + "px";
    bubble.classList.toggle("is-flip", side === "R");
    bubble.classList.toggle("is-above", top < r.top);
    // The wire leaves him on the side facing the bubble and meets its near
    // corner, where the little square port sits.
    var below = top > r.top;
    var ax = cx;
    var ay = below ? r.bottom - r.height * 0.12 : r.top + r.height * 0.1;
    var bx = side === "L" ? left + 4 : left + w - 4;
    var by = below ? top : top + h;
    var mid = (ay + by) / 2;
    wire.setAttribute("d", "M" + ax.toFixed(1) + " " + ay.toFixed(1) + " C" + ax.toFixed(1) + " " + mid.toFixed(1) + " " + bx.toFixed(1) + " " + mid.toFixed(1) + " " + bx.toFixed(1) + " " + by.toFixed(1));
  }
  window.addEventListener("resize", dock, { passive: true });

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
