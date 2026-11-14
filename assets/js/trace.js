/**
 * A joke for friends. Loaded only by a link carrying ?s=<name> or ?n=<name>
 * (index.html), never on an ordinary visit.
 *
 * The page opens as usual, breaks, and turns into a "trace" of the visitor:
 * first real things (what every website is told about a visitor: address,
 * rough place, provider, device, screen, languages, clock), then things that
 * are made up (camera, photos, chats, an "upload to Ryan"), then Ping owns
 * up and says which was which.
 *
 * Rules it keeps: it asks for no permission (no camera, microphone or
 * location prompt), it stores nothing, and it sends nothing anywhere. The
 * address details come from GET /api/trace, which only hands the visitor
 * their own request back (worker/trace.js). Seven taps or Escape end it early.
 *
 *   ?s=  the name, base64 (btoa("ATIEH") -> QVRJRUg), or
 *   ?n=  the name as plain text, for a link that is quick to write
 *   ?x=  optional extra lines, base64, split on "|": shown as things
 *        "Ryan told me" (kept out of this file so they stay private)
 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  function b64(s) {
    try {
      var bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/"));
      var bytes = Uint8Array.from(bin, function (c) { return c.charCodeAt(0); });
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return "";
    }
  }
  var NAME = (b64(params.get("s") || "") || params.get("n") || "").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!NAME) return;
  var SHOUT = NAME.toUpperCase();
  var EXTRA = b64(params.get("x") || "")
    .split("|")
    .map(function (t) { return t.trim().slice(0, 90); })
    .filter(Boolean)
    .slice(0, 6);

  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var RYAN = { lat: 49.2838, lon: -122.7932 }; // Coquitlam, as the site says
  var COLO = { YVR: "Vancouver", SEA: "Seattle", YYC: "Calgary", YYZ: "Toronto", YUL: "Montreal", SJC: "San Jose", LAX: "Los Angeles", ORD: "Chicago", EWR: "Newark", LHR: "London", FRA: "Frankfurt", AMS: "Amsterdam", CDG: "Paris", IST: "Istanbul", DXB: "Dubai", SIN: "Singapore" };

  // ==================== What the browser gives away ====================

  var started = performance.now();
  var server = null;
  var rtt = null;
  var asked = performance.now();
  var serverReady = fetch("/api/trace", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { server = j; rtt = Math.round(performance.now() - asked); })
    .catch(function () {});

  var battery = null;
  if (navigator.getBattery) navigator.getBattery().then(function (b) { battery = b; }).catch(function () {});

  var model = "";
  var platformVersion = "";
  if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues)
    navigator.userAgentData
      .getHighEntropyValues(["model", "platformVersion"])
      .then(function (v) { model = v.model || ""; platformVersion = v.platformVersion || ""; })
      .catch(function () {});

  // Screen refresh rate, from how often the browser paints.
  var hz = 0;
  (function () {
    var n = 0;
    var first = 0;
    requestAnimationFrame(function tick(t) {
      if (!first) first = t;
      if (++n < 45) return requestAnimationFrame(tick);
      var raw = ((n - 1) * 1000) / (t - first);
      hz = [60, 90, 120, 144, 165, 240].reduce(function (a, b) { return Math.abs(b - raw) < Math.abs(a - raw) ? b : a; });
    });
  })();

  // How the phone is held. Android reports this unasked; an iPhone would
  // have to show a permission prompt, so there it is left alone.
  var tilt = null;
  if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== "function")
    window.addEventListener("deviceorientation", function (e) {
      if (e.beta != null) tilt = Math.round(Math.abs(e.beta));
    });

  // How many cameras and microphones exist. Counting them opens none.
  var cams = 0;
  var mics = 0;
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
    navigator.mediaDevices
      .enumerateDevices()
      .then(function (list) {
        list.forEach(function (d) {
          if (d.kind === "videoinput") cams++;
          if (d.kind === "audioinput") mics++;
        });
      })
      .catch(function () {});

  // What this site already keeps in the visitor's own browser.
  var me = document.currentScript;
  var firstVisit = !!(me && me.dataset.first === "1");
  var pickedTheme = "";
  var chatted = 0;
  try {
    pickedTheme = localStorage.getItem("portfolio-theme-override") || "";
    chatted = (JSON.parse(sessionStorage.getItem("ping-chat") || "[]") || []).length;
  } catch (e) {}

  // Sunrise and sunset for a place, for the solar noon nearest to now.
  function sun(lat, lon) {
    var rad = Math.PI / 180;
    var J = Date.now() / 86400000 + 2440587.5;
    var n = Math.round(J - 2451545 + lon / 360);
    var Js = n - lon / 360;
    var M = (357.5291 + 0.98560028 * Js) % 360;
    var C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
    var L = (M + C + 180 + 102.9372) % 360;
    var noon = 2451545 + Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
    var dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
    var cos = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
    if (cos < -1 || cos > 1) return null;
    var w = Math.acos(cos) / rad / 360;
    var ms = function (j) { return (j - 2440587.5) * 86400000; };
    return { rise: ms(noon - w), set: ms(noon + w) };
  }
  function span(ms) {
    var m = Math.round(Math.abs(ms) / 60000);
    return (m >= 60 ? Math.floor(m / 60) + "h " : "") + (m % 60) + "m";
  }

  function iphone() {
    var w = Math.min(screen.width, screen.height);
    var h = Math.max(screen.width, screen.height);
    var guess = {
      "440x956": "16 Pro Max or 17 Pro Max",
      "430x932": "14 Pro Max, 15 Plus/Pro Max or 16 Plus",
      "402x874": "16 Pro or 17",
      "393x852": "14 Pro, 15 or 16",
      "428x926": "12/13 Pro Max or 14 Plus",
      "390x844": "12, 13 or 14",
      "414x896": "XR or 11",
      "375x812": "X, 11 Pro or a mini",
      "375x667": "SE or 8",
    }[w + "x" + h];
    return guess ? "iPhone (looks like a " + guess + ")" : "iPhone";
  }

  function device() {
    var ua = navigator.userAgent;
    var d = { name: "", os: "", browser: "", app: "" };
    var m;
    if (/iPhone/.test(ua)) d.name = iphone();
    else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) d.name = "iPad";
    else if (/Android/.test(ua)) d.name = model || ((m = ua.match(/Android [\d.]+; ([^;)]+)/)) && m[1] !== "K" ? m[1].trim() : "Android phone");
    else if (/Macintosh/.test(ua)) d.name = "Mac";
    else if (/Windows/.test(ua)) d.name = "Windows PC";
    else if (/CrOS/.test(ua)) d.name = "Chromebook";
    else if (/Linux/.test(ua)) d.name = "Linux machine";

    if (/iPhone|iPad/.test(ua)) {
      // Safari's version is the iOS version; the "OS 18_x" part is frozen.
      m = ua.match(/Version\/([\d.]+)/) || ua.match(/OS (\d+[_\d]*)/);
      d.os = "iOS " + (m ? m[1].replace(/_/g, ".") : "");
    } else if ((m = ua.match(/Android ([\d.]+)/))) d.os = "Android " + (platformVersion ? platformVersion.split(".")[0] : m[1]);
    else if (/Windows NT/.test(ua)) d.os = "Windows " + (platformVersion && +platformVersion.split(".")[0] >= 13 ? "11" : "10/11");
    else if ((m = ua.match(/Mac OS X ([\d_]+)/))) d.os = "macOS";

    if ((m = ua.match(/(Instagram|Telegram|Snapchat|TikTok|FBAN|FBAV|Line|WhatsApp|LinkedInApp|Twitter)/i))) {
      d.app = { fban: "Facebook", fbav: "Facebook", line: "LINE", linkedinapp: "LinkedIn", twitter: "X" }[m[1].toLowerCase()] || m[1];
    }
    if (/CriOS|Chrome\//.test(ua) && !/Edg|OPR|SamsungBrowser/.test(ua)) d.browser = "Chrome";
    if (/SamsungBrowser/.test(ua)) d.browser = "Samsung Internet";
    else if (/Edg/.test(ua)) d.browser = "Edge";
    else if (/FxiOS|Firefox/.test(ua)) d.browser = "Firefox";
    else if (/OPR|OPT\//.test(ua)) d.browser = "Opera";
    else if (!d.browser && /Safari/.test(ua)) d.browser = "Safari";
    return d;
  }

  function gpu() {
    try {
      var gl = document.createElement("canvas").getContext("webgl");
      var ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
      var r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
      var m = r.match(/ANGLE \([^,]+, ([^,]+?)(?: Direct3D| \(0x|,|$)/);
      return (m ? m[1] : r).slice(0, 48);
    } catch (e) {
      return "";
    }
  }

  function languages() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]).slice(0, 4);
    var seen = {};
    var names = [];
    list.forEach(function (code) {
      var base = code.split("-")[0];
      if (!base || seen[base]) return;
      seen[base] = 1;
      try {
        names.push(new Intl.DisplayNames(["en"], { type: "language" }).of(base));
      } catch (e) {
        names.push(code);
      }
    });
    return names.join(", ");
  }

  function countryName(code) {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    } catch (e) {
      return code;
    }
  }

  // Minutes ahead of UTC in a named zone right now.
  function offset(tz) {
    try {
      var now = new Date();
      var at = function (zone) { return new Date(now.toLocaleString("en-US", { timeZone: zone })).getTime(); };
      return Math.round((at(tz) - at("UTC")) / 60000);
    } catch (e) {
      return null;
    }
  }

  function km(a, b) {
    var rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad;
    var dLon = (b.lon - a.lon) * rad;
    var h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }

  // ==================== Sound (only after a tap; phones allow it then) ====================

  var audio = null;
  function beep(freq, ms, vol, kind) {
    if (!audio) return;
    try {
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.type = kind || "square";
      o.frequency.value = freq;
      g.gain.value = vol || 0.03;
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      o.connect(g).connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + ms / 1000);
    } catch (e) {}
  }
  function buzz(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (e) {}
  }

  // ==================== The stage ====================

  var CSS =
    "#tr{position:fixed;inset:0;z-index:2147483000;background:#040506;color:#e9edf2;font:500 13px/1.55 'IBM Plex Mono',ui-monospace,Menlo,monospace;display:flex;flex-direction:column;overflow:hidden;-webkit-user-select:none;user-select:none;touch-action:none;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}" +
    "#tr *{box-sizing:border-box}" +
    "#tr::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:5;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}" +
    "#tr::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:5;box-shadow:inset 0 0 140px 30px rgba(255,20,40,.16)}" +
    "#tr .tr-top,#tr .tr-live{flex:none;display:flex;gap:10px;align-items:center;padding:9px 16px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8b939e;border-bottom:1px solid #1b1f25;white-space:nowrap;overflow:hidden}" +
    "#tr .tr-live{border-bottom:0;border-top:1px solid #1b1f25;justify-content:space-between}" +
    "#tr .tr-live b{color:#ff3b4e;font-weight:500}" +
    "#tr .tr-rec{width:9px;height:9px;border-radius:50%;background:#ff2b40;flex:none;animation:tr-blink 1s steps(2) infinite}" +
    "#tr .tr-who{color:#ff3b4e;margin-left:auto}" +
    "#tr .tr-log{flex:1;min-height:0;overflow:hidden;padding:14px 16px 18px;display:flex;flex-direction:column;justify-content:flex-end}" +
    "#tr .tr-in{max-width:640px;width:100%;margin:0 auto}" +
    "#tr .tr-h{margin:16px 0 6px;color:#ff3b4e;font-size:11px;letter-spacing:.14em}" +
    "#tr .tr-h::before{content:'// '}" +
    "#tr .tr-row{display:flex;gap:12px;align-items:baseline}" +
    "#tr .tr-k{flex:none;width:9.5em;color:#6f7782}" +
    "#tr .tr-v{color:#f4f6f8;word-break:break-word;min-width:0}" +
    "#tr .tr-say{margin:8px 0;color:#ff5a6a}" +
    "#tr .tr-say.is-soft{color:#aeb6c0}" +
    "#tr .tr-ok{color:#39e58c}" +
    "#tr .tr-bar{display:inline-block;width:9em;height:.72em;border:1px solid #39424d;vertical-align:-1px;margin-right:8px}" +
    "#tr .tr-bar i{display:block;height:100%;width:0;background:#ff3b4e}" +
    "#tr .tr-pair{display:flex;gap:14px;align-items:center;margin:8px 0 2px}" +
    "#tr canvas{flex:none;border:1px solid #232830;background:#07090b;image-rendering:pixelated}" +
    "#tr .tr-note{color:#8b939e;font-size:12px}" +
    "#tr .tr-note b{color:#f4f6f8;font-weight:500}" +
    "#tr .tr-files{height:7.75em;overflow:hidden;color:#8b939e;font-size:12px;border-left:2px solid #ff3b4e;padding-left:10px;margin:6px 0;display:flex;flex-direction:column;justify-content:flex-end}" +
    "#tr .tr-big{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:#040506}" +
    "#tr .tr-big h1{margin:0;font:400 clamp(34px,11vw,92px)/1 'Silkscreen','IBM Plex Mono',monospace;color:#fff;letter-spacing:.02em;text-shadow:3px 0 #ff2b40,-3px 0 #18d5ff}" +
    "#tr .tr-big p{margin:18px 0 0;color:#ff5a6a;font-size:14px;min-height:1.6em}" +
    "#tr .tr-count{font:400 clamp(110px,42vw,300px)/1 'Silkscreen',monospace;color:#ff2b40}" +
    "#tr .tr-tap{position:absolute;z-index:6;transform:translate(-50%,-140%);background:#ff2b40;color:#fff;padding:4px 8px;font-size:11px;white-space:nowrap;pointer-events:none;animation:tr-tap 1.5s forwards}" +
    "#tr .tr-flash{position:absolute;inset:0;z-index:7;background:#fff;pointer-events:none;animation:tr-flash .7s forwards}" +
    "#tr .tr-end{position:absolute;inset:0;z-index:8;background:#0a0a0b;display:flex;align-items:center;justify-content:center;padding:20px 20px calc(20px + env(safe-area-inset-bottom));overflow:auto;touch-action:pan-y;animation:tr-in .5s both}" +
    "#tr .tr-card{max-width:440px;width:100%;margin:auto;text-align:center;font-family:'Familjen Grotesk',system-ui,sans-serif;font-size:16px;line-height:1.5;color:#d9dde3}" +
    "#tr .tr-ping{width:114px;height:132px;margin:0 auto 6px;display:block;overflow:visible;animation:tr-hop .9s steps(2) infinite}" +
    "#tr .tr-ping .px-arms-rest,#tr .tr-ping .px-eyes-open{display:none}" +
    "#tr .tr-ping .px-arms-cheer,#tr .tr-ping .px-eyes-happy{display:block}" +
    "#tr .tr-card h2{margin:0 0 6px;font:400 44px/1 'Silkscreen',monospace;color:#4d7aff}" +
    "#tr .tr-card h3{margin:0 0 14px;font-size:21px;line-height:1.25;color:#fff;font-weight:600}" +
    "#tr .tr-card dl{margin:0 0 16px;text-align:left;border:1px solid #23262c;border-radius:14px;overflow:hidden}" +
    "#tr .tr-card dl div{padding:12px 14px}" +
    "#tr .tr-card dl div+div{border-top:1px solid #23262c}" +
    "#tr .tr-card dt{font:500 11px/1.4 'IBM Plex Mono',monospace;letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px}" +
    "#tr .tr-card dd{margin:0;font-size:14.5px;color:#b9bfc8}" +
    "#tr .tr-real dt{color:#39e58c}#tr .tr-fake dt{color:#ff5a6a}#tr .tr-kept dt{color:#4d7aff}" +
    "#tr .tr-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}" +
    "#tr button{font:600 15px/1 'Familjen Grotesk',system-ui,sans-serif;min-height:46px;padding:0 20px;border-radius:999px;border:1px solid #2c3038;background:transparent;color:#e9edf2;cursor:pointer}" +
    "#tr button.is-main{background:#4d7aff;border-color:#4d7aff;color:#fff}" +
    "@keyframes tr-blink{50%{opacity:.15}}" +
    "@keyframes tr-tap{0%{opacity:0}12%,70%{opacity:1}100%{opacity:0}}" +
    "@keyframes tr-flash{0%{opacity:.9}100%{opacity:0}}" +
    "@keyframes tr-in{from{opacity:0}}" +
    "@keyframes tr-hop{50%{transform:translateY(-6px)}}" +
    "@keyframes tr-break{0%,100%{transform:none;filter:none}12%{transform:translate(-5px,2px) skewX(-2deg);filter:hue-rotate(80deg) saturate(2.4)}26%{transform:translate(6px,-3px);filter:invert(1)}40%{transform:translate(-3px,4px) skewX(3deg);filter:hue-rotate(-60deg) contrast(1.7)}58%{transform:translate(4px,1px) scaleY(1.02);filter:saturate(0) contrast(2)}74%{transform:translate(-7px,-2px) skewX(-4deg);filter:hue-rotate(150deg) saturate(3)}88%{transform:translate(2px,3px);filter:invert(1) hue-rotate(180deg)}}" +
    "html.tr-break body{animation:tr-break .46s steps(1) 3}" +
    "@media (prefers-reduced-motion:reduce){html.tr-break body{animation:none}#tr .tr-rec,#tr .tr-ping{animation:none}}";

  var root, log, live, cancels, taps, awayAt, awayTotal, running, phase, frame;
  var scrolled = 0;
  var SKIP = {};

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function wait(ms) {
    return new Promise(function (res, rej) {
      var t = setTimeout(res, ms);
      cancels.push(function () { clearTimeout(t); rej(SKIP); });
    });
  }

  async function type(node, text, step) {
    var per = Math.max(1, Math.ceil(text.length / 26));
    for (var i = per; i < text.length + per; i += per) {
      node.textContent = text.slice(0, i);
      await wait(step || 18);
    }
  }

  function add(node) {
    log.appendChild(node);
    return node;
  }
  function head(title) {
    add(el("div", "tr-h", title));
    beep(180, 120, 0.04, "sawtooth");
    return wait(380);
  }
  async function row(key, value, pause) {
    if (!value) return;
    var r = add(el("div", "tr-row"));
    r.appendChild(el("span", "tr-k", key));
    var v = r.appendChild(el("span", "tr-v"));
    beep(880, 30, 0.015);
    await type(v, String(value));
    await wait(pause == null ? 300 : pause);
  }
  async function say(text, soft, pause) {
    var s = add(el("div", "tr-say" + (soft ? " is-soft" : "")));
    await type(s, "> " + text, 22);
    await wait(pause == null ? 900 : pause);
  }
  async function bar(key, done, ms) {
    var r = add(el("div", "tr-row"));
    r.appendChild(el("span", "tr-k", key));
    var v = r.appendChild(el("span", "tr-v"));
    var b = v.appendChild(el("span", "tr-bar"));
    var fill = b.appendChild(el("i"));
    var pct = v.appendChild(el("span", "", "0%"));
    var steps = 9;
    for (var i = 1; i <= steps; i++) {
      await wait((ms || 900) / steps);
      var p = Math.min(100, Math.round((i / steps) * 100 - (i < steps ? Math.random() * 7 : 0)));
      fill.style.width = p + "%";
      pct.textContent = p + "%";
      beep(300 + i * 50, 25, 0.012);
    }
    pct.textContent = done;
    pct.className = "tr-ok";
    await wait(260);
  }

  // A big line on its own screen.
  async function big(title, sub, hold) {
    var b = root.appendChild(el("div", "tr-big"));
    var h = b.appendChild(el("h1"));
    var p = b.appendChild(el("p"));
    var glyphs = "#%&$@!?/\\<>01";
    for (var i = 0; i <= title.length; i++) {
      var noise = "";
      for (var j = i; j < title.length; j++) noise += title[j] === " " ? " " : glyphs[(Math.random() * glyphs.length) | 0];
      h.textContent = title.slice(0, i) + noise;
      beep(120 + i * 30, 40, 0.03, "sawtooth");
      await wait(calm ? 20 : 70);
    }
    if (sub) await type(p, sub, 26);
    await wait(hold || 1300);
    b.remove();
  }

  // The radar: where the address resolves to, as a dot under a sweep.
  function radar(canvas) {
    var c = canvas.getContext("2d");
    var S = canvas.width;
    var t0 = performance.now();
    (function draw() {
      if (!running || !canvas.isConnected) return;
      var a = ((performance.now() - t0) / 1800) * Math.PI * 2;
      c.clearRect(0, 0, S, S);
      c.strokeStyle = "#1e2630";
      c.lineWidth = 1;
      [0.18, 0.32, 0.46].forEach(function (r) { c.beginPath(); c.arc(S / 2, S / 2, S * r, 0, 7); c.stroke(); });
      c.beginPath(); c.moveTo(S / 2, 4); c.lineTo(S / 2, S - 4); c.moveTo(4, S / 2); c.lineTo(S - 4, S / 2); c.stroke();
      for (var i = 0; i < 26; i++) {
        c.strokeStyle = "rgba(255,59,78," + (0.5 * (1 - i / 26)).toFixed(3) + ")";
        c.beginPath(); c.moveTo(S / 2, S / 2);
        c.lineTo(S / 2 + Math.cos(a - i * 0.035) * S * 0.46, S / 2 + Math.sin(a - i * 0.035) * S * 0.46);
        c.stroke();
      }
      var pulse = (performance.now() - t0) % 1400 / 1400;
      c.strokeStyle = "rgba(255,59,78," + (1 - pulse).toFixed(2) + ")";
      c.beginPath(); c.arc(S * 0.58, S * 0.41, 3 + pulse * 13, 0, 7); c.stroke();
      c.fillStyle = "#ff3b4e";
      c.fillRect(S * 0.58 - 3, S * 0.41 - 3, 6, 6);
      frame = requestAnimationFrame(draw);
    })();
  }

  // The "camera": only grey static with a box drawn on it. No camera is opened.
  function staticBox(canvas) {
    var c = canvas.getContext("2d");
    var W = canvas.width;
    var H = canvas.height;
    var last = 0;
    (function draw(now) {
      if (!running || !canvas.isConnected) return;
      if (!now || now - last > 130) {
        last = now || 0;
        var img = c.createImageData(W, H);
        for (var i = 0; i < img.data.length; i += 4) {
          var v = 22 + Math.random() * 46;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        c.putImageData(img, 0, 0);
        c.strokeStyle = "#39e58c";
        c.strokeRect(W * 0.3 + Math.random() * 1.5, H * 0.2 + Math.random() * 1.5, W * 0.4, H * 0.55);
        c.fillStyle = "#ff3b4e";
        c.fillRect(4, 4, 4, 4);
      }
      requestAnimationFrame(draw);
    })();
  }

  function ticker() {
    if (!running) return;
    var s = Math.floor((performance.now() - started) / 1000);
    var mm = String(Math.floor(s / 60)).padStart(2, "0");
    var ss = String(s % 60).padStart(2, "0");
    live.firstChild.textContent = "watching " + mm + ":" + ss;
    live.lastChild.textContent = taps ? "taps " + taps : "do not close this tab";
    setTimeout(ticker, 500);
  }

  // ==================== Things the visitor does while it runs ====================

  var TAP_LINES = ["tapping won't help.", "that didn't do anything.", "still here.", "your thumb is fast. not fast enough.", "ok, you're panicking.", "one more and i stop."];
  function onTap(ev) {
    if (!running || phase === "end") return;
    if (!audio) {
      try {
        audio = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    taps++;
    var x = Math.round(ev.clientX);
    var y = Math.round(ev.clientY);
    var t = el("div", "tr-tap", "tap " + taps + " @ " + x + "," + y + " · " + TAP_LINES[Math.min(taps, TAP_LINES.length) - 1]);
    t.style.left = Math.max(120, Math.min(innerWidth - 120, x)) + "px";
    t.style.top = Math.max(60, y) + "px";
    root.appendChild(t);
    setTimeout(function () { t.remove(); }, 1500);
    beep(140, 90, 0.05, "sawtooth");
    buzz(40);
    if (taps >= 7) stop();
  }
  function onKey(ev) {
    if (ev.key === "Escape") stop();
  }
  function onHide() {
    if (!running || phase === "end") return;
    if (document.visibilityState === "hidden") awayAt = performance.now();
    else if (awayAt) {
      var s = Math.max(1, Math.round((performance.now() - awayAt) / 1000));
      awayTotal += s;
      awayAt = 0;
      add(el("div", "tr-say", "> you left for " + s + " second" + (s === 1 ? "" : "s") + ". i waited. i can see when you switch apps."));
    }
  }
  function onTurn() {
    if (running && phase !== "end") add(el("div", "tr-say", "> turning the phone won't help either."));
  }
  function stop() {
    var list = cancels;
    cancels = [];
    list.forEach(function (c) { c(); });
  }

  // ==================== The show ====================

  async function show() {
    var d = device();
    var now = new Date();
    var hour = now.getHours();
    var clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    var tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (e) {}

    phase = "hello";
    await big("HELLO, " + SHOUT + ".", "you roast my website. now it's my turn.", 1500);
    await big("I SEE YOU.", "give me a few seconds, " + NAME + ".", 1100);
    phase = "trace";

    await Promise.race([serverReady, wait(1500)]);
    var s = server || {};

    await head("CONNECTION");
    await row("ip address", s.ip);
    await row("provider", s.isp ? s.isp + (s.asn ? " (AS" + s.asn + ")" : "") : "");
    var place = [s.city, s.region, s.country ? countryName(s.country) : ""].filter(Boolean).join(", ");
    await row("location", place);
    await row("postal area", s.postal);
    if (s.lat != null && s.lon != null) {
      var pair = add(el("div", "tr-pair"));
      var cv = pair.appendChild(el("canvas"));
      cv.width = cv.height = 108;
      radar(cv);
      var note = pair.appendChild(el("div", "tr-note"));
      var dist = km({ lat: s.lat, lon: s.lon }, RYAN);
      note.appendChild(el("div", "", "lat " + s.lat.toFixed(4)));
      note.appendChild(el("div", "", "lon " + s.lon.toFixed(4)));
      var b = note.appendChild(el("div"));
      b.appendChild(el("b", "", dist < 3 ? "under 3 km" : "~" + Math.round(dist).toLocaleString() + " km"));
      b.appendChild(document.createTextNode(" from Ryan"));
      beep(660, 200, 0.03);
      await wait(1500);
      if (dist < 60) await say("that's close. i could walk there.", false, 700);
      var sky = sun(s.lat, s.lon);
      var t = Date.now();
      var town = s.city || "your town";
      if (sky)
        await row(
          "outside",
          t > sky.set ? "the sun set " + span(t - sky.set) + " ago in " + town + ". it's dark out your window."
            : t < sky.rise ? "still dark in " + town + ". sunrise in " + span(sky.rise - t) + "."
            : "daylight in " + town + ". " + span(sky.set - t) + " until sunset.",
        );
    }
    await row("entered via", s.colo ? "Cloudflare " + (COLO[s.colo] || s.colo) + (s.http ? " · " + s.http : "") + (s.tls ? " · " + s.tls : "") : "");
    await row("ping", rtt ? rtt + " ms round trip" : "");
    var mine = tz ? offset(tz) : null;
    var theirs = s.tz ? offset(s.tz) : null;
    if (mine != null && theirs != null && mine !== theirs)
      await say("your phone's clock says " + tz.split("/").pop().replace(/_/g, " ") + ". your address says " + (s.city || s.tz.split("/").pop().replace(/_/g, " ")) + ". a vpn? cute.");
    if (!s.ip) await say("address hidden behind something. smart. the rest isn't.", true, 600);

    await head("DEVICE");
    await row("device", d.name);
    await row("system", [d.os.trim(), d.browser].filter(Boolean).join(" · "));
    if (d.app) await row("opened from", "the " + d.app + " app");
    else if (document.referrer) {
      try {
        var from = new URL(document.referrer).hostname.replace(/^www\./, "");
        if (from && from !== location.hostname) await row("came from", from);
      } catch (e) {}
    }
    var dpr = window.devicePixelRatio || 1;
    await row("screen", Math.round(screen.width * dpr) + " × " + Math.round(screen.height * dpr) + " px" + (hz ? " · " + hz + " Hz" : "") + " · " + (matchMedia("(prefers-color-scheme: dark)").matches ? "dark mode" : "light mode"));
    await row("graphics", gpu());
    await row("processor", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " cores" + (navigator.deviceMemory ? " · " + navigator.deviceMemory + " GB memory" : "") : "");
    if (battery) {
      var pct = Math.round(battery.level * 100);
      await row("battery", pct + "%" + (battery.charging ? " · charging" : " · not charging"));
      if (pct <= 25 && !battery.charging) await say(pct + "%. charge your phone, " + NAME + ".", false, 600);
    }
    var net = navigator.connection;
    if (net && (net.type || net.effectiveType))
      await row("network", [net.type && net.type !== "unknown" ? net.type : "", net.effectiveType ? net.effectiveType.toUpperCase() : "", net.downlink ? net.downlink + " Mbps" : ""].filter(Boolean).join(" · "));
    if (cams || mics)
      await row("hardware", [cams ? cams + " camera" + (cams > 1 ? "s" : "") : "", mics ? mics + " microphone" + (mics > 1 ? "s" : "") : ""].filter(Boolean).join(", ") + " found");
    if (tilt != null)
      await row("held at", tilt + "° · " + (tilt < 25 ? "flat. lying down?" : tilt > 65 ? "right in front of your face." : "relaxed. not for long."));
    await row("languages", languages());
    await row("your clock", clock + (tz ? " · " + tz.replace(/_/g, " ") : ""));
    await say(
      hour < 5 ? "it's " + clock + " where you are. you should be asleep."
        : hour < 12 ? "it's " + clock + ". this is how your morning goes now."
        : hour < 18 ? "it's " + clock + ". shouldn't you be busy?"
        : "it's " + clock + ". a nice evening to regret things.",
    );

    if (EXTRA.length) {
      await head("WHAT RYAN TOLD ME");
      for (var i = 0; i < EXTRA.length; i++) await row("note " + (i + 1), EXTRA[i], 420);
    }

    await head("RIGHT NOW");
    await row("visit", firstVisit ? "your first time on this site. bad timing." : "not your first time here. i remember.");
    if (pickedTheme) await row("last time", "you switched my site to " + pickedTheme + " mode");
    if (chatted) await row("this tab", "you were talking to ping earlier");
    if (scrolled > 40) await row("scrolled", scrolled.toLocaleString() + " px before i stopped you");
    await row("on this page", Math.round((performance.now() - started) / 1000) + " seconds");
    await row("taps", taps ? taps + " (i felt every one)" : "0. frozen?");
    if (awayTotal) await row("looked away", awayTotal + " seconds in total");
    await row("touch points", navigator.maxTouchPoints > 1 ? navigator.maxTouchPoints + " fingers supported. you only need one to say sorry." : "");

    // ---------- from here on, none of it is real ----------
    phase = "fake";
    await say("that was the easy part.", false, 700);
    await head("ACCESS");
    await bar("front camera", "LIVE", 1100);
    var cam = add(el("div", "tr-pair"));
    var view = cam.appendChild(el("canvas"));
    view.width = 72;
    view.height = 54;
    view.style.width = "108px";
    view.style.height = "81px";
    staticBox(view);
    var seen = cam.appendChild(el("div", "tr-note"));
    seen.appendChild(el("div", "", "faces found: 1"));
    seen.appendChild(el("div", "", "expression: worried"));
    var m = seen.appendChild(el("div"));
    m.appendChild(el("b", "", "match: " + SHOUT + " 98.7%"));
    buzz([60, 40, 60]);
    await wait(1700);
    await bar("microphone", "LISTENING", 700);
    await bar("photo library", "4,812 ITEMS", 800);
    await bar("contacts", "316 PEOPLE", 600);
    await bar("chats", "UNLOCKED", 800);
    await bar("saved passwords", "23 FOUND", 900);
    await bar("search history", "OH NO", 700);

    await head("SENDING TO RYAN");
    var files = add(el("div", "tr-files"));
    var total = add(el("div", "tr-row"));
    total.appendChild(el("span", "tr-k", "uploaded"));
    var sent = total.appendChild(el("span", "tr-v", "0 MB"));
    var LIST = [
      "selfies/ (347 photos)", "selfies/deleted/ (91 photos, the bad ones)", "screenshots/ (1,204)", "screenshots/my-website-roasts/ (38)",
      "camera roll: last 30 days", "notes: \"passwords\"", "notes: \"do not open\"", "search: \"how to roast a website\"",
      "search: \"is ping cute\"", "search: \"how to make a portfolio better than ryan\"", "voice messages (52)", "chats: last 2,000 messages",
      "chats: everything you said about ryan", "saved wi-fi passwords (11)", "screen time: 9h 41m a day", "most used emoji: 💀",
      "alarms: 6 snoozed this morning", "playlist: \"sad songs 3am\"", "keyboard: words you typed then deleted", "location history: 90 days",
      "front camera: 14 frames", "microphone: 00:21 recording", "contacts.vcf (316)", "browser tabs (47 open)",
    ];
    LIST = [s.ip ? "ip " + s.ip : "", place ? "location: " + place + (s.postal ? " " + s.postal : "") : "", d.name ? "device: " + d.name : ""].filter(Boolean).concat(LIST);
    var mb = 0;
    for (var f = 0; f < LIST.length; f++) {
      files.appendChild(el("div", "", "↑ " + LIST[f]));
      mb += 18 + Math.random() * 160;
      sent.textContent = Math.round(mb).toLocaleString() + " MB · " + Math.round(((f + 1) / LIST.length) * 100) + "%";
      beep(520 + (f % 5) * 60, 22, 0.012);
      await wait(f < 5 ? 520 : 230);
    }
    sent.textContent = Math.round(mb).toLocaleString() + " MB · sent to Ryan";
    sent.className = "tr-v tr-ok";
    await wait(900);
    await say("he has everything now. posting it in the group chat in", false, 500);

    phase = "count";
    var c = root.appendChild(el("div", "tr-big"));
    var n = c.appendChild(el("div", "tr-count"));
    var under = c.appendChild(el("p", "", "say sorry to ping. quickly."));
    for (var k = 5; k >= 1; k--) {
      n.textContent = k;
      beep(k === 1 ? 990 : 660, 160, 0.06);
      buzz(80);
      await wait(900);
    }
    under.textContent = "";
    n.textContent = "0";
    await wait(500);
  }

  function reveal(early) {
    phase = "end";
    cancelAnimationFrame(frame);
    root.querySelectorAll(".tr-big,.tr-tap").forEach(function (n) { n.remove(); });
    if (!calm) root.appendChild(el("div", "tr-flash"));
    beep(660, 120, 0.05, "triangle");
    setTimeout(function () { beep(990, 260, 0.05, "triangle"); }, 130);
    buzz([30, 40, 30]);

    var end = root.appendChild(el("div", "tr-end"));
    var card = end.appendChild(el("div", "tr-card"));
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "tr-ping");
    svg.setAttribute("aria-hidden", "true");
    if (window.PingSprite) {
      window.PingSprite.build(svg);
      card.appendChild(svg);
    }
    card.appendChild(el("h2", "", "PING!"));
    card.appendChild(el("h3", "", (early ? "Ok, ok. Breathe, " : "Got you, ") + NAME + "."));
    var dl = card.appendChild(el("dl"));
    [
      ["tr-real", "Real", "Your IP address and rough area, your provider, your device, screen, battery, languages and clock, and what you did on this page. Your browser tells this to every website you open. All of them."],
      ["tr-fake", "Fake", "The camera, microphone, photos, contacts, chats, passwords and the upload to Ryan. All made up. A website can't touch any of that without you pressing Allow."],
      ["tr-kept", "Kept", "Nothing. None of it was saved or sent to anyone, Ryan included."],
    ].forEach(function (r) {
      var d = dl.appendChild(el("div", r[0]));
      d.appendChild(el("dt", "", r[1]));
      d.appendChild(el("dd", "", r[2]));
    });
    card.appendChild(el("p", "", "Now be nice about the website. Ping has feelings."));
    var btns = card.appendChild(el("div", "tr-btns"));
    var sorry = btns.appendChild(el("button", "is-main", "Sorry, Ping 🙏"));
    var again = btns.appendChild(el("button", "", "Watch it again"));
    sorry.type = again.type = "button";
    sorry.addEventListener("click", function () {
      card.querySelector("h3").textContent = "Apology accepted. Roast responsibly.";
      sorry.disabled = again.disabled = true;
      setTimeout(close, 1700);
    });
    again.addEventListener("click", function () {
      close();
      started = performance.now();
      start(true);
    });
    sorry.focus({ preventScroll: true });
  }

  function close() {
    running = false;
    stop();
    document.removeEventListener("pointerdown", onTap, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("orientationchange", onTurn);
    document.documentElement.style.overflow = "";
    if (root) root.remove();
    root = null;
  }

  async function start(again) {
    if (root) return;
    cancels = [];
    taps = 0;
    awayAt = 0;
    awayTotal = 0;
    running = true;
    phase = "break";
    if (!again) scrolled = Math.round(window.scrollY);

    if (!document.getElementById("tr-css")) {
      var st = el("style", "", CSS);
      st.id = "tr-css";
      document.head.appendChild(st);
    }
    if (!again && !calm) {
      document.documentElement.classList.add("tr-break");
      buzz([70, 50, 70, 50, 120]);
      await new Promise(function (r) { setTimeout(r, 1400); });
      document.documentElement.classList.remove("tr-break");
    }

    root = el("div");
    root.id = "tr";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "A joke from Ryan. Press Escape to end it.");
    var top = root.appendChild(el("div", "tr-top"));
    top.appendChild(el("span", "tr-rec"));
    top.appendChild(el("span", "", "rec · session " + Math.random().toString(16).slice(2, 6)));
    top.appendChild(el("span", "tr-who", "target: " + SHOUT));
    var wrap = root.appendChild(el("div", "tr-log"));
    log = wrap.appendChild(el("div", "tr-in"));
    live = root.appendChild(el("div", "tr-live"));
    live.appendChild(el("span", "", ""));
    live.appendChild(el("b", "", ""));
    document.body.appendChild(root);
    document.documentElement.style.overflow = "hidden";

    document.addEventListener("pointerdown", onTap, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("orientationchange", onTurn);
    ticker();

    var early = false;
    try {
      await show();
    } catch (e) {
      if (e !== SKIP) console.error("[trace]", e);
      early = true;
    }
    if (root) reveal(early);
  }

  function arm() {
    setTimeout(function () { start(false); }, 2600);
  }
  if (document.readyState === "complete") arm();
  else window.addEventListener("load", arm);
})();
