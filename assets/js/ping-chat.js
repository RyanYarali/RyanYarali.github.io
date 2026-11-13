/**
 * Ask Ping
 * --------
 * A small panel where visitors put a question to Ping and he answers from
 * what the site says about Ryan's packages, prices and process
 * (worker/ping.js, POST /api/ping). Loaded by ping.js the first time someone
 * opens it, so pages pay nothing for it until then.
 *
 * The panel is a non-modal <dialog popover="manual">: the page stays usable
 * behind it and it closes with its button or Escape. The conversation is
 * kept for the tab (sessionStorage), so it follows the visitor from page to
 * page, and nothing is stored on the server.
 */

(function () {
  "use strict";

  if (window.PingChat) return;

  var KEY = "ping-chat";
  var MAX = 500;
  var STARTERS = ["How much is a website?", "How long does it take?", "What do you need from me?"];
  var HELLO = "Ping! Ask me about Ryan's websites, prices or how it all works.";
  var FAIL = "I couldn't reach my server. Check your connection and ask again, or call or text Ryan at 604-729-3212.";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

  var panel = document.createElement("dialog");
  panel.className = "ask";
  panel.id = "ask-ping";
  panel.setAttribute("aria-labelledby", "ask-title");
  var canPop = "popover" in HTMLElement.prototype;
  if (canPop) panel.setAttribute("popover", "manual");
  panel.innerHTML =
    '<header class="ask-head">' +
    '<span class="ask-tag" aria-hidden="true">PING</span>' +
    '<h2 class="ask-title" id="ask-title">Ask Ping</h2>' +
    '<button type="button" class="ask-close" aria-label="Close the chat">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    "</button></header>" +
    '<div class="ask-log" role="log" aria-live="polite" aria-label="Conversation with Ping" tabindex="0"></div>' +
    '<div class="ask-starters"></div>' +
    '<form class="ask-form" novalidate>' +
    '<label class="ask-label" for="ask-input">Your question for Ping</label>' +
    '<input class="ask-input" id="ask-input" type="text" name="q" maxlength="' +
    MAX +
    '" autocomplete="off" enterkeyhint="send" placeholder="Type a question…" />' +
    '<button type="submit" class="ask-send" aria-label="Send">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
    "</button></form>" +
    '<p class="ask-note">Ping is an automated helper and can get things wrong. Ryan\'s quote is the final word. ' +
    '<a href="' +
    up +
    'privacy.html">Privacy</a></p>';
  document.body.appendChild(panel);

  var log = panel.querySelector(".ask-log");
  var starters = panel.querySelector(".ask-starters");
  var form = panel.querySelector(".ask-form");
  var input = panel.querySelector(".ask-input");
  var sendBtn = panel.querySelector(".ask-send");
  var busy = false;

  function line(role, text) {
    var p = document.createElement("p");
    p.className = "ask-msg is-" + role;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }

  // The follow-ups that matter after an answer: the form and the phone.
  function actions() {
    var old = log.querySelector(".ask-actions");
    if (old) old.remove();
    var box = document.createElement("p");
    box.className = "ask-actions";
    box.innerHTML =
      '<a href="' + up + 'services.html#contact">Get a free quote</a>' + '<a href="tel:+16047293212">Call or text Ryan</a>';
    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }

  line("ping", HELLO);
  turns.forEach(function (t) {
    line(t.role === "user" ? "you" : "ping", t.content);
  });
  if (turns.length) actions();

  STARTERS.forEach(function (q) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ask-starter";
    b.textContent = q;
    b.addEventListener("click", function () {
      ask(q);
    });
    starters.appendChild(b);
  });
  starters.hidden = turns.length > 0;

  // ==================== Asking ====================

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    panel.classList.toggle("is-busy", on);
  }

  function ask(text) {
    text = String(text || "")
      .trim()
      .slice(0, MAX);
    if (!text || busy) return;
    starters.hidden = true;
    input.value = "";
    line("you", text);
    turns.push({ role: "user", content: text });
    save();
    setBusy(true);
    var wait = line("ping", "");
    wait.classList.add("is-waiting");
    wait.setAttribute("aria-label", "Ping is thinking");
    wait.innerHTML = "<span></span><span></span><span></span>";
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
        line("ping", reply);
        turns.push({ role: "assistant", content: reply });
        save();
        actions();
        setBusy(false);
        document.dispatchEvent(new CustomEvent("ping:answered"));
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.focus();
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

  function isOpen() {
    return canPop ? panel.matches(":popover-open") : panel.open;
  }

  function open(from) {
    if (isOpen()) return;
    opener = from || document.activeElement;
    if (canPop) panel.showPopover();
    else panel.show();
    document.documentElement.classList.add("ask-open");
    log.scrollTop = log.scrollHeight;
    // On a phone the keyboard would cover half the panel straight away, so
    // the field is only focused where there is a real keyboard.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.focus();
    else panel.querySelector(".ask-close").focus({ preventScroll: true });
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

  // On a phone the on-screen keyboard covers the foot of the screen: lift
  // the panel by however much of the layout it hides.
  var vv = window.visualViewport;
  function fit() {
    if (!vv) return;
    var hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    panel.style.setProperty("--ask-kb", hidden > 80 ? hidden + "px" : "0px");
    panel.style.setProperty("--ask-vh", vv.height + "px");
  }
  if (vv) {
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
  }

  window.PingChat = { open: open, close: close, isOpen: isOpen, reduced: reduced };
})();
