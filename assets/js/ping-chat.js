/**
 * Ask Ping
 * --------
 * A panel where visitors put a question to Ping and he answers from what
 * the site says about Ryan's packages, prices and process (worker/ping.js,
 * POST /api/ping). Loaded by ping.js the first time someone opens it, so
 * pages pay nothing for it until then.
 *
 * On a phone it is a sheet that rises from the foot of the screen, over the
 * dock; on a desktop a card in the bottom-right corner. It is a non-modal
 * <dialog popover="manual">: the page stays usable behind it, and it closes
 * with its button, Escape, or a tap outside. Ping's answers arrive the way
 * his speech boxes do: a packet header with a sequence number, then the
 * line typing out. The conversation is kept for the tab (sessionStorage),
 * so it follows the visitor from page to page; nothing is stored on the
 * server.
 */

(function () {
  "use strict";

  if (window.PingChat) return;

  var KEY = "ping-chat";
  var MAX = 500;
  var STARTERS = ["How much is a website?", "How long does it take?", "What do you need from me?"];
  var HELLO = "Hi, I'm Ping. Ask me about Ryan's websites, what they cost, or how a project goes.";
  var FAIL = "I couldn't reach my server. Check your connection and ask again, or call or text Ryan at 604-729-3212.";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var desk = window.matchMedia("(hover: hover) and (pointer: fine)");
  // Pages in /projects/ link one folder up.
  var up = /\/projects\//.test(location.pathname) ? "../" : "";

  var turns = [];
  try {
    turns = JSON.parse(sessionStorage.getItem(KEY) || "[]");
    if (!Array.isArray(turns)) turns = [];
  } catch (e) {
    turns = [];
  }
  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(turns.slice(-20)));
    } catch (e) {}
  }

  // ==================== The panel ====================

  var ARROW =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

  var panel = document.createElement("dialog");
  panel.className = "ask";
  panel.id = "ask-ping";
  panel.setAttribute("aria-labelledby", "ask-title");
  panel.tabIndex = -1;
  var canPop = "popover" in HTMLElement.prototype;
  if (canPop) panel.setAttribute("popover", "manual");
  panel.innerHTML =
    '<header class="ask-head">' +
    '<span class="ask-face" aria-hidden="true"><img src="/favicon.svg" alt="" width="28" height="28" /></span>' +
    '<div class="ask-who"><h2 class="ask-title" id="ask-title">Ask Ping</h2>' +
    '<p class="ask-sub">Quick answers about websites and prices</p></div>' +
    '<button type="button" class="ask-close" aria-label="Close the chat">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    "</button></header>" +
    '<div class="ask-log" role="log" aria-live="polite" aria-label="Conversation with Ping" tabindex="0"></div>' +
    '<form class="ask-form" novalidate>' +
    '<label class="ask-label" for="ask-input">Your question for Ping</label>' +
    '<input class="ask-input" id="ask-input" type="text" name="q" maxlength="' +
    MAX +
    '" autocomplete="off" enterkeyhint="send" placeholder="Ask a question" />' +
    '<button type="submit" class="ask-send" aria-label="Send">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>' +
    "</button></form>" +
    '<p class="ask-note">Ping is automated and can be wrong. Ryan\'s quote is final. ' +
    '<a href="' +
    up +
    'privacy.html">Privacy</a></p>';
  document.body.appendChild(panel);

  var log = panel.querySelector(".ask-log");
  var form = panel.querySelector(".ask-form");
  var input = panel.querySelector(".ask-input");
  var sendBtn = panel.querySelector(".ask-send");
  var busy = false;
  var seq = 0;

  function toEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function you(text) {
    var p = document.createElement("p");
    p.className = "ask-you";
    p.textContent = text;
    log.appendChild(p);
    toEnd();
  }

  // One of Ping's lines: the packet header, then the words. The whole line
  // is in the page from the start (the untyped rest is transparent), so the
  // text never reflows while it types and a screen reader hears it once.
  function ping(text, typeIt) {
    seq++;
    var box = document.createElement("div");
    box.className = "ask-ping";
    var head = document.createElement("p");
    head.className = "ask-ping-head";
    head.setAttribute("aria-hidden", "true");
    head.innerHTML = "<span>Ping</span><span>seq " + (seq < 10 ? "0" : "") + seq + "</span>";
    var body = document.createElement("p");
    body.className = "ask-ping-text";
    var typed = document.createElement("span");
    var rest = document.createElement("span");
    rest.className = "ask-rest";
    body.appendChild(typed);
    body.appendChild(rest);
    box.appendChild(head);
    box.appendChild(body);
    log.appendChild(box);

    if (!typeIt || reduced || !text) {
      typed.textContent = text;
      toEnd();
      return Promise.resolve(box);
    }
    rest.textContent = text;
    box.classList.add("is-typing");
    toEnd();
    return new Promise(function (resolve) {
      var shown = 0;
      // Long answers type faster, so nobody waits more than a couple of
      // seconds for the end of one.
      var step = Math.max(1, Math.ceil(text.length / 90));
      var timer = setInterval(function () {
        shown = Math.min(text.length, shown + step);
        typed.textContent = text.slice(0, shown);
        rest.textContent = text.slice(shown);
        if (shown >= text.length) {
          clearInterval(timer);
          box.classList.remove("is-typing");
          resolve(box);
        }
      }, 18);
    });
  }

  // What to do next, under the latest answer: the form and the phone.
  function actions() {
    var old = log.querySelector(".ask-actions");
    if (old) old.remove();
    var box = document.createElement("p");
    box.className = "ask-actions";
    box.innerHTML =
      '<a class="is-main" href="' + up + 'services.html#contact">Get a free quote</a>' + '<a href="tel:+16047293212">Call or text Ryan</a>';
    log.appendChild(box);
    toEnd();
  }

  // Before the first question: three to start from.
  var starters = document.createElement("div");
  starters.className = "ask-starters";
  STARTERS.forEach(function (q) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ask-starter";
    b.innerHTML = "<span></span>" + ARROW;
    b.firstChild.textContent = q;
    b.addEventListener("click", function () {
      ask(q);
    });
    starters.appendChild(b);
  });

  ping(HELLO, false);
  turns.forEach(function (t) {
    if (t.role === "user") you(t.content);
    else ping(t.content, false);
  });
  if (turns.length) actions();
  else log.appendChild(starters);

  // ==================== Asking ====================

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
  }

  function ask(text) {
    text = String(text || "")
      .trim()
      .slice(0, MAX);
    if (!text || busy) return;
    starters.remove();
    var old = log.querySelector(".ask-actions");
    if (old) old.remove();
    input.value = "";
    you(text);
    turns.push({ role: "user", content: text });
    save();
    setBusy(true);
    var wait = document.createElement("p");
    wait.className = "ask-wait";
    wait.setAttribute("aria-label", "Ping is thinking");
    wait.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(wait);
    toEnd();
    document.dispatchEvent(new CustomEvent("ping:asked"));

    fetch("/api/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: turns.slice(-9), path: location.pathname }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (out) {
        return (out && out.reply) || FAIL;
      })
      .catch(function () {
        return FAIL;
      })
      .then(function (reply) {
        wait.remove();
        turns.push({ role: "assistant", content: reply });
        save();
        document.dispatchEvent(new CustomEvent("ping:answered"));
        return ping(reply, true);
      })
      .then(function () {
        actions();
        setBusy(false);
        if (desk.matches) input.focus();
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
  });
  // Enter sends, but not while an IME is still composing the text.
  input.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) return;
    form.requestSubmit ? form.requestSubmit() : ask(input.value);
  });

  // ==================== Open and close ====================

  var opener = null;
  var openedAt = 0;

  function isOpen() {
    return canPop ? panel.matches(":popover-open") : panel.open;
  }

  function open(from) {
    if (isOpen()) return;
    opener = from || document.activeElement;
    openedAt = performance.now();
    if (canPop) panel.showPopover();
    else panel.show();
    document.documentElement.classList.add("ask-open");
    toEnd();
    // On a phone the keyboard would cover half the sheet straight away, so
    // the field is only focused where there is a real keyboard.
    if (desk.matches) input.focus();
    else panel.focus({ preventScroll: true });
    fit();
  }

  function close() {
    if (!isOpen()) return;
    if (canPop) panel.hidePopover();
    else panel.close();
    document.documentElement.classList.remove("ask-open");
    if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    opener = null;
  }

  panel.querySelector(".ask-close").addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) close();
  });
  // A tap on the page behind the sheet puts it away. (Not the tap that
  // opened it, and not one on Ping, who answers for himself.)
  document.addEventListener("pointerdown", function (e) {
    if (!isOpen() || performance.now() - openedAt < 350) return;
    if (panel.contains(e.target) || (e.target.closest && e.target.closest(".ping, [data-ask-ping], .ask-launch"))) return;
    var r = panel.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return;
    close();
  });

  // On a phone the on-screen keyboard covers the foot of the screen: lift
  // the sheet by however much of the layout it hides.
  var vv = window.visualViewport;
  function fit() {
    if (!vv) return;
    var hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.setProperty("--ask-kb", hidden > 80 ? hidden + "px" : "0px");
    panel.style.setProperty("--ask-vh", vv.height + "px");
    panel.classList.toggle("has-kb", hidden > 80);
    if (hidden > 80) toEnd();
  }
  if (vv) {
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
  }

  window.PingChat = { open: open, close: close, isOpen: isOpen };
})();
