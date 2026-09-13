/**
 * Palette switcher
 * ----------------
 * Six colour systems, each with a light and a dark variant. Switching writes a
 * single <style> block that redefines the colour tokens in tokens.css, so the
 * theme toggle and every component keep working untouched: they all read the
 * same variables either way.
 *
 * Every one of the twelve variants was checked against WCAG AA (4.5:1) for
 * body, muted, and subtle text, and for the accent on both grounds.
 */

(function () {
  "use strict";

  var STORAGE_KEY = "portfolio-palette";

  var PALETTES = [
    { id: "ocean", name: "Ocean",
      light: {accent:"#1450c8",accentStrong:"#0d3a96",accentSoft:"rgba(20, 80, 200, 0.1)",onAccent:"#ffffff",bg:"#fcfdfe",surface:"#f5f7fa",surface2:"#eaedf3",text:"#111822",muted:"#4a5464",subtle:"#5f6a7c",border:"rgba(17, 24, 34, 0.14)",borderStrong:"rgba(17, 24, 34, 0.3)"},
      dark:  {accent:"#7db1f5",accentStrong:"#a8cbfa",accentSoft:"rgba(125, 177, 245, 0.1)",onAccent:"#0b1019",bg:"#0c1015",surface:"#151921",surface2:"#1f242e",text:"#ebeff4",muted:"#a6b0bf",subtle:"#8893a5",border:"rgba(235, 239, 244, 0.14)",borderStrong:"rgba(235, 239, 244, 0.3)"} },
    { id: "violet", name: "Violet",
      light: {accent:"#6425d0",accentStrong:"#4c17a3",accentSoft:"rgba(100, 37, 208, 0.1)",onAccent:"#ffffff",bg:"#fdfcfe",surface:"#f7f5fa",surface2:"#eeeaf3",text:"#181122",muted:"#554a64",subtle:"#6c5f7c",border:"rgba(24, 17, 34, 0.14)",borderStrong:"rgba(24, 17, 34, 0.3)"},
      dark:  {accent:"#b98cf7",accentStrong:"#cfb0fb",accentSoft:"rgba(185, 140, 247, 0.1)",onAccent:"#110b19",bg:"#100c15",surface:"#1a1521",surface2:"#251f2e",text:"#efebf4",muted:"#b1a6bf",subtle:"#9488a5",border:"rgba(239, 235, 244, 0.14)",borderStrong:"rgba(239, 235, 244, 0.3)"} },
    { id: "emerald", name: "Emerald",
      light: {accent:"#03795a",accentStrong:"#025a43",accentSoft:"rgba(3, 121, 90, 0.1)",onAccent:"#ffffff",bg:"#fcfefd",surface:"#f5faf8",surface2:"#eaf3f0",text:"#11221d",muted:"#425952",subtle:"#577069",border:"rgba(17, 34, 29, 0.14)",borderStrong:"rgba(17, 34, 29, 0.3)"},
      dark:  {accent:"#3ad9a4",accentStrong:"#79ebc5",accentSoft:"rgba(58, 217, 164, 0.1)",onAccent:"#0b1915",bg:"#0c1512",surface:"#15211d",surface2:"#1f2e29",text:"#ebf4f1",muted:"#a6bfb7",subtle:"#88a59c",border:"rgba(235, 244, 241, 0.14)",borderStrong:"rgba(235, 244, 241, 0.3)"} },
    { id: "crimson", name: "Crimson",
      light: {accent:"#c00f42",accentStrong:"#960b33",accentSoft:"rgba(192, 15, 66, 0.1)",onAccent:"#ffffff",bg:"#fefcfc",surface:"#faf5f6",surface2:"#f3eaec",text:"#221115",muted:"#644a4f",subtle:"#7c5f65",border:"rgba(34, 17, 21, 0.14)",borderStrong:"rgba(34, 17, 21, 0.3)"},
      dark:  {accent:"#fb7d95",accentStrong:"#fdaab8",accentSoft:"rgba(251, 125, 149, 0.1)",onAccent:"#190b0e",bg:"#150c0e",surface:"#211517",surface2:"#2e1f22",text:"#f4ebed",muted:"#bfa6ab",subtle:"#a5888e",border:"rgba(244, 235, 237, 0.14)",borderStrong:"rgba(244, 235, 237, 0.3)"} },
    { id: "cyan", name: "Cyan",
      light: {accent:"#0a7490",accentStrong:"#07586d",accentSoft:"rgba(10, 116, 144, 0.1)",onAccent:"#ffffff",bg:"#fcfdfe",surface:"#f5f9fa",surface2:"#eaf1f3",text:"#111e22",muted:"#44585c",subtle:"#596e73",border:"rgba(17, 30, 34, 0.14)",borderStrong:"rgba(17, 30, 34, 0.3)"},
      dark:  {accent:"#3fd0ec",accentStrong:"#84e2f4",accentSoft:"rgba(63, 208, 236, 0.1)",onAccent:"#0b1619",bg:"#0c1315",surface:"#151e21",surface2:"#1f2b2e",text:"#ebf2f4",muted:"#a6babf",subtle:"#889fa5",border:"rgba(235, 242, 244, 0.14)",borderStrong:"rgba(235, 242, 244, 0.3)"} },
    { id: "magenta", name: "Magenta",
      light: {accent:"#a413b4",accentStrong:"#7e0e8b",accentSoft:"rgba(164, 19, 180, 0.1)",onAccent:"#ffffff",bg:"#fefcfe",surface:"#faf5fa",surface2:"#f3eaf2",text:"#221120",muted:"#644a62",subtle:"#7c5f7a",border:"rgba(34, 17, 32, 0.14)",borderStrong:"rgba(34, 17, 32, 0.3)"},
      dark:  {accent:"#ec7bf7",accentStrong:"#f4a9fb",accentSoft:"rgba(236, 123, 247, 0.1)",onAccent:"#190b18",bg:"#150c14",surface:"#211520",surface2:"#2e1f2d",text:"#f4ebf3",muted:"#bfa6bd",subtle:"#a588a3",border:"rgba(244, 235, 243, 0.14)",borderStrong:"rgba(244, 235, 243, 0.3)"} },
  ];

  // ---- token writing -------------------------------------------------

  function rule(selector, p) {
    return (
      selector + "{" +
      "--color-accent:" + p.accent + ";" +
      "--color-accent-strong:" + p.accentStrong + ";" +
      "--color-accent-soft:" + p.accentSoft + ";" +
      "--color-on-accent:" + p.onAccent + ";" +
      "--color-background:" + p.bg + ";" +
      "--color-surface:" + p.surface + ";" +
      "--color-surface-2:" + p.surface2 + ";" +
      "--color-text:" + p.text + ";" +
      "--color-text-muted:" + p.muted + ";" +
      "--color-text-subtle:" + p.subtle + ";" +
      "--color-border:" + p.border + ";" +
      "--color-border-strong:" + p.borderStrong + ";" +
      "}"
    );
  }

  function styleEl() {
    var el = document.getElementById("palette-tokens");
    if (!el) {
      el = document.createElement("style");
      el.id = "palette-tokens";
      document.head.appendChild(el);
    }
    return el;
  }

  function write(index) {
    var p = PALETTES[index];
    if (!p) return;
    // The selectors are doubled up on purpose. This <style> is not guaranteed to
    // sit after tokens.css in document order (it does not when the page is
    // embedded and the stylesheet links end up in the body), and at equal
    // specificity the later rule wins. Doubling :root outranks tokens.css
    // wherever the block lands, and the dark selector still outranks the light
    // one within this block.
    styleEl().textContent =
      rule(":root:root", p.light) + rule('html[data-theme="dark"]:root', p.dark);
    document.documentElement.setAttribute("data-palette", p.id);
  }

  function stored() {
    try {
      var id = localStorage.getItem(STORAGE_KEY);
      for (var i = 0; i < PALETTES.length; i++) {
        if (PALETTES[i].id === id) return i;
      }
    } catch (e) {}
    return 0;
  }

  var current = stored();

  // Paint before anything else renders, so a stored palette never flashes
  // the default Ocean tokens first.
  write(current);

  // ---- the dock ------------------------------------------------------

  function meta(name) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
    }
    m.content = name;
  }

  function build() {
    var dock = document.createElement("div");
    dock.className = "palette-dock";
    dock.id = "palette-dock";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "palette-trigger";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "palette-swatches");
    toggle.setAttribute("aria-label", "Change site colour");
    toggle.setAttribute("title", "Change site colour");
    toggle.innerHTML = '<span class="palette-trigger-dot" aria-hidden="true"></span>';

    var list = document.createElement("div");
    list.className = "palette-swatches";
    list.id = "palette-swatches";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", "Colour palettes");

    PALETTES.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "palette-swatch";
      b.dataset.index = String(i);
      b.style.setProperty("--sw-light", p.light.accent);
      b.style.setProperty("--sw-dark", p.dark.accent);
      b.style.setProperty("--sw-i", String(i));
      b.setAttribute("aria-pressed", String(i === current));
      b.setAttribute("aria-label", p.name);
      b.title = p.name;
      b.addEventListener("click", function () {
        current = i;
        write(current);
        sync();
        try {
          localStorage.setItem(STORAGE_KEY, p.id);
        } catch (e) {}
      });
      list.appendChild(b);
    });

    var sep = document.createElement("span");
    sep.className = "palette-sep";
    sep.setAttribute("aria-hidden", "true");

    // A two-state track: sun on one end, moon on the other, knob on the side
    // that is currently active. theme.js picks the click up by delegation.
    var mode = document.createElement("button");
    mode.type = "button";
    mode.id = "theme-toggle";
    mode.className = "theme-switch";
    mode.innerHTML =
      '<span class="theme-switch-knob" aria-hidden="true"></span>' +
      '<svg class="theme-switch-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="4.2"></circle>' +
      '<path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>' +
      "</svg>" +
      '<svg class="theme-switch-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' +
      "</svg>";

    dock.appendChild(toggle);
    dock.appendChild(list);
    dock.appendChild(sep);
    dock.appendChild(mode);
    document.body.appendChild(dock);

    // theme.js ran before this element existed, so give it its labels now.
    if (window.siteTheme) window.siteTheme.syncControl(window.siteTheme.current());

    var open = false;
    function setOpen(next) {
      open = next;
      dock.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    }
    toggle.addEventListener("click", function () {
      setOpen(!open);
    });
    document.addEventListener("click", function (e) {
      if (open && !dock.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        toggle.focus();
      }
    });

    function sync() {
      [].forEach.call(list.children, function (b, i) {
        b.setAttribute("aria-pressed", String(i === current));
      });
      var isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      var p = PALETTES[current];
      meta(isDark ? p.dark.bg : p.light.bg);
    }

    sync();

    // Keep the browser chrome colour in step with the theme toggle too.
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }

  window.sitePalette = {
    list: PALETTES,
    current: function () {
      return PALETTES[current];
    },
  };
})();
