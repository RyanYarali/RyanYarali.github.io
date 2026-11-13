/**
 * Check my website (check.html)
 * -----------------------------
 * Sends the address to the site's own Worker (worker/check.js) and writes
 * the report into the page: how many checks passed, drawn as a row of pixel
 * blocks, then each check in plain words under Speed, On Google and On
 * phones, with what to do about the ones that failed. When the Worker has a
 * key for it, Google's own phone test follows about 20 seconds later.
 *
 * "Get a free quote" carries the result to the contact form
 * (sessionStorage; form.js writes it into the message).
 */

(function () {
  "use strict";

  var form = document.getElementById("check-form");
  var result = document.getElementById("check-result");
  var out = document.getElementById("check-out");
  if (!form || !result || !out) return;

  var input = document.getElementById("check-url");
  var status = document.getElementById("check-status");
  var button = form.querySelector(".check-go");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var GROUPS = [
    ["speed", "Speed"],
    ["google", "On Google"],
    ["phones", "On phones"],
  ];
  var FAIL = "I couldn't run the check just now. Check your connection and try again.";
  var busy = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function post(path, url) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
    }).then(function (res) {
      return res.json();
    });
  }

  function say(text, bad) {
    status.textContent = text;
    status.classList.toggle("is-bad", Boolean(bad));
  }

  function verdict(r) {
    var share = r.passed / r.total;
    if (share >= 0.9) return "This site is in good shape. Whoever built it knew what they were doing.";
    if (share >= 0.7) return "A decent site, with a few things holding it back.";
    if (share >= 0.5) return "This site works, but it is making things harder for visitors than it should.";
    return "This site has real problems, and they are likely costing it visitors.";
  }

  // ==================== The report ====================

  function render(r) {
    out.textContent = "";

    var sum = el("div", "check-sum");
    sum.appendChild(el("p", "check-host", r.host));
    var score = el("h2", "check-score");
    score.id = "check-score";
    score.tabIndex = -1;
    score.appendChild(el("span", "check-num", String(r.passed)));
    score.appendChild(document.createTextNode(" of " + r.total + " checks passed"));
    sum.appendChild(score);

    // One block a check, in the order they are listed below.
    var bar = el("div", "check-bar");
    bar.setAttribute("aria-hidden", "true");
    r.checks.forEach(function (c, i) {
      var b = el("span", c.ok ? "is-ok" : "");
      b.style.setProperty("--i", i);
      bar.appendChild(b);
    });
    sum.appendChild(bar);
    sum.appendChild(el("p", "check-verdict", verdict(r)));
    out.appendChild(sum);

    // Google's test fills this in when it comes back.
    var lab = el("div", "check-lab");
    lab.hidden = true;
    out.appendChild(lab);

    var groups = el("div", "check-groups");
    GROUPS.forEach(function (g) {
      var mine = r.checks.filter(function (c) {
        return c.group === g[0];
      });
      if (!mine.length) return;
      var box = el("section", "check-group");
      var head = el("h3", "check-group-title", g[1]);
      var ok = mine.filter(function (c) {
        return c.ok;
      }).length;
      head.appendChild(el("span", "check-count", ok + " of " + mine.length));
      box.appendChild(head);
      var list = el("ul", "check-list");
      // What needs work first.
      mine
        .slice()
        .sort(function (a, b) {
          return a.ok - b.ok;
        })
        .forEach(function (c) {
          var li = el("li", c.ok ? "is-ok" : "is-bad");
          var mark = el("span", "check-mark");
          mark.setAttribute("aria-hidden", "true");
          li.appendChild(mark);
          var body = el("div", "check-item");
          body.appendChild(el("p", "check-text", (c.ok ? "" : "Needs work: ") + c.text));
          if (c.fix) body.appendChild(el("p", "check-fix", c.fix));
          li.appendChild(body);
          list.appendChild(li);
        });
      box.appendChild(list);
      groups.appendChild(box);
    });
    out.appendChild(groups);

    // What next.
    var failed = r.checks.filter(function (c) {
      return !c.ok;
    });
    var cta = el("div", "quote-cta check-cta");
    var copy = el("div");
    copy.appendChild(el("h3", "care-name", failed.length ? "Want these fixed?" : "Want a second pair of eyes?"));
    copy.appendChild(
      el(
        "p",
        "care-text",
        failed.length
          ? "I'll look at " + r.host + " myself and send you a fixed quote. Free, with no obligation."
          : r.host + " passed everything here. If you'd still like a proper review or a refresh, I'm happy to look.",
      ),
    );
    cta.appendChild(copy);
    var go = el("a", "btn btn-primary plan-cta", "Get a free quote");
    go.href = "services.html#contact";
    go.addEventListener("click", function () {
      try {
        sessionStorage.setItem(
          "site-check",
          JSON.stringify({
            host: r.host,
            passed: r.passed,
            total: r.total,
            failed: failed.slice(0, 6).map(function (c) {
              return c.text;
            }),
          }),
        );
      } catch (e) {}
    });
    cta.appendChild(go);
    out.appendChild(cta);

    var again = el("button", "check-again", "Check another site");
    again.type = "button";
    again.addEventListener("click", function () {
      input.value = "";
      input.focus();
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
    out.appendChild(again);

    result.hidden = false;
    result.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    score.focus({ preventScroll: true });
    return lab;
  }

  // ==================== Google's phone test ====================

  function word(n) {
    return n >= 90 ? "Good" : n >= 50 ? "Needs work" : "Poor";
  }

  function runLab(lab, url) {
    lab.hidden = false;
    lab.classList.add("is-waiting");
    lab.appendChild(el("p", "check-lab-title", "Google's own phone test"));
    var wait = el("p", "check-lab-wait", "Running now. This one takes about 20 seconds.");
    lab.appendChild(wait);
    var dots = el("div", "check-lab-dots");
    dots.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 12; i++) dots.appendChild(el("span"));
    lab.appendChild(dots);

    post("/api/check/lab", url)
      .catch(function () {
        return null;
      })
      .then(function (g) {
        lab.classList.remove("is-waiting");
        if (!g || !g.ok || g.speed == null) {
          lab.hidden = true;
          return;
        }
        wait.remove();
        dots.remove();
        var row = el("dl", "check-lab-row");
        [
          ["Speed", g.speed],
          ["Search", g.search],
          ["Accessibility", g.access],
        ].forEach(function (pair) {
          if (pair[1] == null) return;
          var cell = el("div", "check-lab-cell" + (pair[1] < 50 ? " is-poor" : ""));
          cell.appendChild(el("dt", null, pair[0]));
          var dd = el("dd");
          dd.appendChild(el("span", "check-lab-num", String(pair[1])));
          dd.appendChild(el("span", "check-lab-word", word(pair[1])));
          cell.appendChild(dd);
          row.appendChild(cell);
        });
        lab.appendChild(row);
        lab.appendChild(
          el(
            "p",
            "check-lab-note",
            "Scores out of 100, measured by Google on a mid-range phone with a slow connection." +
              (g.paint ? " The main content showed after " + g.paint.replace(/ /g, " ") + "." : ""),
          ),
        );
      });
  }

  // ==================== Running it ====================

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var url = input.value.trim();
    if (!url) {
      say("Type your website's address first, like yourbusiness.ca.", true);
      input.focus();
      return;
    }
    busy = true;
    button.disabled = true;
    form.classList.add("is-busy");
    say("Loading your page the way a phone would…");
    document.dispatchEvent(new CustomEvent("ping:asked"));

    post("/api/check", url)
      .catch(function () {
        return null;
      })
      .then(function (r) {
        busy = false;
        button.disabled = false;
        form.classList.remove("is-busy");
        document.dispatchEvent(new CustomEvent("ping:answered"));
        if (!r || !r.ok) {
          say((r && r.message) || FAIL, true);
          return;
        }
        say("Done. Your report is below.");
        var lab = render(r);
        if (r.lab) runLab(lab, r.url);
      });
  });

  // Arriving with an address already typed (the box on the home page):
  // run it straight away. The address is taken out of the page's own
  // address, so a reload doesn't run the check again.
  var given = new URLSearchParams(location.search).get("url");
  if (given) {
    input.value = given.trim().slice(0, 300);
    try {
      history.replaceState(null, "", location.pathname);
    } catch (e) {}
    setTimeout(function () {
      form.requestSubmit ? form.requestSubmit() : button.click();
    }, 400);
  }
})();
