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

  var HOME = {
    about: "This is Ryan. Full-stack, and a proper networking nerd.",
    projects: "Real clients. Real live sites. Have a look!",
    skills: "The toolbox. He actually uses all of it.",
    learning: "Term 3 at BCIT. Still levelling up.",
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
    [/client|working with/i, "Happy client, happy Ryan."],
    [/outcome|result/i, "And how it turned out."],
    [/the idea/i, "My favourite part. It's about me!"],
    [/motion/i, "Watch me move!"],
    [/performance/i, "Fast. Like me."],
    [/accessib/i, "Everyone's welcome here."],
    [/left out/i, "Knowing when to stop."],
    [/how it was made/i, "Made with care. And a little AI."],
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

  var SVG =
    '<svg viewBox="-10 -16 60 64" aria-hidden="true" focusable="false">' +
    '<g class="ping-arm ping-arm-l"><line x1="8" y1="28" x2="8" y2="38"/><circle cx="8" cy="40" r="3.6"/></g>' +
    '<g class="ping-arm ping-arm-r"><line x1="32" y1="28" x2="32" y2="38"/><circle cx="32" cy="40" r="3.6"/></g>' +
    '<g class="ping-antenna"><line x1="20" y1="12" x2="20" y2="4"/><circle cx="20" cy="3.5" r="2.8"/></g>' +
    '<path class="ping-skin" d="M20 11 C29.5 11 35 18.5 35 27 C35 36 28.5 42 20 42 C11.5 42 5 36 5 27 C5 18.5 10.5 11 20 11 Z"/>' +
    '<ellipse class="ping-shine" cx="13" cy="18" rx="4.5" ry="2.6" transform="rotate(-28 13 18)"/>' +
    '<g class="ping-eyes">' +
    '<ellipse class="ping-eye" cx="14.5" cy="25" rx="4.3" ry="4.9"/>' +
    '<ellipse class="ping-eye" cx="25.5" cy="25" rx="4.3" ry="4.9"/>' +
    '<g class="ping-pupils"><circle cx="14.5" cy="25.6" r="2.3"/><circle cx="25.5" cy="25.6" r="2.3"/></g>' +
    "</g>" +
    '<g class="ping-face ping-face-happy"><path d="M11 26 Q14.5 21.5 18 26"/><path d="M22 26 Q25.5 21.5 29 26"/></g>' +
    '<g class="ping-face ping-face-sleep"><path d="M11 26 Q14.5 28.5 18 26"/><path d="M22 26 Q25.5 28.5 29 26"/></g>' +
    '<g class="ping-face ping-face-dizzy"><g><path d="M14.5 25 m-3 0 a3 3 0 1 0 6 0 a1.8 1.8 0 1 0 -3.6 0"/></g>' +
    '<g><path d="M25.5 25 m-3 0 a3 3 0 1 0 6 0 a1.8 1.8 0 1 0 -3.6 0"/></g></g>' +
    '<path class="ping-mouth ping-mouth-smile" d="M17.5 33 Q20 35.2 22.5 33"/>' +
    '<path class="ping-mouth ping-mouth-sad" d="M17.5 34.5 Q20 32.4 22.5 34.5"/>' +
    '<ellipse class="ping-mouth-open" cx="20" cy="34" rx="2.4" ry="2"/>' +
    '<g class="ping-envelope" transform="translate(9 -14)"><rect x="0" y="0" width="22" height="15" rx="2.5"/><path d="M1 1.5 L11 9 L21 1.5"/></g>' +
    "</svg>";

  var el = document.createElement("div");
  el.className = "ping";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<div class="ping-bubble"></div>' +
    '<span class="ping-zzz">z</span>' +
    '<div class="ping-hit" data-cursor="link"><div class="ping-scale"><div class="ping-float"><div class="ping-squash">' +
    SVG +
    "</div></div></div></div>";

  var bubble = el.querySelector(".ping-bubble");
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

  function say(text, opt) {
    opt = opt || {};
    fitBubble();
    var prio = opt.prio || 1;
    if (opt.once && said[opt.once]) return;
    if (opt.cool && cool[opt.cool] && performance.now() - cool[opt.cool] < (opt.coolMs || 15000)) return;
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

    bubble.classList.add("is-on");
    if (reduced) {
      bubble.textContent = text;
    } else {
      el.classList.add("is-talking");
      var i = 0;
      bubble.textContent = "";
      typeTimer = setInterval(function () {
        i++;
        bubble.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(typeTimer);
          el.classList.remove("is-talking");
        }
      }, 26);
    }
    talkTimer = setTimeout(
      function () {
        bubble.classList.remove("is-on");
        prioNow = 0;
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
    var half = hit.offsetWidth * 0.5 * (window.innerWidth <= 700 ? 0.85 : 1) + 4;
    if (!big) return { x: clamp(head.x, half, window.innerWidth - half), y: head.y };
    // Grown for the goodbye he steps in from the edge, so all of him is on
    // screen, and stands a little above the end of the route.
    var step = Math.min(90, window.innerWidth * 0.14);
    var margin = Math.min(90, window.innerWidth * 0.2);
    var sx = head.side === "L" ? head.x + step : head.x - step;
    return { x: clamp(sx, margin, window.innerWidth - margin), y: head.y - 40 };
  }

  function render() {
    el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    el.classList.toggle("is-flip", x > window.innerWidth * 0.55);
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
    if (mood === "sleep") {
      setMood("awake");
      hop();
      say("Huh?! I'm up, I'm up.", { prio: 2, pose: "cheer", hold: 1400 });
    }
  }

  setInterval(function () {
    if (mood === "awake" && !flying && !big && performance.now() - lastActive > 12000) {
      setMood("sleep");
      setPose("");
      bubble.classList.remove("is-on");
    }
  }, 1000);

  var settleTimer = 0;
  var upRun = 0;
  var lastScroll = window.scrollY;
  var wheeSaid = false;

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
      if (Math.abs(dy) > 90) say("Whoa, slow down! I'm only 64 bytes.", { cool: "fast", coolMs: 20000, pose: "cheer" });
      if (dy < 0) {
        upRun -= dy;
        if (upRun > 900) {
          upRun = 0;
          say("Going back? Forgot something?", { cool: "up", coolMs: 25000 });
        }
      } else {
        upRun = 0;
      }
      // Riding the sideways stretch under the gallery.
      if (!wheeSaid && html.classList.contains("work-pinned")) {
        var work = document.getElementById("work");
        var p = work ? parseFloat(work.style.getPropertyValue("--work-p")) || 0 : 0;
        if (p > 0.25 && p < 0.8) {
          wheeSaid = true;
          say("Wheee! Ride with the cards!", { prio: 2, pose: "cheer" });
        }
      }
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

  // A palette or theme change gets noticed.
  var lastTheme = html.getAttribute("data-theme");
  var lastPalette = html.getAttribute("data-palette");
  new MutationObserver(function () {
    var t = html.getAttribute("data-theme");
    var p = html.getAttribute("data-palette");
    if (t !== lastTheme) {
      say(t === "dark" ? "Ahh, dark mode. Much better." : "Lights on! My eyes!", { prio: 2, cool: "theme", coolMs: 4000 });
    } else if (p !== lastPalette) {
      var LINES = {
        ocean: "Back to blue. Classic.",
        violet: "Purple! Very royal.",
        emerald: "Green suits me, right?",
        crimson: "Ooh, red. Very dramatic.",
        cyan: "Cyan. Cool and crisp.",
        magenta: "Magenta! Now we're talking.",
      };
      say(LINES[p] || "New colours!", { prio: 2, cool: "palette", coolMs: 2500, pose: "cheer" });
      hop();
    }
    lastTheme = t;
    lastPalette = p;
  }).observe(html, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });

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
        if (e.on) {
          growBig(true);
          setTimeout(function () {
            happy(1800);
            say(isHome ? "Pong! Thanks for visiting. Bye for now!" : "Pong! That's the whole story. Bye for now!", {
              prio: 3,
              hold: 4200,
              pose: "wave",
              cool: "bye",
              coolMs: 8000,
            });
          }, 380);
        } else {
          growBig(false);
          setPose("");
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
    else if (isHome) line = back ? "Ping! Welcome back. Missed you." : "Ping! I'm Ping. I'll show you around.";
    else if (/this site/i.test(pageTitle)) line = "Ping! This page is about how I was made. Kind of.";
    else line = "Ping! Let's dig into " + pageTitle.trim() + ".";
    setPose("cheer", 700);
    setTimeout(function () {
      say(line, { prio: 3, hold: 2800, pose: route ? "wave" : "point-r" });
    }, reduced ? 0 : 450);
    var h = new Date().getHours();
    if (route && (h >= 23 || h < 5)) {
      setTimeout(function () {
        say("Up late, huh? Me too.", { prio: 2 });
      }, 5200);
    }
  }

  // On a first visit to the home page, wait for the intro to finish.
  (function start() {
    if (html.classList.contains("intro-pending")) return setTimeout(start, 200);
    setTimeout(hello, 600);
  })();
})();
