/**
 * Theme: light/dark with system preference
 * ----------------------------------------
 * Starts from the system setting, allows a manual override, and persists it.
 *
 * The toggle button sits in the nav. This script runs before the nav is
 * parsed, so it listens on the document instead of binding to the button,
 * and exposes window.siteTheme; the control can move anywhere in the markup
 * without touching this file.
 */

(function () {
  "use strict";

  var STORAGE_KEY = "portfolio-theme-override";

  function systemTheme() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || systemTheme();
  }

  function updateToggleA11y(theme) {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    var isDark = theme === "dark";
    var label = isDark ? "Switch to light theme" : "Switch to dark theme";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  }

  // The browser chrome (the address bar on a phone) matches the page.
  function syncChrome(theme) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement("meta");
      m.name = "theme-color";
      document.head.appendChild(m);
    }
    m.content = theme === "dark" ? "#0a0a0b" : "#fafafa";
  }

  function applyTheme(theme, options) {
    document.documentElement.setAttribute("data-theme", theme);
    updateToggleA11y(theme);
    syncChrome(theme);

    if (options && options.persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {}
    }
  }

  function toggleTheme() {
    applyTheme(current() === "dark" ? "light" : "dark", { persist: true });
  }

  var storedTheme = null;
  try {
    storedTheme = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  applyTheme(storedTheme || systemTheme(), { persist: Boolean(storedTheme) });

  // Delegated, so the button can be rendered at any point after this runs.
  document.addEventListener("click", function (e) {
    var hit = e.target.closest && e.target.closest("#theme-toggle");
    if (hit) toggleTheme();
  });

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function (e) {
        var override = null;
        try {
          override = localStorage.getItem(STORAGE_KEY);
        } catch (err) {}
        if (!override) applyTheme(e.matches ? "dark" : "light");
      });
  }

  // The button is parsed after this script runs; label it once it exists.
  document.addEventListener("DOMContentLoaded", function () {
    updateToggleA11y(current());
  });

  window.siteTheme = {
    toggle: toggleTheme,
    apply: applyTheme,
    current: current,
    syncControl: updateToggleA11y,
  };
})();
